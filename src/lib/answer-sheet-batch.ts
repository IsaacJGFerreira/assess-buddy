import { flushSync } from "react-dom";
import { createRoot, type Root } from "react-dom/client";
import type { ReactElement } from "react";
import JSZip from "jszip";
import {
  renderAnswerSheetPdfBlob,
  renderAnswerSheetPngBlob,
  safeFileName,
  triggerBlobDownload,
} from "@/lib/answer-sheet-export";

export interface BatchAnswerSheetItem {
  fileName: string;
  element: ReactElement;
}

export async function batchExportAnswerSheetsAsZip({
  format,
  items,
  zipBaseName,
  onProgress,
}: {
  format: "pdf" | "png";
  items: BatchAnswerSheetItem[];
  zipBaseName: string;
  onProgress?: (done: number, total: number) => void;
}) {
  if (items.length === 0) throw new Error("Nenhum aluno elegível para exportação em lote.");

  const container = document.createElement("div");
  container.setAttribute("aria-hidden", "true");
  container.style.position = "fixed";
  container.style.left = "-100000px";
  container.style.top = "0";
  container.style.width = "auto";
  container.style.pointerEvents = "none";
  container.style.opacity = "1";
  document.body.appendChild(container);

  const zip = new JSZip();
  let root: Root | null = null;

  try {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      const host = document.createElement("div");
      host.className = "answer-sheet-export-root";
      container.innerHTML = "";
      container.appendChild(host);
      root = createRoot(host);
      flushSync(() => {
        root!.render(item.element);
      });
      // give the browser a frame for layout/fonts
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      await new Promise((resolve) => setTimeout(resolve, 30));

      const blob =
        format === "pdf"
          ? await renderAnswerSheetPdfBlob(host)
          : await renderAnswerSheetPngBlob(host);
      const extension = format === "pdf" ? "pdf" : "png";
      zip.file(`${safeFileName(item.fileName)}.${extension}`, blob);

      root.unmount();
      root = null;
      onProgress?.(index + 1, items.length);
    }

    const zipBlob = await zip.generateAsync({ type: "blob" });
    triggerBlobDownload(zipBlob, `${safeFileName(zipBaseName)}-folhas.zip`);
  } finally {
    if (root) root.unmount();
    document.body.removeChild(container);
  }
}
