type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleAccounts = {
  oauth2: {
    initTokenClient: (config: {
      client_id: string;
      scope: string;
      callback: (response: GoogleTokenResponse) => void;
      error_callback?: (error: unknown) => void;
    }) => GoogleTokenClient;
    revoke: (token: string, done?: () => void) => void;
  };
};

declare global {
  interface Window {
    google?: { accounts: GoogleAccounts };
  }
}

export interface GmailConnection {
  accessToken: string;
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

let googleScriptPromise: Promise<void> | null = null;

function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]',
    );
    if (existing) {
      const startedAt = Date.now();
      const timer = window.setInterval(() => {
        if (window.google?.accounts.oauth2) {
          window.clearInterval(timer);
          resolve();
        } else if (Date.now() - startedAt > 10_000) {
          window.clearInterval(timer);
          reject(new Error("Não foi possível carregar o login do Google."));
        }
      }, 100);
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Não foi possível carregar o login do Google."));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export async function connectGmail({
  clientId,
  expectedEmail,
}: {
  clientId: string;
  expectedEmail: string;
}): Promise<GmailConnection> {
  if (!clientId.trim()) {
    throw new Error("Configure VITE_GOOGLE_GMAIL_CLIENT_ID antes de conectar o Gmail.");
  }

  await loadGoogleIdentityServices();
  const oauth2 = window.google?.accounts.oauth2;
  if (!oauth2) throw new Error("O serviço de autorização do Google não ficou disponível.");

  const token = await new Promise<GoogleTokenResponse>((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: clientId,
      scope: "openid email https://www.googleapis.com/auth/gmail.send",
      callback: resolve,
      error_callback: reject,
    });
    client.requestAccessToken({ prompt: "consent" });
  });

  if (!token.access_token) {
    throw new Error(token.error_description || token.error || "O Google não autorizou o envio de e-mails.");
  }

  const profileResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok) {
    oauth2.revoke(token.access_token);
    throw new Error("Não foi possível confirmar qual conta Google foi conectada.");
  }

  const profile = (await profileResponse.json()) as { email?: string };
  const connectedEmail = profile.email?.trim().toLowerCase();
  const authenticatedEmail = expectedEmail.trim().toLowerCase();

  if (!connectedEmail) {
    oauth2.revoke(token.access_token);
    throw new Error("A conta Google conectada não informou um endereço de e-mail.");
  }
  if (connectedEmail !== authenticatedEmail) {
    oauth2.revoke(token.access_token);
    throw new Error(
      `Conecte o mesmo e-mail usado no sistema (${authenticatedEmail}). A conta escolhida foi ${connectedEmail}.`,
    );
  }

  return {
    accessToken: token.access_token,
    email: connectedEmail,
    expiresAt: Date.now() + Math.max(60, token.expires_in ?? 3600) * 1000,
  };
}

export function isGmailConnectionValid(connection: GmailConnection | null): connection is GmailConnection {
  return Boolean(connection && connection.expiresAt > Date.now() + 60_000);
}

export function disconnectGmail(connection: GmailConnection | null): void {
  if (!connection?.accessToken || !window.google?.accounts.oauth2) return;
  window.google.accounts.oauth2.revoke(connection.accessToken);
}

export async function sendPdfWithGmail(
  connection: GmailConnection,
  message: GmailPdfMessage,
): Promise<void> {
  if (!isGmailConnectionValid(connection)) {
    throw new Error("A autorização do Gmail expirou. Conecte a conta novamente.");
  }

  const filename = sanitizeFilename(message.filename ?? "devolutiva.pdf");
  const attachmentBytes = new Uint8Array(await message.pdf.arrayBuffer());
  const boundary = `feedback_${crypto.randomUUID().replaceAll("-", "")}`;
  const subject = encodeMimeHeader(message.subject);
  const bodyBase64 = bytesToBase64(new TextEncoder().encode(message.text));
  const attachmentBase64 = wrapBase64(bytesToBase64(attachmentBytes));

  const mime = [
    `From: ${connection.email}`,
    `To: ${message.to}`,
    `Subject: ${subject}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(bodyBase64),
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${filename}"`,
    "",
    attachmentBase64,
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: toBase64Url(bytesToBase64(new TextEncoder().encode(mime))) }),
  });

  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { error?: { message?: string } };
      detail = payload.error?.message ?? "";
    } catch {
      detail = await response.text();
    }
    throw new Error(detail || `O Gmail recusou o envio (${response.status}).`);
  }
}

function encodeMimeHeader(value: string): string {
  return `=?UTF-8?B?${bytesToBase64(new TextEncoder().encode(value))}?=`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function wrapBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function toBase64Url(value: string): string {
  return value.replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function sanitizeFilename(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "devolutiva.pdf";
}
