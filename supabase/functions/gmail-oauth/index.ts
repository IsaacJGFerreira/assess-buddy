import {
  addQuery,
  authenticatedUser,
  corsHeaders,
  encryptRefreshToken,
  gmailCallbackUrl,
  googleClientId,
  googleClientSecret,
  hashState,
  json,
  randomState,
  serviceClient,
  validateReturnUrl,
} from "../_shared/gmail.ts";

type OAuthStateRow = {
  state_hash: string;
  user_id: string;
  expected_email: string;
  return_url: string;
  expires_at: string;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  scope?: string;
  error?: string;
  error_description?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (request.method === "POST") return await startAuthorization(request);
    if (request.method === "GET") return await finishAuthorization(request);
    return json({ error: "Método não permitido." }, 405);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "AUTH_REQUIRED") return json({ error: "Sua sessão expirou.", code: "auth_required" }, 401);
    console.error("gmail-oauth", error);
    return json({ error: "Não foi possível configurar o Gmail do professor." }, 500);
  }
});

async function startAuthorization(request: Request): Promise<Response> {
  const user = await authenticatedUser(request);
  const expectedEmail = user.email?.trim().toLowerCase();
  if (!expectedEmail) return json({ error: "A conta do professor não possui um e-mail válido." }, 400);

  const body = await request.json().catch(() => ({})) as { returnUrl?: string; force?: boolean };
  const returnUrl = validateReturnUrl(body.returnUrl);
  const database = serviceClient();

  if (!body.force) {
    const { data: existing } = await database
      .from("gmail_connections")
      .select("google_email")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing?.google_email?.trim().toLowerCase() === expectedEmail) {
      return json({ connected: true, email: expectedEmail });
    }
  }

  const state = randomState();
  const stateHash = await hashState(state);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

  await database.from("gmail_oauth_states").delete().lt("expires_at", new Date().toISOString());
  await database.from("gmail_oauth_states").delete().eq("user_id", user.id);
  const { error: stateError } = await database.from("gmail_oauth_states").insert({
    state_hash: stateHash,
    user_id: user.id,
    expected_email: expectedEmail,
    return_url: returnUrl,
    expires_at: expiresAt,
  });
  if (stateError) throw stateError;

  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.searchParams.set("client_id", googleClientId());
  authorizationUrl.searchParams.set("redirect_uri", gmailCallbackUrl());
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "openid email https://www.googleapis.com/auth/gmail.send");
  authorizationUrl.searchParams.set("access_type", "offline");
  authorizationUrl.searchParams.set("prompt", "consent");
  authorizationUrl.searchParams.set("include_granted_scopes", "true");
  authorizationUrl.searchParams.set("login_hint", expectedEmail);
  authorizationUrl.searchParams.set("state", state);

  return json({ connected: false, authorizationUrl: authorizationUrl.toString() });
}

async function finishAuthorization(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const rawState = url.searchParams.get("state") ?? "";
  if (!rawState) return new Response("Estado OAuth ausente.", { status: 400 });

  const database = serviceClient();
  const stateHash = await hashState(rawState);
  const { data: state, error: stateError } = await database
    .from("gmail_oauth_states")
    .select("state_hash,user_id,expected_email,return_url,expires_at")
    .eq("state_hash", stateHash)
    .maybeSingle<OAuthStateRow>();

  if (stateError || !state) return new Response("Autorização inválida ou expirada.", { status: 400 });
  await database.from("gmail_oauth_states").delete().eq("state_hash", stateHash);

  if (new Date(state.expires_at).getTime() < Date.now()) {
    return Response.redirect(addQuery(state.return_url, { gmail: "error", gmail_reason: "expired" }), 302);
  }

  const providerError = url.searchParams.get("error");
  if (providerError) {
    return Response.redirect(addQuery(state.return_url, { gmail: "error", gmail_reason: providerError }), 302);
  }

  const code = url.searchParams.get("code");
  if (!code) {
    return Response.redirect(addQuery(state.return_url, { gmail: "error", gmail_reason: "missing_code" }), 302);
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: googleClientId(),
      client_secret: googleClientSecret(),
      code,
      grant_type: "authorization_code",
      redirect_uri: gmailCallbackUrl(),
    }),
  });
  const tokens = await tokenResponse.json() as TokenResponse;
  if (!tokenResponse.ok || !tokens.access_token) {
    console.error("gmail oauth token exchange", tokens.error, tokens.error_description);
    return Response.redirect(addQuery(state.return_url, { gmail: "error", gmail_reason: "token_exchange" }), 302);
  }

  const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const profile = await profileResponse.json().catch(() => ({})) as { email?: string; email_verified?: boolean };
  const connectedEmail = profile.email?.trim().toLowerCase();
  if (!profileResponse.ok || !connectedEmail || profile.email_verified === false) {
    return Response.redirect(addQuery(state.return_url, { gmail: "error", gmail_reason: "email_unavailable" }), 302);
  }
  if (connectedEmail !== state.expected_email.trim().toLowerCase()) {
    return Response.redirect(addQuery(state.return_url, { gmail: "error", gmail_reason: "email_mismatch" }), 302);
  }

  const { data: current } = await database
    .from("gmail_connections")
    .select("refresh_token_ciphertext,refresh_token_iv")
    .eq("user_id", state.user_id)
    .maybeSingle();

  let encrypted: { ciphertext: string; iv: string } | null = null;
  if (tokens.refresh_token) encrypted = await encryptRefreshToken(tokens.refresh_token);
  if (!encrypted && !current?.refresh_token_ciphertext) {
    return Response.redirect(addQuery(state.return_url, { gmail: "error", gmail_reason: "missing_refresh_token" }), 302);
  }

  const { error: saveError } = await database.from("gmail_connections").upsert({
    user_id: state.user_id,
    google_email: connectedEmail,
    refresh_token_ciphertext: encrypted?.ciphertext ?? current.refresh_token_ciphertext,
    refresh_token_iv: encrypted?.iv ?? current.refresh_token_iv,
    scopes: tokens.scope ?? "openid email https://www.googleapis.com/auth/gmail.send",
    updated_at: new Date().toISOString(),
  });
  if (saveError) throw saveError;

  return Response.redirect(addQuery(state.return_url, { gmail: "connected" }), 302);
}
