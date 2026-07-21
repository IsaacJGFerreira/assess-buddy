export function storageBytesToDataUrl(
  input: ArrayBuffer | Uint8Array,
  contentType: string,
): string {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  let binary = "";
  const chunkSize = 0x8000;

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }

  return `data:${normalizeFeedbackImageMime(contentType)};base64,${btoa(binary)}`;
}

export function normalizeFeedbackImageMime(contentType?: string | null, path = ""): string {
  if (contentType === "image/png" || contentType === "image/jpeg" || contentType === "image/webp") {
    return contentType;
  }
  if (/\.png$/i.test(path)) return "image/png";
  if (/\.webp$/i.test(path)) return "image/webp";
  return "image/jpeg";
}
