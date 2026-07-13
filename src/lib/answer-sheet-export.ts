import type { AnswerSheetOrientation } from "@/lib/answer-sheet-layout";

function safeFileName(value: string): string {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "folha-de-respostas"
  );
}

function triggerDownload(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.download = fileName;
  link.href = dataUrl;
  link.click();
}

export async function exportAnswerSheetAsPng(root: HTMLElement, title: string) {
  const { toPng } = await import("html-to-image");
  const dataUrl = await toPng(root, {
    backgroundColor: "#ffffff",
    cacheBust: true,
    pixelRatio: 2,
  });
  triggerDownload(dataUrl, `${safeFileName(title)}-folha-de-respostas.png`);
}

export async function exportAnswerSheetAsPdf(
  root: HTMLElement,
  title: string,
  orientation: AnswerSheetOrientation,
) {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const pages = Array.from(root.querySelectorAll<HTMLElement>(".answer-sheet-page"));
  if (pages.length === 0) throw new Error("Nenhuma página encontrada para exportação.");

  const landscape = orientation === "landscape";
  const width = landscape ? 297 : 210;
  const height = landscape ? 210 : 297;
  const pdf = new jsPDF({ orientation, unit: "mm", format: "a4" });

  for (let index = 0; index < pages.length; index += 1) {
    if (index > 0) pdf.addPage("a4", orientation);
    const dataUrl = await toPng(pages[index], {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio: 2,
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, width, height, undefined, "FAST");
  }

  pdf.save(`${safeFileName(title)}-folha-de-respostas.pdf`);
}
