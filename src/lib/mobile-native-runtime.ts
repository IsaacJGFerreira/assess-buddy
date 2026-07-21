export type NativePermissionState =
  "prompt" | "prompt-with-rationale" | "granted" | "denied" | "limited";

export type NativeScanSource = "camera" | "gallery";

export interface NativeMediaAsset {
  uri?: string;
  webPath?: string;
  thumbnail?: string;
  metadata?: {
    format?: string;
    size?: number;
  };
}

export interface RestoredNativePluginResult {
  pluginId: string;
  methodName: string;
  success: boolean;
  data?: unknown;
  error?: { message?: string };
}

export interface NativeMediaReader {
  fetchBlob: (url: string) => Promise<Blob>;
  readBase64: (uri: string) => Promise<string>;
}

export interface NativeFileDispatcher {
  write: (input: {
    base64: string;
    fileName: string;
    location: "cache" | "documents";
  }) => Promise<string>;
  open: (uri: string) => Promise<void>;
  share: (input: { uri: string; title: string; text?: string }) => Promise<void>;
}

export interface NativeFileDispatchInput {
  blob: Blob;
  fileName: string;
  action: "open" | "save" | "share";
  title?: string;
  text?: string;
}

export function resolvePermissionAction(
  state: NativePermissionState,
): "continue" | "request" | "blocked" {
  if (state === "granted" || state === "limited") return "continue";
  if (state === "prompt" || state === "prompt-with-rationale") return "request";
  return "blocked";
}

export function extractRestoredCameraAsset(
  event: RestoredNativePluginResult,
): NativeMediaAsset | null {
  if (event.pluginId !== "Camera" || !event.success) return null;

  if (event.methodName === "takePhoto") {
    return isNativeMediaAsset(event.data) ? event.data : null;
  }

  if (event.methodName === "chooseFromGallery" && isRecord(event.data)) {
    const results = event.data.results;
    return Array.isArray(results) && isNativeMediaAsset(results[0]) ? results[0] : null;
  }

  return null;
}

export async function readNativeMediaBlob(
  asset: NativeMediaAsset,
  reader: NativeMediaReader,
): Promise<Blob> {
  const expectedMime = imageMimeFromFormat(asset.metadata?.format);

  if (asset.webPath) {
    try {
      const blob = await reader.fetchBlob(asset.webPath);
      if (blob.size > 0) return normalizeImageBlobType(blob, expectedMime);
    } catch {
      // A URI read below is more reliable on some Android document providers.
    }
  }

  if (asset.uri) {
    const base64 = await reader.readBase64(asset.uri);
    return base64ToBlob(base64, expectedMime);
  }

  if (asset.thumbnail) {
    return base64ToBlob(asset.thumbnail, expectedMime);
  }

  throw new Error("A imagem escolhida não pôde ser lida pelo Android.");
}

export function imageMimeFromFormat(format?: string): "image/jpeg" | "image/png" {
  return format?.toLowerCase() === "png" ? "image/png" : "image/jpeg";
}

export function imageExtensionFromMime(mime: string): "jpg" | "png" {
  return mime === "image/png" ? "png" : "jpg";
}

export function safeNativeFileName(value: string, fallback = "arquivo"): string {
  const sanitized = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .slice(0, 120);

  return sanitized || fallback;
}

export function buildCapturedScanName(
  source: NativeScanSource,
  mime: string,
  timestamp = Date.now(),
): string {
  return `folha-${source}-${timestamp}.${imageExtensionFromMime(mime)}`;
}

export async function blobToBase64(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return btoa(binary);
}

export function base64ToBlob(base64: string, mime = "application/octet-stream"): Blob {
  const normalized = base64.includes(",") ? base64.slice(base64.indexOf(",") + 1) : base64;
  const binary = atob(normalized.replace(/\s/g, ""));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mime });
}

export async function dispatchNativeFile(
  input: NativeFileDispatchInput,
  dispatcher: NativeFileDispatcher,
): Promise<string> {
  if (input.blob.size <= 0) throw new Error("O arquivo está vazio.");

  const fileName = safeNativeFileName(input.fileName);
  const base64 = await blobToBase64(input.blob);
  const location = input.action === "save" ? "documents" : "cache";
  const uri = await dispatcher.write({ base64, fileName, location });

  if (input.action === "open") {
    await dispatcher.open(uri);
  } else if (input.action === "share") {
    await dispatcher.share({
      uri,
      title: input.title?.trim() || fileName,
      text: input.text?.trim() || undefined,
    });
  }

  return uri;
}

export function assertOnline(connected: boolean, action = "continuar"): void {
  if (!connected) {
    throw new Error(
      `Conecte-se à internet para ${action}. Seu arquivo continua salvo no aparelho.`,
    );
  }
}

export function isNativeActionCancelled(error: unknown): boolean {
  const code = readErrorCode(error);
  return new Set(["OS-PLUG-CAMR-0006", "OS-PLUG-CAMR-0013", "OS-PLUG-CAMR-0020"]).has(code);
}

export function emailFromOpenIdToken(idToken: string): string | null {
  const payload = idToken.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const parsed = JSON.parse(atob(padded)) as { email?: unknown };
    return typeof parsed.email === "string" && parsed.email.trim()
      ? parsed.email.trim().toLowerCase()
      : null;
  } catch {
    return null;
  }
}

function normalizeImageBlobType(blob: Blob, fallback: "image/jpeg" | "image/png"): Blob {
  if (blob.type === "image/jpeg" || blob.type === "image/png") return blob;
  return blob.slice(0, blob.size, fallback);
}

function isNativeMediaAsset(value: unknown): value is NativeMediaAsset {
  if (!isRecord(value)) return false;
  return (
    typeof value.uri === "string" ||
    typeof value.webPath === "string" ||
    typeof value.thumbnail === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readErrorCode(error: unknown): string {
  return isRecord(error) && typeof error.code === "string" ? error.code : "";
}
