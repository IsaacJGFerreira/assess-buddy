import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";

import {
  buildFeedbackAnalysis,
  type FeedbackAnalysis,
  type FeedbackQuestion,
  type FeedbackQuestionAnalysis,
  type FeedbackQuestionType,
  type FeedbackResponse,
  type FeedbackSummaryRow,
} from "@/lib/devolutiva-data";
import { renderFeedbackQuestionCard } from "@/lib/devolutiva-pdf-card";

export type {
  FeedbackQuestion,
  FeedbackQuestionType,
  FeedbackResponse,
} from "@/lib/devolutiva-data";
export { calculateFeedbackScore } from "@/lib/devolutiva-data";

export interface FeedbackAssessment {
  id: string;
  titulo: string;
  disciplina: string | null;
  valor_total: number;
  comentario_devolutiva?: string | null;
}

export interface FeedbackStudent {
  id: string;
  nome: string;
  matricula: string | null;
  email: string | null;
}

export interface FeedbackPdfInput {
  assessment: FeedbackAssessment;
  student: FeedbackStudent;
  questions: FeedbackQuestion[];
  responses: FeedbackResponse[];
  classResponses?: FeedbackResponse[];
  teacherEmail: string;
}

type Rgb = [number, number, number];

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 10;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_BOTTOM = 282;
const FOOTER_LINE_Y = 286;
const FOOTER_TEXT_Y = 291;

const NAVY: Rgb = [11, 45, 114];
const BLUE: Rgb = [13, 91, 224];
const BLUE_DARK: Rgb = [8, 70, 190];
const BLUE_LIGHT: Rgb = [242, 247, 255];
const BLUE_BORDER: Rgb = [178, 205, 255];
const GREEN: Rgb = [22, 163, 74];
const RED: Rgb = [239, 68, 68];
const ORANGE: Rgb = [245, 135, 12];
const GRAY: Rgb = [100, 116, 139];
const LINE: Rgb = [213, 224, 242];

export async function generateFeedbackPdf(input: FeedbackPdfInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const analysis = buildFeedbackAnalysis({
    questions: input.questions,
    responses: input.responses,
    classResponses: input.classResponses ?? input.responses,
    maximumOverride: input.assessment.valor_total,
  });
  let y = drawFirstPageHeader(doc, input, analysis);
  y = drawStudentAndScoreCards(doc, input, analysis, y);
  y = drawSummaryTable(doc, analysis.summary, y);

  for (const questionAnalysis of analysis.questions) {
    try {
      const card = await captureQuestionCard(questionAnalysis);
      const naturalHeight = (card.height * CONTENT_WIDTH) / card.width;

      if (y + naturalHeight > CONTENT_BOTTOM) {
        doc.addPage();
        y = drawContinuationHeader(doc, input, analysis);
      }

      const availableHeight = CONTENT_BOTTOM - y;
      const scale = naturalHeight > availableHeight ? availableHeight / naturalHeight : 1;
      const width = CONTENT_WIDTH * scale;
      const height = naturalHeight * scale;
      const x = MARGIN + (CONTENT_WIDTH - width) / 2;
      doc.addImage(card.dataUrl, "PNG", x, y, width, height, undefined, "FAST");
      y += height + 4;
    } catch {
      const fallbackHeight = 28;
      if (y + fallbackHeight > CONTENT_BOTTOM) {
        doc.addPage();
        y = drawContinuationHeader(doc, input, analysis);
      }
      drawQuestionFallback(doc, questionAnalysis, y, fallbackHeight);
      y += fallbackHeight + 4;
    }
  }

  drawFooters(doc);
  return doc.output("blob");
}

async function captureQuestionCard(
  analysis: FeedbackQuestionAnalysis,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const capture = document.createElement("div");
  capture.style.position = "fixed";
  capture.style.left = "0";
  capture.style.top = "0";
  capture.style.zIndex = "-1";
  capture.style.pointerEvents = "none";
  capture.style.width = "760px";
  capture.style.boxSizing = "border-box";
  capture.style.padding = "4px";
  capture.style.background = "#ffffff";
  capture.innerHTML = renderFeedbackQuestionCard(analysis);
  document.body.appendChild(capture);

  try {
    await prepareCardImages(capture);
    if (document.fonts?.ready) await document.fonts.ready;
    const width = capture.offsetWidth;
    const height = capture.offsetHeight;
    const dataUrl = await toPng(capture, {
      backgroundColor: "#ffffff",
      cacheBust: true,
      pixelRatio: 2,
    });
    return { dataUrl, width, height };
  } finally {
    capture.remove();
  }
}

function drawFirstPageHeader(
  doc: jsPDF,
  input: FeedbackPdfInput,
  _analysis: FeedbackAnalysis,
): number {
  setFill(doc, BLUE);
  doc.circle(20, 20, 10, "F");
  drawClipboardIcon(doc, 20, 20);

  setText(doc, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("DEVOLUTIVA DA AVALIAÇÃO", 34, 18.5);

  doc.setFontSize(9.5);
  doc.text(truncateText(doc, input.assessment.titulo, 70), 34, 28);
  let subtitleX = 34 + doc.getTextWidth(truncateText(doc, input.assessment.titulo, 70));
  if (input.assessment.disciplina?.trim()) {
    setText(doc, BLUE);
    doc.text("•", subtitleX + 2.5, 28);
    setText(doc, [30, 41, 59]);
    doc.setFont("helvetica", "normal");
    subtitleX += 7;
    doc.text(truncateText(doc, input.assessment.disciplina.trim(), 50), subtitleX, 28);
  }

  drawAtomDecoration(doc, 180, 20);
  return 39;
}

function drawStudentAndScoreCards(
  doc: jsPDF,
  input: FeedbackPdfInput,
  analysis: FeedbackAnalysis,
  top: number,
): number {
  const height = 45;
  const gap = 4;
  const infoWidth = 104;
  const scoreX = MARGIN + infoWidth + gap;
  const scoreWidth = CONTENT_WIDTH - infoWidth - gap;

  setFill(doc, BLUE_LIGHT);
  setDraw(doc, BLUE_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, top, infoWidth, height, 3, 3, "FD");

  const rows = [
    { label: "Aluno", value: input.student.nome, icon: "person" as const },
    { label: "Matrícula", value: input.student.matricula?.trim() || null, icon: "id" as const },
    { label: "Professor", value: input.teacherEmail.trim() || null, icon: "mail" as const },
  ].filter((row) => row.value);
  const rowHeight = height / Math.max(rows.length, 1);
  rows.forEach((row, index) => {
    const rowTop = top + index * rowHeight;
    if (index > 0) {
      setDraw(doc, LINE);
      doc.line(MARGIN + 6, rowTop, MARGIN + infoWidth - 6, rowTop);
    }
    drawInfoIcon(doc, row.icon, MARGIN + 9, rowTop + rowHeight / 2);
    setText(doc, BLUE);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(row.label, MARGIN + 17, rowTop + 5.7);
    setText(doc, [17, 24, 39]);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(truncateText(doc, row.value ?? "", infoWidth - 24), MARGIN + 17, rowTop + 11);
  });

  setFill(doc, BLUE);
  doc.roundedRect(scoreX, top, scoreWidth, height, 3, 3, "F");
  setDraw(doc, [73, 137, 245]);
  doc.setLineWidth(0.25);
  doc.line(scoreX, top + 35, scoreX + scoreWidth, top + 30);
  doc.line(scoreX + 22, top + height, scoreX + scoreWidth, top + 33);
  drawTrophyIcon(doc, scoreX + 18, top + 25);

  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Sua nota", scoreX + scoreWidth * 0.7, top + 9, { align: "center" });
  doc.setFontSize(27);
  doc.text(formatNumber(analysis.score), scoreX + scoreWidth * 0.72, top + 27, {
    align: "center",
  });
  doc.setFontSize(12);
  doc.text(`${analysis.percentage}%`, scoreX + scoreWidth * 0.72, top + 36, {
    align: "center",
  });
  if (analysis.questions.some((question) => question.result.statusKey === "pending")) {
    doc.setFontSize(6.5);
    doc.text("Nota provisória", scoreX + scoreWidth * 0.72, top + 41, { align: "center" });
  }
  return top + height + 6;
}

function drawSummaryTable(doc: jsPDF, rows: FeedbackSummaryRow[], top: number): number {
  const headerHeight = 9;
  const rowHeight = 10;
  const widths = [50, 34, 34, 34, 38];
  const labels = ["Tipo", "Corretas", "Incorretas", "Em branco", "Aproveitamento"];
  const totalHeight = headerHeight + rows.length * rowHeight;

  setFill(doc, [248, 251, 255]);
  setDraw(doc, BLUE_BORDER);
  doc.setLineWidth(0.3);
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, totalHeight, 2.7, 2.7, "FD");
  setFill(doc, [242, 247, 255]);
  doc.rect(MARGIN, top, CONTENT_WIDTH, headerHeight, "F");

  let x = MARGIN;
  labels.forEach((label, index) => {
    const color = index === 1 ? GREEN : index === 2 ? RED : index === 3 ? ORANGE : BLUE;
    setText(doc, color);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.8);
    doc.text(label, x + widths[index] / 2, top + 5.8, { align: "center" });
    x += widths[index];
    if (index < widths.length - 1) {
      setDraw(doc, BLUE_BORDER);
      doc.line(x, top, x, top + totalHeight);
    }
  });

  rows.forEach((row, index) => {
    const rowTop = top + headerHeight + index * rowHeight;
    if (row.key === "total") {
      setFill(doc, [239, 246, 255]);
      doc.rect(MARGIN, rowTop, CONTENT_WIDTH, rowHeight, "F");
    }
    setDraw(doc, LINE);
    doc.line(MARGIN, rowTop, MARGIN + CONTENT_WIDTH, rowTop);
    drawSummaryRow(doc, row, rowTop, rowHeight, widths);
  });
  return top + totalHeight + 6;
}

function drawSummaryRow(
  doc: jsPDF,
  row: FeedbackSummaryRow,
  top: number,
  height: number,
  widths: number[],
) {
  let x = MARGIN;
  setText(doc, row.key === "total" ? BLUE : NAVY);
  doc.setFont("helvetica", row.key === "total" ? "bold" : "normal");
  doc.setFontSize(row.key === "total" ? 8.5 : 7.8);
  if (row.key === "total") {
    doc.text(row.label, x + widths[0] / 2, top + 6.5, { align: "center" });
  } else {
    drawTypeBadge(doc, row.key, x + 6, top + height / 2);
    doc.text(truncateText(doc, row.label, widths[0] - 16), x + 12, top + 6.4);
  }
  x += widths[0];

  const values = [row.correct, row.incorrect, row.blank, row.achievement];
  const colors = [GREEN, RED, ORANGE, BLUE];
  values.forEach((value, index) => {
    setText(doc, value == null ? GRAY : colors[index]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(row.key === "total" ? 8.7 : 8);
    doc.text(value == null ? "-" : String(value), x + widths[index + 1] / 2, top + 6.5, {
      align: "center",
    });
    x += widths[index + 1];
  });
}

function drawContinuationHeader(
  doc: jsPDF,
  input: FeedbackPdfInput,
  analysis: FeedbackAnalysis,
): number {
  setText(doc, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("DEVOLUTIVA DA AVALIAÇÃO", MARGIN, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(
    `${truncateText(doc, input.student.nome, 65)} • Resultado do aluno • continuação`,
    MARGIN,
    22,
  );

  const cardX = 151;
  const cardY = 7;
  const cardWidth = 49;
  const cardHeight = 19;
  setFill(doc, BLUE);
  doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 2.5, 2.5, "F");
  setText(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("Sua nota", cardX + 5, cardY + 5);
  doc.setFontSize(14);
  doc.text(formatNumber(analysis.score), cardX + 5, cardY + 14);
  doc.setFontSize(9);
  doc.text(`${analysis.percentage}%`, cardX + cardWidth - 5, cardY + 13.5, { align: "right" });
  if (analysis.questions.some((question) => question.result.statusKey === "pending")) {
    doc.setFontSize(5.3);
    doc.text("provisória", cardX + cardWidth - 5, cardY + 17, { align: "right" });
  }

  setDraw(doc, BLUE_BORDER);
  doc.line(MARGIN, 30, PAGE_WIDTH - MARGIN, 30);
  return 35;
}

function drawQuestionFallback(
  doc: jsPDF,
  analysis: FeedbackQuestionAnalysis,
  top: number,
  height: number,
) {
  setFill(doc, [250, 252, 255]);
  setDraw(doc, BLUE_BORDER);
  doc.roundedRect(MARGIN, top, CONTENT_WIDTH, height, 2.5, 2.5, "FD");
  setText(doc, NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(`Questão ${analysis.question.numero}`, MARGIN + 5, top + 7);
  setText(doc, GRAY);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Resposta do aluno: ${analysis.result.answer}`, MARGIN + 5, top + 14);
  doc.text(`Gabarito: ${analysis.result.expected || "Não informado"}`, MARGIN + 80, top + 14);
  setText(doc, BLUE);
  doc.text("O conteúdo visual deste card não pôde ser renderizado.", MARGIN + 5, top + 22);
}

function drawFooters(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    setDraw(doc, [76, 103, 154]);
    doc.setLineWidth(0.25);
    doc.line(MARGIN, FOOTER_LINE_Y, PAGE_WIDTH - MARGIN, FOOTER_LINE_Y);
    setText(doc, GRAY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text("Documento gerado automaticamente pelo sistema Folha.", MARGIN + 2, FOOTER_TEXT_Y);
    doc.text(`${page}/${pages}`, PAGE_WIDTH - MARGIN - 2, FOOTER_TEXT_Y, { align: "right" });
  }
}

function drawClipboardIcon(doc: jsPDF, centerX: number, centerY: number) {
  setDraw(doc, [255, 255, 255]);
  doc.setLineWidth(0.7);
  doc.roundedRect(centerX - 4.2, centerY - 5, 8.4, 10, 1.2, 1.2, "S");
  doc.roundedRect(centerX - 2, centerY - 6.2, 4, 2.5, 0.7, 0.7, "S");
  doc.line(centerX - 2.5, centerY - 1, centerX + 2.5, centerY - 1);
  doc.line(centerX - 2.5, centerY + 1.5, centerX + 1.2, centerY + 1.5);
  doc.circle(centerX + 3.6, centerY + 4.4, 1.7, "S");
  doc.line(centerX + 4.8, centerY + 5.6, centerX + 6.2, centerY + 7);
}

function drawAtomDecoration(doc: jsPDF, centerX: number, centerY: number) {
  setFill(doc, [236, 243, 255]);
  doc.circle(centerX, centerY, 11, "F");
  setDraw(doc, BLUE);
  doc.setLineWidth(0.35);
  doc.ellipse(centerX, centerY, 8, 3.4, "S");
  doc.ellipse(centerX, centerY, 3.4, 8, "S");
  doc.line(centerX - 5.7, centerY - 5.7, centerX + 5.7, centerY + 5.7);
  setFill(doc, BLUE);
  doc.circle(centerX, centerY, 1.5, "F");
  doc.circle(centerX - 15, centerY - 6, 1.2, "F");
  setFill(doc, [11, 174, 222]);
  doc.circle(centerX - 20, centerY + 3, 1.6, "F");
  setFill(doc, [139, 92, 246]);
  doc.circle(centerX + 14, centerY + 8, 1.5, "F");
}

function drawInfoIcon(doc: jsPDF, type: "person" | "id" | "mail", x: number, y: number) {
  setDraw(doc, BLUE);
  setFill(doc, BLUE);
  doc.setLineWidth(0.45);
  if (type === "person") {
    doc.circle(x, y - 2, 1.4, "F");
    doc.roundedRect(x - 2.6, y, 5.2, 3.2, 1, 1, "F");
  } else if (type === "id") {
    doc.roundedRect(x - 3, y - 2.4, 6, 4.8, 0.7, 0.7, "S");
    doc.circle(x - 1.5, y - 0.6, 0.7, "S");
    doc.line(x - 2.4, y + 1.1, x - 0.5, y + 1.1);
    doc.line(x + 0.2, y - 0.8, x + 2.1, y - 0.8);
    doc.line(x + 0.2, y + 0.7, x + 2.1, y + 0.7);
  } else {
    doc.roundedRect(x - 3, y - 2.2, 6, 4.4, 0.7, 0.7, "S");
    doc.line(x - 2.8, y - 1.7, x, y + 0.4);
    doc.line(x + 2.8, y - 1.7, x, y + 0.4);
  }
}

function drawTrophyIcon(doc: jsPDF, x: number, y: number) {
  setFill(doc, [255, 255, 255]);
  doc.circle(x, y, 10, "F");
  setDraw(doc, BLUE);
  doc.setLineWidth(0.7);
  doc.roundedRect(x - 3.4, y - 4.2, 6.8, 6, 1.2, 1.2, "S");
  doc.line(x, y + 1.8, x, y + 5);
  doc.line(x - 3, y + 5, x + 3, y + 5);
  doc.line(x - 3.5, y - 3, x - 5.5, y - 3);
  doc.line(x - 5.5, y - 3, x - 5.5, y - 0.5);
  doc.line(x - 5.5, y - 0.5, x - 3.4, y + 0.7);
  doc.line(x + 3.5, y - 3, x + 5.5, y - 3);
  doc.line(x + 5.5, y - 3, x + 5.5, y - 0.5);
  doc.line(x + 5.5, y - 0.5, x + 3.4, y + 0.7);
}

function drawTypeBadge(doc: jsPDF, type: FeedbackQuestionType, x: number, y: number) {
  setFill(doc, BLUE_LIGHT);
  setDraw(doc, BLUE);
  doc.roundedRect(x - 3.5, y - 3.5, 7, 7, 1, 1, "FD");
  setText(doc, BLUE);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(type === "num" ? 5.2 : 5.8);
  const label = type === "mc" ? "A" : type === "ce" ? "C/E" : type === "num" ? "123" : "D";
  doc.text(label, x, y + 1.7, { align: "center" });
}

async function prepareCardImages(container: HTMLElement): Promise<void> {
  const images = Array.from(container.querySelectorAll("img"));
  await Promise.all(
    images.map(async (image) => {
      const source = image.getAttribute("src");
      if (!source) return;
      try {
        const prepared = await prepareImage(source);
        image.removeAttribute("crossorigin");
        image.src = prepared;
        if (typeof image.decode === "function") await image.decode();
      } catch {
        const fallback = document.createElement("p");
        fallback.textContent = image.alt
          ? `Imagem indisponível: ${image.alt}`
          : "Imagem indisponível.";
        image.replaceWith(fallback);
      }
    }),
  );
}

async function prepareImage(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Imagem indisponível");
  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = await loadImage(objectUrl);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth || image.width;
    canvas.height = image.naturalHeight || image.height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Não foi possível preparar a imagem");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);
    return canvas.toDataURL("image/jpeg", 0.9);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Não foi possível carregar a imagem"));
    image.src = url;
  });
}

function truncateText(doc: jsPDF, text: string, maximumWidth: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (doc.getTextWidth(clean) <= maximumWidth) return clean;
  let shortened = clean;
  while (shortened.length > 1 && doc.getTextWidth(`${shortened}...`) > maximumWidth) {
    shortened = shortened.slice(0, -1);
  }
  return `${shortened.trimEnd()}...`;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

function setFill(doc: jsPDF, color: Rgb) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDraw(doc: jsPDF, color: Rgb) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

function setText(doc: jsPDF, color: Rgb) {
  doc.setTextColor(color[0], color[1], color[2]);
}
