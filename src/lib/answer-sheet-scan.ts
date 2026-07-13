import type { Area } from "react-easy-crop";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

export const ANSWER_SHEET_SCAN_MAX_BYTES = 25 * 1024 * 1024;
export const ANSWER_SHEET_SCAN_MAX_PDF_PAGES = 50;
export const ANSWER_SHEET_SCAN_ACCEPT = ".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf";

export type AnswerSheetScanMime = "image/jpeg" | "image/png" | "application/pdf";

export interface PreparedAnswerSheetImage {
  blob: Blob;
  width: number;
  height: number;
}

export interface LoadedAnswerSheetPdf {
  document: PDFDocumentProxy;
  numPages: number;
  destroy: () => Promise<void>;
}

export function getAnswerSheetScanMime(file: File): AnswerSheetScanMime | null {
  if (file.type === "image/jpeg" || file.type === "image/png" || file.type === "application/pdf") {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "jpg" || extension === "jpeg") return "image/jpeg";
  if (extension === "png") return "image/png";
  if (extension === "pdf") return "application/pdf";
  return null;
}

export function validateAnswerSheetScanFile(file: File): AnswerSheetScanMime {
  const mime = getAnswerSheetScanMime(file);
  if (!mime) {
    throw new Error("Formato não aceito. Envie um arquivo JPG, PNG ou PDF.");
  }
  if (file.size <= 0) throw new Error("O arquivo selecionado está vazio.");
  if (file.size > ANSWER_SHEET_SCAN_MAX_BYTES) {
    throw new Error("O arquivo ultrapassa o limite de 25 MB.");
  }
  return mime;
}

export async function loadAnswerSheetPdf(file: File): Promise<LoadedAnswerSheetPdf> {
  if (typeof window === "undefined") throw new Error("O PDF só pode ser aberto no navegador.");

  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
  const data = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data });
  const document = await loadingTask.promise;

  if (document.numPages > ANSWER_SHEET_SCAN_MAX_PDF_PAGES) {
    await loadingTask.destroy();
    throw new Error(`O PDF possui mais de ${ANSWER_SHEET_SCAN_MAX_PDF_PAGES} páginas.`);
  }
  return {
    document,
    numPages: document.numPages,
    destroy: () => loadingTask.destroy(),
  };
}

export async function renderAnswerSheetPdfPage(
  document: PDFDocumentProxy,
  pageNumber: number,
): Promise<string> {
  const page = await document.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1 });
  const scale = Math.min(2.5, 2600 / Math.max(baseViewport.width, baseViewport.height));
  const viewport = page.getViewport({ scale: Math.max(1.5, scale) });
  const canvas = window.document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);

  await page.render({ canvas, viewport }).promise;
  page.cleanup();
  return canvas.toDataURL("image/png");
}

export async function createPreparedAnswerSheetImage(
  source: string,
  crop: Area,
  rotation: number,
): Promise<PreparedAnswerSheetImage> {
  const image = await loadImage(source);
  if (image.naturalWidth * image.naturalHeight > 50_000_000) {
    throw new Error("A imagem possui resolução alta demais. Reduza-a antes de enviar.");
  }

  const radians = degreesToRadians(rotation);
  const bounds = getRotatedSize(image.naturalWidth, image.naturalHeight, radians);
  const rotationCanvas = window.document.createElement("canvas");
  rotationCanvas.width = bounds.width;
  rotationCanvas.height = bounds.height;
  const rotationContext = rotationCanvas.getContext("2d");
  if (!rotationContext) throw new Error("O navegador não conseguiu preparar a imagem.");

  rotationContext.fillStyle = "#ffffff";
  rotationContext.fillRect(0, 0, bounds.width, bounds.height);
  rotationContext.translate(bounds.width / 2, bounds.height / 2);
  rotationContext.rotate(radians);
  rotationContext.translate(-image.naturalWidth / 2, -image.naturalHeight / 2);
  rotationContext.drawImage(image, 0, 0);

  const sourceX = clamp(Math.round(crop.x), 0, Math.max(0, bounds.width - 1));
  const sourceY = clamp(Math.round(crop.y), 0, Math.max(0, bounds.height - 1));
  const sourceWidth = clamp(Math.round(crop.width), 1, bounds.width - sourceX);
  const sourceHeight = clamp(Math.round(crop.height), 1, bounds.height - sourceY);
  const maxOutputSide = 3200;
  const outputScale = Math.min(1, maxOutputSide / Math.max(sourceWidth, sourceHeight));
  const outputWidth = Math.max(1, Math.round(sourceWidth * outputScale));
  const outputHeight = Math.max(1, Math.round(sourceHeight * outputScale));
  const outputCanvas = window.document.createElement("canvas");
  outputCanvas.width = outputWidth;
  outputCanvas.height = outputHeight;
  const outputContext = outputCanvas.getContext("2d");
  if (!outputContext) throw new Error("O navegador não conseguiu recortar a imagem.");

  outputContext.fillStyle = "#ffffff";
  outputContext.fillRect(0, 0, outputWidth, outputHeight);
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = "high";
  outputContext.drawImage(
    rotationCanvas,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    0,
    0,
    outputWidth,
    outputHeight,
  );

  const blob = await canvasToBlob(outputCanvas);
  return { blob, width: outputWidth, height: outputHeight };
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível abrir a imagem selecionada."));
    image.src = source;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Não foi possível gerar a imagem recortada."));
    }, "image/png");
  });
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function getRotatedSize(width: number, height: number, radians: number) {
  return {
    width: Math.ceil(Math.abs(Math.cos(radians) * width) + Math.abs(Math.sin(radians) * height)),
    height: Math.ceil(Math.abs(Math.sin(radians) * width) + Math.abs(Math.cos(radians) * height)),
  };
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}
