import { createClient, type User } from "https://esm.sh/@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://gabarito-brilhante.lovable.app",
  "https://id-preview--b213adce-d778-475c-8076-9c6aa7b2df0a.lovable.app",
];

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export function requiredEnv(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing server secret: ${name}`);
  return value;
}

export function serviceClient() {
  return createClient(requiredEnv("SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function authenticatedUser(request: Request): Promise<User> {
  const authorization = request.headers.get("Authorization") ?? "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token) throw new Error("AUTH_REQUIRED");

  const { data, error } = await serviceClient().auth.getUser(token);
  if (error || !data.user) throw new Error("AUTH_REQUIRED");
  return data.user;
}

export function googleClientId(): string {
  return requiredEnv("GOOGLE_GMAIL_CLIENT_ID");
}

export function googleClientSecret(): string {
  return requiredEnv("GOOGLE_GMAIL_CLIENT_SECRET");
}

export function gmailCallbackUrl(): string {
  return `${requiredEnv("SUPABASE_URL")}/functions/v1/gmail-oauth`;
}

export function validateReturnUrl(value: unknown): string {
  const fallback = `${DEFAULT_ALLOWED_ORIGINS[0]}/painel`;
  if (typeof value !== "string" || !value.trim()) return fallback;

  const configured = (Deno.env.get("APP_ALLOWED_ORIGINS") ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const allowed = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configured]);

  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (!allowed.has(url.origin) && !local) return fallback;
    return url.toString();
  } catch {
    return fallback;
  }
}

export function addQuery(urlValue: string, values: Record<string, string>): string {
  const url = new URL(urlValue);
  for (const [key, value] of Object.entries(values)) url.searchParams.set(key, value);
  return url.toString();
}

export function randomState(): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashState(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toBase64Url(new Uint8Array(digest));
}

async function encryptionKey(): Promise<CryptoKey> {
  const secret = requiredEnv("GMAIL_TOKEN_ENCRYPTION_KEY");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptRefreshToken(value: string): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(value),
  );
  return { ciphertext: bytesToBase64(new Uint8Array(encrypted)), iv: bytesToBase64(iv) };
}

export async function decryptRefreshToken(ciphertext: string, iv: string): Promise<string> {
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(iv) },
    await encryptionKey(),
    base64ToBytes(ciphertext),
  );
  return new TextDecoder().decode(decrypted);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return btoa(binary);
}

export function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

export function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function textToBase64(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value));
}

export function wrapBase64(value: string): string {
  return value.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

export function encodeMimeHeader(value: string): string {
  return `=?UTF-8?B?${textToBase64(value)}?=`;
}

export function sanitizeFilename(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "devolutiva.pdf";
}
