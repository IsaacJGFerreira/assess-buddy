import { jsPDF } from "jspdf";

export type FeedbackQuestionType = "mc" | "ce" | "num" | "disc";

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

export interface FeedbackQuestion {
  id: string;
  numero: number;
  tipo: FeedbackQuestionType;
  gabarito: string | null;
  valor: number;
  desconto_erro: number;
  anulada: boolean;
  conteudo: string | null;
  orientacao_correcao?: string | null;
  resposta_modelo?: string | null;
  resposta_modelo_imagem_path?: string | null;
  resposta_modelo_imagem_url?: string | null;
}

export interface FeedbackResponse {
  aluno_id: string;
  questao_id: string;
  resposta: string | null;
  nota_manual: number | null;
  feedback: string | null;
}

export interface FeedbackPdfInput {
  assessment: FeedbackAssessment;
  student: FeedbackStudent;
  questions: FeedbackQuestion[];
  responses: FeedbackResponse[];
  teacherEmail: string;
}

interface QuestionResult {
  answer: string;
  expected: string;
  points: number;
  status: string;
  feedback: string;
}

interface PreparedImage {
  dataUrl: string;
  width: number;
  height: number;
}

const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const MARGIN = 14;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

export function calculateFeedbackScore(
  questions: FeedbackQuestion[],
  responses: FeedbackResponse[],
): number {
  const byQuestion = new Map(responses.map((response) => [response.questao_id, response]));
  const score = questions.reduce((total, question) => {
    const result = evaluateQuestion(question, byQuestion.get(question.id));
    return total + result.points;
  }, 0);
  return Math.round(score * 100) / 100;
}

export async function generateFeedbackPdf(input: FeedbackPdfInput): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const responsesByQuestion = new Map(
    input.responses
      .filter((response) => response.aluno_id === input.student.id)
      .map((response) => [response.questao_id, response]),
  );
  const score = calculateFeedbackScore(input.questions, input.responses);
  const maximum =
    Number(input.assessment.valor_total) ||
    input.questions.reduce((sum, question) => sum + Number(question.valor), 0);
  const percentage = maximum > 0 ? Math.round((score / maximum) * 100) : 0;
  let y = MARGIN;

  const addPageIfNeeded = (height: number) => {
    if (y + height <= PAGE_HEIGHT - MARGIN) return;
    doc.addPage();
    y = MARGIN;
  };

  const writeWrapped = (
    text: string,
    options: {
      x?: number;
      width?: number;
      fontSize?: number;
      bold?: boolean;
      lineHeight?: number;
      gapAfter?: number;
    } = {},
  ) => {
    const x = options.x ?? MARGIN;
    const width = options.width ?? CONTENT_WIDTH;
    const fontSize = options.fontSize ?? 10;
    const lineHeight = options.lineHeight ?? fontSize * 0.42;
    const lines = doc.splitTextToSize(cleanText(text), width) as string[];
    const height = Math.max(lineHeight, lines.length * lineHeight);
    addPageIfNeeded(height);
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    doc.text(lines, x, y);
    y += height + (options.gapAfter ?? 0);
  };

  const writeSectionTitle = (title: string) => {
    addPageIfNeeded(10);
    doc.setDrawColor(20, 20, 20);
    doc.setLineWidth(0.35);
    doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
    y += 6;
    writeWrapped(title, { fontSize: 10, bold: true, lineHeight: 4.5, gapAfter: 2 });
  };

  const addModelImage = async (url: string, questionNumber: number) => {
    try {
      const image = await prepareImage(url);
      const maximumWidth = CONTENT_WIDTH - 10;
      const maximumHeight = 72;
      const scale = Math.min(maximumWidth / image.width, maximumHeight / image.height, 1);
      const width = image.width * scale;
      const height = image.height * scale;
      addPageIfNeeded(height + 7);
      doc.addImage(image.dataUrl, "JPEG", MARGIN + 5, y, width, height);
      y += height + 4;
    } catch {
      writeWrapped(`Imagem da resposta-modelo da questão ${questionNumber} indisponível.`, {
        fontSize: 8.5,
        lineHeight: 4,
      });
    }
  };

  doc.setDrawColor(20, 20, 20);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  y += 7;
  writeWrapped("DEVOLUTIVA DA AVALIAÇÃO", { fontSize: 9, bold: true, lineHeight: 4 });
  writeWrapped(input.assessment.titulo, { fontSize: 17, bold: true, lineHeight: 7 });
  if (input.assessment.disciplina) {
    writeWrapped(input.assessment.disciplina, { fontSize: 10, lineHeight: 4.5 });
  }
  y += 2;

  doc.setFillColor(245, 245, 245);
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 24, 2, 2, "F");
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Aluno", MARGIN + 4, y + 6);
  doc.setFont("helvetica", "normal");
  doc.text(cleanText(input.student.nome), MARGIN + 26, y + 6);
  doc.setFont("helvetica", "bold");
  doc.text("Matrícula", MARGIN + 4, y + 13);
  doc.setFont("helvetica", "normal");
  doc.text(cleanText(input.student.matricula || "—"), MARGIN + 26, y + 13);
  doc.setFont("helvetica", "bold");
  doc.text("Professor", MARGIN + 4, y + 20);
  doc.setFont("helvetica", "normal");
  doc.text(cleanText(input.teacherEmail), MARGIN + 26, y + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(19);
  doc.text(`${formatNumber(score)} / ${formatNumber(maximum)}`, PAGE_WIDTH - MARGIN - 4, y + 10, {
    align: "right",
  });
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${percentage}%`, PAGE_WIDTH - MARGIN - 4, y + 18, { align: "right" });
  y += 30;

  writeSectionTitle("GABARITO ORIGINAL DA PROVA");
  writeWrapped(
    "A seguir estão as respostas oficiais cadastradas pelo professor. Nas questões discursivas, a resposta-modelo pode conter texto, imagem ou ambos.",
    { fontSize: 9, lineHeight: 4.2, gapAfter: 2 },
  );

  for (const question of input.questions) {
    const modelText = question.resposta_modelo?.trim();
    const imageUrl = question.resposta_modelo_imagem_url?.trim();
    const estimatedHeight = question.tipo === "disc" ? 22 : 13;
    addPageIfNeeded(estimatedHeight);
    doc.setDrawColor(190, 190, 190);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, estimatedHeight, 1.5, 1.5);
    const boxTop = y;
    y += 5;
    writeWrapped(`Questão ${question.numero} · ${questionTypeLabel(question.tipo)}`, {
      x: MARGIN + 4,
      width: CONTENT_WIDTH - 8,
      fontSize: 9.5,
      bold: true,
      lineHeight: 4.2,
    });
    if (question.anulada) {
      writeWrapped("Gabarito: questão anulada", {
        x: MARGIN + 4,
        width: CONTENT_WIDTH - 8,
        fontSize: 9,
        lineHeight: 4,
      });
    } else if (question.tipo === "disc") {
      writeWrapped(`Resposta-modelo em texto: ${modelText || "Não informada"}`, {
        x: MARGIN + 4,
        width: CONTENT_WIDTH - 8,
        fontSize: 9,
        lineHeight: 4,
      });
      if (imageUrl) {
        y = Math.max(y + 2, boxTop + estimatedHeight + 2);
        await addModelImage(imageUrl, question.numero);
      }
    } else {
      writeWrapped(`Gabarito: ${question.gabarito?.trim() || "Não informado"}`, {
        x: MARGIN + 4,
        width: CONTENT_WIDTH - 8,
        fontSize: 9,
        lineHeight: 4,
      });
    }
    y = Math.max(y + 3, boxTop + estimatedHeight + 3);
  }

  writeSectionTitle("RESULTADO DO ALUNO");
  for (const question of input.questions) {
    const response = responsesByQuestion.get(question.id);
    const result = evaluateQuestion(question, response);
    const isDiscursive = question.tipo === "disc";
    const details = [
      question.conteudo ? `Conteúdo: ${question.conteudo}` : "",
      `Resposta do aluno: ${result.answer}`,
      isDiscursive
        ? `Nota manual: ${formatNumber(result.points)} de ${formatNumber(Number(question.valor))}`
        : `Gabarito: ${result.expected}`,
      `Situação: ${result.status}`,
    ].filter(Boolean);
    const feedback = isDiscursive ? result.feedback.trim() : "";
    const estimatedHeight = 17 + details.length * 4 + (feedback ? 13 : 0);
    addPageIfNeeded(estimatedHeight);

    doc.setDrawColor(185, 185, 185);
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, Math.max(20, estimatedHeight), 1.5, 1.5);
    const boxTop = y;
    y += 6;
    writeWrapped(`Questão ${question.numero} · ${questionTypeLabel(question.tipo)}`, {
      x: MARGIN + 4,
      width: CONTENT_WIDTH - 8,
      fontSize: 10,
      bold: true,
      lineHeight: 4.5,
    });
    for (const detail of details) {
      writeWrapped(detail, {
        x: MARGIN + 4,
        width: CONTENT_WIDTH - 8,
        fontSize: 9,
        lineHeight: 4,
      });
    }
    if (feedback) {
      writeWrapped(`Comentário do professor: ${feedback}`, {
        x: MARGIN + 4,
        width: CONTENT_WIDTH - 8,
        fontSize: 9,
        bold: true,
        lineHeight: 4,
      });
    }
    y = Math.max(y + 4, boxTop + estimatedHeight + 3);
  }

  addPageIfNeeded(25);
  writeSectionTitle("ORIENTAÇÃO PARA O ALUNO");
  writeWrapped(
    "Confira o gabarito original, reveja as questões objetivas incorretas e refaça o raciocínio. Nas discursivas, compare sua resposta com a resposta-modelo e utilize o comentário do professor para reorganizar os conceitos, as justificativas e as etapas da resolução.",
    { fontSize: 9.5, lineHeight: 4.5 },
  );

  const totalPages = doc.getNumberOfPages();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text("Documento gerado automaticamente pelo sistema Folha.", MARGIN, PAGE_HEIGHT - 8);
    doc.text(`${page}/${totalPages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 8, { align: "right" });
  }
  doc.setTextColor(0, 0, 0);
  return doc.output("blob");
}

function evaluateQuestion(
  question: FeedbackQuestion,
  response: FeedbackResponse | undefined,
): QuestionResult {
  if (question.anulada) {
    return {
      answer: response?.resposta?.trim() || "—",
      expected: "Questão anulada",
      points: Number(question.valor),
      status: "Anulada",
      feedback: question.tipo === "disc" ? response?.feedback || "" : "",
    };
  }

  if (question.tipo === "disc") {
    const manual = clamp(Number(response?.nota_manual ?? 0), 0, Number(question.valor));
    return {
      answer: response?.resposta?.trim() || "Não registrada",
      expected: question.resposta_modelo?.trim() || "Resposta-modelo não informada",
      points: manual,
      status: response?.nota_manual == null ? "Aguardando nota manual" : "Corrigida manualmente",
      feedback: response?.feedback || "",
    };
  }

  const answer = response?.resposta?.trim() || "Em branco";
  const expected = question.gabarito?.trim().toUpperCase() || "—";
  if (!response?.resposta?.trim()) {
    return { answer, expected, points: 0, status: "Em branco", feedback: "" };
  }

  const correct = response.resposta.trim().toUpperCase() === expected;
  return {
    answer,
    expected,
    points: correct ? Number(question.valor) : -Number(question.desconto_erro || 0),
    status: correct ? "Correta" : "Incorreta",
    feedback: "",
  };
}

async function prepareImage(url: string): Promise<PreparedImage> {
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
    return {
      dataUrl: canvas.toDataURL("image/jpeg", 0.9),
      width: canvas.width,
      height: canvas.height,
    };
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

function questionTypeLabel(type: FeedbackQuestionType): string {
  if (type === "mc") return "Múltipla escolha";
  if (type === "ce") return "Certo/Errado";
  if (type === "num") return "Numérica";
  return "Discursiva";
}

function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}
