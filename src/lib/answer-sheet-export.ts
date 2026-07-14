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
  const target = root.querySelector<HTMLElement>(".answer-sheet-document") ?? root;
  const dataUrl = await toPng(target, {
    backgroundColor: "#ffffff",
    cacheBust: true,
    pixelRatio: 2,
  });
  triggerDownload(dataUrl, `${safeFileName(title)}-folha-de-respostas.png`);
}

export async function exportAnswerSheetAsPdf(root: HTMLElement, title: string) {
  const [{ toPng }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")]);
  const pages = Array.from(root.querySelectorAll<HTMLElement>(".answer-sheet-page"));
  if (pages.length === 0) throw new Error("Nenhuma página encontrada para exportação.");

  const dimensions = pages.map((page) => elementSizeInMillimeters(page));
  const first = dimensions[0];
  const pdf = new jsPDF({
    orientation: first.width > first.height ? "landscape" : "portrait",
    unit: "mm",
    format: [first.width, first.height],
  });

  for (let index = 0; index < pages.length; index += 1) {
    const { width, height } = dimensions[index];
    if (index > 0) {
      pdf.addPage([width, height], width > height ? "landscape" : "portrait");
    }
    const dataUrl = await toPng(pages[index], {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio: 2,
    });
    pdf.addImage(dataUrl, "PNG", 0, 0, width, height, undefined, "FAST");
  }

  pdf.save(`${safeFileName(title)}-folha-de-respostas.pdf`);
}

function elementSizeInMillimeters(element: HTMLElement): { width: number; height: number } {
  const pixelsPerMillimeter = 96 / 25.4;
  return {
    width: Math.max(20, element.getBoundingClientRect().width / pixelsPerMillimeter),
    height: Math.max(20, element.getBoundingClientRect().height / pixelsPerMillimeter),
  };
}
