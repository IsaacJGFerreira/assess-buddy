import {
  normalizeFirebaseStorageBucket,
  parseFirebaseFeedbackImageUrl,
} from "@/lib/feedback-image-url";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type ProxyOptions = {
  expectedBucket?: string;
  fetcher?: typeof fetch;
};

export async function handleFeedbackImageProxy(
  request: Request,
  options: ProxyOptions = {},
): Promise<Response> {
  if (request.method !== "GET") {
    return textResponse("Método não permitido.", 405, { Allow: "GET" });
  }

  const expectedBucket = normalizeFirebaseStorageBucket(
    options.expectedBucket ?? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  );
  if (!expectedBucket) return textResponse("Firebase Storage não configurado.", 503);

  const source = new URL(request.url).searchParams.get("source") ?? "";
  const location = parseFirebaseFeedbackImageUrl(source);
  if (!location || location.bucket !== expectedBucket) {
    return textResponse("Origem de imagem inválida.", 400);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const upstream = await (options.fetcher ?? fetch)(location.url, {
      headers: { Accept: "image/png,image/jpeg,image/webp" },
      redirect: "error",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));
    if (!upstream.ok) return textResponse("Não foi possível carregar a imagem.", 502);

    const declaredSize = Number(upstream.headers.get("content-length") ?? 0);
    if (declaredSize > MAX_IMAGE_BYTES) return textResponse("Imagem muito grande.", 413);

    const bytes = await upstream.arrayBuffer();
    if (bytes.byteLength === 0) return textResponse("Imagem vazia.", 502);
    if (bytes.byteLength > MAX_IMAGE_BYTES) return textResponse("Imagem muito grande.", 413);

    const contentType = detectImageType(bytes, upstream.headers.get("content-type"));
    if (!contentType) return textResponse("Formato de imagem inválido.", 415);

    return new Response(bytes, {
      status: 200,
      headers: {
        "cache-control": "private, max-age=3600",
        "content-type": contentType,
        "content-security-policy": "default-src 'none'",
        "x-content-type-options": "nosniff",
      },
    });
  } catch {
    return textResponse("Não foi possível carregar a imagem.", 502);
  }
}

function detectImageType(bytes: ArrayBuffer, declaredType: string | null): string | null {
  const normalized = declaredType?.split(";", 1)[0].trim().toLowerCase() ?? "";
  if (IMAGE_TYPES.has(normalized)) return normalized;

  const view = new Uint8Array(bytes);
  if (
    view.length >= 8 &&
    view[0] === 0x89 &&
    view[1] === 0x50 &&
    view[2] === 0x4e &&
    view[3] === 0x47 &&
    view[4] === 0x0d &&
    view[5] === 0x0a &&
    view[6] === 0x1a &&
    view[7] === 0x0a
  ) {
    return "image/png";
  }
  if (view.length >= 3 && view[0] === 0xff && view[1] === 0xd8 && view[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    view.length >= 12 &&
    String.fromCharCode(...view.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...view.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function textResponse(body: string, status: number, headers: HeadersInit = {}): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/plain; charset=utf-8", ...headers },
  });
}
