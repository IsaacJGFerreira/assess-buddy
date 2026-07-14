import {
  authenticatedUser,
  base64ToBytes,
  corsHeaders,
  decryptRefreshToken,
  encodeMimeHeader,
  googleClientId,
  googleClientSecret,
  json,
  sanitizeFilename,
  serviceClient,
  textToBase64,
  toBase64Url,
  wrapBase64,
} from "../_shared/gmail.ts";

type SendBody = {
  to?: string;
  subject?: string;
  text?: string;
  pdfBase64?: string;
  filename?: string;
};

type TokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const user = await authenticatedUser(request);
    const userEmail = user.email?.trim().toLowerCase();
    if (!userEmail) return json({ error: "A conta do professor não possui um e-mail válido." }, 400);

    const body = await request.json().catch(() => ({})) as SendBody;
    const to = body.to?.trim().toLowerCase() ?? "";
    const subject = body.subject?.trim() ?? "";
    const text = body.text ?? "";
    const pdfBase64 = body.pdfBase64?.trim() ?? "";
    if (!isEmail(to)) return json({ error: "O e-mail do aluno é inválido." }, 400);
    if (!subject) return json({ error: "O assunto do e-mail não foi informado." }, 400);
    if (!pdfBase64) return json({ error: "O PDF da devolutiva não foi informado." }, 400);
    if (pdfBase64.length > 16_000_000) return json({ error: "O PDF é grande demais para envio." }, 413);

    const database = serviceClient();
    const { data: connection, error: connectionError } = await database
      .from("gmail_connections")
      .select("google_email,refresh_token_ciphertext,refresh_token_iv")
      .eq("user_id", user.id)
      .maybeSingle();

    if (connectionError) throw connectionError;
    if (!connection) {
      return json(
        { error: "O Gmail do professor ainda não foi autorizado.", code: "gmail_authorization_required" },
        409,
      );
    }
    if (connection.google_email?.trim().toLowerCase() !== userEmail) {
      await database.from("gmail_connections").delete().eq("user_id", user.id);
      return json(
        { error: "A conta Google autorizada não corresponde ao professor conectado.", code: "gmail_authorization_required" },
        409,
      );
    }

    const refreshToken = await decryptRefreshToken(
      connection.refresh_token_ciphertext,
      connection.refresh_token_iv,
    );
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: googleClientId(),
        client_secret: googleClientSecret(),
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    const tokens = await tokenResponse.json() as TokenResponse;

    if (!tokenResponse.ok || !tokens.access_token) {
      console.error("gmail refresh", tokens.error, tokens.error_description);
      if (tokens.error === "invalid_grant") {
        await database.from("gmail_connections").delete().eq("user_id", user.id);
        return json(
          { error: "A autorização do Gmail precisa ser renovada.", code: "gmail_authorization_required" },
          409,
        );
      }
      return json({ error: "O Google não renovou a autorização de envio." }, 502);
    }

    const filename = sanitizeFilename(body.filename ?? "devolutiva.pdf");
    let attachmentBytes: Uint8Array;
    try {
      attachmentBytes = base64ToBytes(pdfBase64);
    } catch {
      return json({ error: "O PDF recebido está inválido." }, 400);
    }

    const boundary = `feedback_${crypto.randomUUID().replaceAll("-", "")}`;
    const mime = [
      `From: ${connection.google_email}`,
      `To: ${to}`,
      `Subject: ${encodeMimeHeader(subject)}`,
      "MIME-Version: 1.0",
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(textToBase64(text)),
      `--${boundary}`,
      `Content-Type: application/pdf; name="${filename}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${filename}"`,
      "",
      wrapBase64(pdfBase64),
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const gmailResponse = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ raw: toBase64Url(new TextEncoder().encode(mime)) }),
    });

    if (!gmailResponse.ok) {
      const payload = await gmailResponse.json().catch(() => ({})) as { error?: { message?: string } };
      const detail = payload.error?.message ?? `O Gmail recusou o envio (${gmailResponse.status}).`;
      if (gmailResponse.status === 401 || gmailResponse.status === 403) {
        return json({ error: detail, code: "gmail_authorization_required" }, 409);
      }
      return json({ error: detail }, 502);
    }

    const result = await gmailResponse.json().catch(() => ({}));
    return json({ sent: true, messageId: (result as { id?: string }).id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "AUTH_REQUIRED") return json({ error: "Sua sessão expirou.", code: "auth_required" }, 401);
    console.error("gmail-send", error);
    return json({ error: "Não foi possível enviar a devolutiva pelo Gmail." }, 500);
  }
});

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
