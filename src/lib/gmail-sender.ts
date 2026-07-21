import { Capacitor } from "@capacitor/core";
import {
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  type UserCredential,
} from "firebase/auth";

import { authErrorMessage, getCurrentUser } from "@/integrations/firebase/auth";
import { emailFromOpenIdToken } from "@/lib/mobile-native-runtime";

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

const GMAIL_CONNECTION_KEY = "folha.gmail.firebase-connection";
const GMAIL_SEND_SCOPE = "https://www.googleapis.com/auth/gmail.send";
const TOKEN_LIFETIME_MS = 50 * 60 * 1000;

export async function connectGmail({
  expectedEmail,
  force = false,
}: {
  clientId?: string;
  expectedEmail: string;
  force?: boolean;
  returnUrl?: string;
}): Promise<GmailConnection> {
  const authenticatedEmail = normalizeEmail(expectedEmail);
  const cached = readGmailConnection();

  if (!force && isGmailConnectionValid(cached) && cached.email === authenticatedEmail) {
    return cached;
  }

  const user = getCurrentUser();
  if (!user) throw new Error("Sua sessão do Firebase expirou. Entre novamente.");

  if (Capacitor.isNativePlatform()) {
    return connectNativeGmail(user, authenticatedEmail);
  }

  const provider = new GoogleAuthProvider();
  provider.addScope("openid");
  provider.addScope("email");
  provider.addScope(GMAIL_SEND_SCOPE);
  provider.setCustomParameters({
    prompt: "consent",
    login_hint: authenticatedEmail,
  });

  let result: UserCredential;

  try {
    result = user.providerData.some((item) => item.providerId === GoogleAuthProvider.PROVIDER_ID)
      ? await reauthenticateWithPopup(user, provider)
      : await linkWithPopup(user, provider);
  } catch (error) {
    const code = readErrorCode(error);

    if (code === "auth/provider-already-linked") {
      result = await reauthenticateWithPopup(user, provider);
    } else if (
      code === "auth/credential-already-in-use" ||
      code === "auth/email-already-in-use" ||
      code === "auth/account-exists-with-different-credential"
    ) {
      throw new Error(
        "Este Google já está associado a outra conta Firebase. Saia e entre diretamente com Google para autorizar o Gmail.",
      );
    } else {
      throw error;
    }
  }

  const googleCredential = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = googleCredential?.accessToken;
  const connectedEmail = normalizeEmail(result.user.email ?? "");

  if (!accessToken) {
    throw new Error("O Google não forneceu a autorização de envio do Gmail.");
  }

  if (connectedEmail !== authenticatedEmail) {
    throw new Error(
      `O Gmail autorizado (${connectedEmail}) não corresponde ao e-mail do professor (${authenticatedEmail}).`,
    );
  }

  const connection: GmailConnection = {
    accessToken,
    email: connectedEmail,
    expiresAt: Date.now() + TOKEN_LIFETIME_MS,
  };

  saveGmailConnection(connection);
  return connection;
}

async function connectNativeGmail(
  user: NonNullable<ReturnType<typeof getCurrentUser>>,
  authenticatedEmail: string,
): Promise<GmailConnection> {
  const { FirebaseAuthentication } = await import("@capacitor-firebase/authentication");
  const nativeResult = await FirebaseAuthentication.signInWithGoogle({
    // O fluxo de autorização Gmail precisa devolver um access token para o escopo solicitado.
    useCredentialManager: false,
    skipNativeAuth: true,
    scopes: ["openid", "email", "profile", GMAIL_SEND_SCOPE],
  }).catch((error: unknown) => {
    throw new Error(authErrorMessage(error));
  });
  const idToken = nativeResult.credential?.idToken;
  const accessToken = nativeResult.credential?.accessToken;

  if (!idToken || !accessToken) {
    throw new Error(
      "O Google não forneceu as credenciais necessárias para autorizar o Gmail no Android.",
    );
  }
  const connectedEmail = normalizeEmail(emailFromOpenIdToken(idToken) ?? "");
  if (connectedEmail !== authenticatedEmail) {
    throw new Error(
      `O Gmail autorizado (${connectedEmail}) não corresponde ao e-mail do professor (${authenticatedEmail}).`,
    );
  }

  const credential = GoogleAuthProvider.credential(idToken, accessToken);

  try {
    if (user.providerData.some((item) => item.providerId === GoogleAuthProvider.PROVIDER_ID)) {
      await reauthenticateWithCredential(user, credential);
    } else {
      await linkWithCredential(user, credential);
    }
  } catch (error) {
    const code = readErrorCode(error);
    if (code === "auth/provider-already-linked") {
      await reauthenticateWithCredential(user, credential);
    } else if (
      code === "auth/credential-already-in-use" ||
      code === "auth/email-already-in-use" ||
      code === "auth/account-exists-with-different-credential"
    ) {
      throw new Error(
        "Este Google já está associado a outra conta Firebase. Saia e entre diretamente com Google para autorizar o Gmail.",
      );
    } else {
      throw error;
    }
  }

  const connection: GmailConnection = {
    accessToken,
    email: connectedEmail,
    expiresAt: Date.now() + TOKEN_LIFETIME_MS,
  };
  saveGmailConnection(connection);
  return connection;
}

export function getSavedGmailConnection(): GmailConnection | null {
  return readGmailConnection();
}

export function isGmailConnectionValid(
  connection: GmailConnection | null,
): connection is GmailConnection {
  return Boolean(
    connection?.accessToken && connection.email && connection.expiresAt > Date.now() + 30_000,
  );
}

export function disconnectGmail(_connection: GmailConnection | null = null): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(GMAIL_CONNECTION_KEY);
  }
}

export async function sendPdfWithGmail(
  connection: GmailConnection,
  message: GmailPdfMessage,
): Promise<void> {
  if (!isGmailConnectionValid(connection)) {
    throw new Error("A autorização do Gmail expirou. Autorize novamente antes de enviar.");
  }

  const to = normalizeEmail(message.to);
  const subject = message.subject.trim();

  if (!subject) throw new Error("O assunto do e-mail não foi informado.");
  if (!message.pdf.size) throw new Error("O PDF da devolutiva está vazio.");
  if (message.pdf.size > 12 * 1024 * 1024) {
    throw new Error("O PDF é grande demais para envio pelo Gmail.");
  }

  const pdfBytes = new Uint8Array(await message.pdf.arrayBuffer());
  const pdfBase64 = bytesToBase64(pdfBytes);
  const filename = sanitizeFilename(message.filename ?? "devolutiva.pdf");
  const boundary = `feedback_${crypto.randomUUID().replaceAll("-", "")}`;
  const mime = [
    `From: ${connection.email}`,
    `To: ${to}`,
    `Subject: ${encodeMimeHeader(subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(textToBase64(message.text)),
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    "Content-Transfer-Encoding: base64",
    `Content-Disposition: attachment; filename="${filename}"`,
    "",
    wrapBase64(pdfBase64),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      raw: toBase64Url(new TextEncoder().encode(mime)),
    }),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: { message?: string };
    };

    if (response.status === 401 || response.status === 403) {
      disconnectGmail(connection);
      throw new Error("A autorização do Gmail expirou ou foi recusada. Autorize novamente.");
    }

    throw new Error(payload.error?.message ?? `O Gmail recusou o envio (${response.status}).`);
  }
}

function readGmailConnection(): GmailConnection | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = sessionStorage.getItem(GMAIL_CONNECTION_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<GmailConnection>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      return null;
    }

    return {
      accessToken: parsed.accessToken,
      email: parsed.email,
      expiresAt: parsed.expiresAt,
    };
  } catch {
    return null;
  }
}

function saveGmailConnection(connection: GmailConnection): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem(GMAIL_CONNECTION_KEY, JSON.stringify(connection));
  }
}

function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Informe um endereço de e-mail válido.");
  }
  return normalized;
}

function sanitizeFilename(value: string): string {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return sanitized.toLowerCase().endsWith(".pdf") ? sanitized : `${sanitized || "devolutiva"}.pdf`;
}

function encodeMimeHeader(value: string): string {
  return `=?UTF-8?B?${textToBase64(value)}?=`;
}

function textToBase64(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value));
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function wrapBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function readErrorCode(error: unknown): string {
  return error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code ?? "")
    : "";
}
