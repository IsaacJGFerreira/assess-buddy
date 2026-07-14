import { jsPDF } from "jspdf";

export type FeedbackQuestionType = "mc" | "ce" | "num" | "disc";

export interface FeedbackAssessment {
  id: string;
  titulo: string;
  disciplina: string | null;
  valor_total: number;
  comentario_devolutiva: string | null;
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
  orientacao_correcao: string | null;
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

export function generateFeedbackPdf(input: FeedbackPdfInput): Blob {
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
    } = {},
  ) => {
    const x = options.x ?? MARGIN;
    const width = options.width ?? CONTENT_WIDTH;
    const fontSize = options.fontSize ?? 10;
    const lineHeight = options.lineHeight ?? fontSize * 0.42;
    doc.setFont("helvetica", options.bold ? "bold" : "normal");
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(cleanText(text), width) as string[];
    addPageIfNeeded(Math.max(lineHeight, lines.length * lineHeight));
    doc.text(lines, x, y);
    y += Math.max(lineHeight, lines.length * lineHeight);
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

  if (input.assessment.comentario_devolutiva?.trim()) {
    writeWrapped("COMENTÁRIO GERAL DO PROFESSOR", { fontSize: 10, bold: true, lineHeight: 5 });
    writeWrapped(input.assessment.comentario_devolutiva, { fontSize: 10, lineHeight: 4.8 });
    y += 3;
  }

  writeWrapped("RESULTADO QUESTÃO A QUESTÃO", { fontSize: 10, bold: true, lineHeight: 5 });
  y += 1;

  for (const question of input.questions) {
    const response = responsesByQuestion.get(question.id);
    const result = evaluateQuestion(question, response);
    const details = [
      question.conteudo ? `Conteúdo: ${question.conteudo}` : "",
      `Resposta do aluno: ${result.answer}`,
      question.tipo === "disc"
        ? `Nota manual: ${formatNumber(result.points)} de ${formatNumber(question.valor)}`
        : `Gabarito: ${result.expected}`,
      `Situação: ${result.status}`,
    ].filter(Boolean);
    const orientation = question.orientacao_correcao?.trim();
    const feedback = result.feedback.trim();
    const estimatedHeight = 18 + details.length * 4 + (orientation ? 12 : 0) + (feedback ? 12 : 0);
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
    if (orientation) {
      writeWrapped(`Orientação de correção: ${orientation}`, {
        x: MARGIN + 4,
        width: CONTENT_WIDTH - 8,
        fontSize: 9,
        bold: true,
        lineHeight: 4,
      });
    }
    if (feedback) {
      writeWrapped(`Comentário individual: ${feedback}`, {
        x: MARGIN + 4,
        width: CONTENT_WIDTH - 8,
        fontSize: 9,
        lineHeight: 4,
      });
    }
    y = Math.max(y + 4, boxTop + estimatedHeight + 3);
  }

  addPageIfNeeded(26);
  y += 2;
  writeWrapped("ORIENTAÇÃO PARA A CORREÇÃO DO ALUNO", { fontSize: 10, bold: true, lineHeight: 5 });
  writeWrapped(
    "Revise cada questão indicada, explique com suas próprias palavras onde ocorreu o erro e refaça o raciocínio. Nas questões discursivas, use a orientação do professor para reorganizar a resposta, apresentar os conceitos necessários e justificar cada etapa.",
    { fontSize: 9.5, lineHeight: 4.5 },
  );

  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text("Documento gerado automaticamente pelo sistema Folha.", MARGIN, PAGE_HEIGHT - 8);
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
      feedback: response?.feedback || "",
    };
  }

  if (question.tipo === "disc") {
    const manual = clamp(Number(response?.nota_manual ?? 0), 0, Number(question.valor));
    return {
      answer: response?.resposta?.trim() || "Resposta discursiva avaliada manualmente",
      expected: "Correção manual",
      points: manual,
      status: response?.nota_manual == null ? "Aguardando nota manual" : "Corrigida manualmente",
      feedback: response?.feedback || "",
    };
  }

  const answer = response?.resposta?.trim() || "Em branco";
  const expected = question.gabarito?.trim().toUpperCase() || "—";
  if (!response?.resposta?.trim()) {
    return { answer, expected, points: 0, status: "Em branco", feedback: response?.feedback || "" };
  }

  const correct = response.resposta.trim().toUpperCase() === expected;
  return {
    answer,
    expected,
    points: correct ? Number(question.valor) : -Number(question.desconto_erro || 0),
    status: correct ? "Correta" : "Incorreta",
    feedback: response.feedback || "",
  };
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
