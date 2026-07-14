import { supabase } from "@/integrations/supabase/client";

export interface GmailConnection {
  accessToken: "server";
  email: string;
  expiresAt: number;
}

export interface GmailPdfMessage {
  to: string;
  subject: string;
  text: string;
  pdf: Blob;
  filename?: string;
}

type OAuthStartResponse = {
  connected?: boolean;
  email?: string;
  authorizationUrl?: string;
  error?: string;
  code?: string;
};

type FunctionErrorPayload = {
  error?: string;
  code?: string;
};

export const GMAIL_SETUP_AFTER_GOOGLE_LOGIN_KEY = "folha.gmail.setup-after-google-login";

export function markGmailSetupAfterGoogleLogin(): void {
  if (typeof window !== "undefined") sessionStorage.setItem(GMAIL_SETUP_AFTER_GOOGLE_LOGIN_KEY, "1");
}

export function clearGmailSetupAfterGoogleLogin(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(GMAIL_SETUP_AFTER_GOOGLE_LOGIN_KEY);
}

export function shouldSetupGmailAfterGoogleLogin(): boolean {
  return typeof window !== "undefined" && sessionStorage.getItem(GMAIL_SETUP_AFTER_GOOGLE_LOGIN_KEY) === "1";
}

export async function connectGmail({
  expectedEmail,
  force = false,
  returnUrl,
}: {
  clientId?: string;
  expectedEmail: string;
  force?: boolean;
  returnUrl?: string;
}): Promise<GmailConnection> {
  const payload = await callFunction<OAuthStartResponse>("gmail-oauth", {
    returnUrl: returnUrl ?? window.location.href,
    force,
  });

  if (payload.connected && payload.email) {
    const connectedEmail = payload.email.trim().toLowerCase();
    const authenticatedEmail = expectedEmail.trim().toLowerCase();
    if (connectedEmail !== authenticatedEmail) {
      throw new Error(
        `O Gmail autorizado (${connectedEmail}) não corresponde ao e-mail do professor (${authenticatedEmail}).`,
      );
    }
    return { accessToken: "server", email: connectedEmail, expiresAt: Number.MAX_SAFE_INTEGER };
  }

  if (payload.authorizationUrl) {
    window.location.assign(payload.authorizationUrl);
    return new Promise<GmailConnection>(() => undefined);
  }

  throw new Error(payload.error || "Não foi possível autorizar o Gmail do professor.");
}

export function isGmailConnectionValid(connection: GmailConnection | null): connection is GmailConnection {
  return Boolean(connection?.email && connection.expiresAt > Date.now());
}

export function disconnectGmail(_connection: GmailConnection | null): void {
  // A autorização persistente é administrada no backend e na Conta Google do professor.
}

export async function sendPdfWithGmail(
  connection: GmailConnection,
  message: GmailPdfMessage,
): Promise<void> {
  if (!isGmailConnectionValid(connection)) {
    throw new Error("O Gmail do professor ainda não está pronto para envio.");
  }

  const attachmentBytes = new Uint8Array(await message.pdf.arrayBuffer());
  const response = await callFunction<FunctionErrorPayload & { sent?: boolean }>("gmail-send", {
    to: message.to,
    subject: message.subject,
    text: message.text,
    pdfBase64: bytesToBase64(attachmentBytes),
    filename: message.filename ?? "devolutiva.pdf",
  }, false);

  if (response.code === "gmail_authorization_required") {
    markGmailSetupAfterGoogleLogin();
    await connectGmail({
      expectedEmail: connection.email,
      force: true,
      returnUrl: window.location.href,
    });
    return;
  }

  if (!response.sent) {
    throw new Error(response.error || "O Gmail não confirmou o envio da devolutiva.");
  }
}

async function callFunction<T>(
  name: string,
  body: Record<string, unknown>,
  throwOnHttpError = true,
): Promise<T> {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) throw new Error("Sua sessão expirou. Entre novamente.");

  const supabaseUrl =
    (import.meta.env as { VITE_SUPABASE_URL?: string }).VITE_SUPABASE_URL ??
    (typeof process !== "undefined" ? process.env.SUPABASE_URL : undefined);
  const publishableKey =
    (import.meta.env as { VITE_SUPABASE_PUBLISHABLE_KEY?: string }).VITE_SUPABASE_PUBLISHABLE_KEY ??
    (typeof process !== "undefined" ? process.env.SUPABASE_PUBLISHABLE_KEY : undefined);
  if (!supabaseUrl || !publishableKey) throw new Error("A conexão com o backend não está configurada.");

  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${sessionData.session.access_token}`,
      apikey: publishableKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({})) as T & FunctionErrorPayload;
  if (!response.ok && throwOnHttpError) {
    throw new Error(payload.error || `A função ${name} falhou (${response.status}).`);
  }
  return payload as T;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}
