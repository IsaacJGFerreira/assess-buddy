export const FEEDBACK_IMAGE_PROXY_PATH = "/api/feedback-image";

export type FirebaseFeedbackImageLocation = {
  bucket: string;
  objectPath: string;
  url: URL;
};

export function parseFirebaseFeedbackImageUrl(value: string): FirebaseFeedbackImageLocation | null {
  if (!value || value.length > 8_192) return null;

  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "firebasestorage.googleapis.com" ||
      url.username ||
      url.password
    ) {
      return null;
    }

    const match = /^\/v[^/]+\/b\/([^/]+)\/o\/(.+)$/.exec(url.pathname);
    if (!match || url.searchParams.get("alt") !== "media") return null;

    const bucket = decodeURIComponent(match[1]);
    const objectPath = decodeURIComponent(match[2]);
    if (!bucket || !objectPath || objectPath.includes("\0")) return null;

    return { bucket, objectPath, url };
  } catch {
    return null;
  }
}

export function createFeedbackImageProxyUrl(source: string): string {
  return `${FEEDBACK_IMAGE_PROXY_PATH}?source=${encodeURIComponent(source)}`;
}

export function normalizeFirebaseStorageBucket(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .replace(/^gs:\/\//, "")
    .replace(/\/$/, "");
}
