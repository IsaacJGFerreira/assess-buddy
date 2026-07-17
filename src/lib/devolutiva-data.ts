export type FeedbackQuestionType = "mc" | "ce" | "num" | "disc";
export type FeedbackStatusKey =
  | "correct"
  | "incorrect"
  | "blank"
  | "manual"
  | "pending"
  | "annulled";

export interface FeedbackQuestion {
  id: string;
  numero: number;
  tipo: FeedbackQuestionType;
  qtd_alternativas?: number | null;
  num_digitos?: number | null;
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

export interface FeedbackQuestionResult {
  answer: string;
  expected: string;
  points: number;
  status: string;
  statusKey: FeedbackStatusKey;
  feedback: string;
}

export type FeedbackChartTone = "green" | "blue" | "orange" | "purple" | "red" | "gray";

export interface FeedbackDistributionRow {
  label: string;
  count: number;
  percent: number;
  tone: FeedbackChartTone;
}

export interface FeedbackQuestionAnalysis {
  question: FeedbackQuestion;
  result: FeedbackQuestionResult;
  distributionTitle: string | null;
  distribution: FeedbackDistributionRow[];
  distributionAvailable: boolean;
}

export interface FeedbackSummaryRow {
  key: FeedbackQuestionType | "total";
  label: string;
  correct: number | null;
  incorrect: number | null;
  blank: number | null;
  achievement: string;
}

export interface FeedbackAnalysis {
  score: number;
  maximum: number;
  percentage: number;
  validClassCorrections: number;
  summary: FeedbackSummaryRow[];
  questions: FeedbackQuestionAnalysis[];
}

const TYPE_ORDER: FeedbackQuestionType[] = ["mc", "ce", "num", "disc"];

export function calculateFeedbackScore(
  questions: FeedbackQuestion[],
  responses: FeedbackResponse[],
): number {
  const byQuestion = new Map(responses.map((response) => [response.questao_id, response]));
  return roundScore(
    questions.reduce(
      (total, question) => total + evaluateFeedbackQuestion(question, byQuestion.get(question.id)).points,
      0,
    ),
  );
}

export function buildFeedbackAnalysis({
  questions,
  responses,
  classResponses,
  maximumOverride,
}: {
  questions: FeedbackQuestion[];
  responses: FeedbackResponse[];
  classResponses: FeedbackResponse[];
  maximumOverride?: number | null;
}): FeedbackAnalysis {
  const studentResponses = new Map(
    responses.map((response) => [response.questao_id, response]),
  );
  const validStudentIds = new Set(classResponses.map((response) => response.aluno_id));
  const maximum =
    Number(maximumOverride) || questions.reduce((sum, question) => sum + Number(question.valor), 0);
  const score = calculateFeedbackScore(questions, responses);
  const percentage = maximum > 0 ? Math.round((score / maximum) * 100) : 0;
  const analyses = questions.map((question) => {
    const result = evaluateFeedbackQuestion(question, studentResponses.get(question.id));
    const distribution = buildDistribution(question, classResponses, validStudentIds);
    return {
      question,
      result,
      distributionTitle:
        question.tipo === "disc"
          ? null
          : question.tipo === "num"
            ? "Desempenho da turma"
            : "Distribuição da turma",
      distribution: distribution.rows,
      distributionAvailable: distribution.available,
    } satisfies FeedbackQuestionAnalysis;
  });

  const summary = TYPE_ORDER.reduce<FeedbackSummaryRow[]>((rows, type) => {
    const typeAnalyses = analyses.filter((analysis) => analysis.question.tipo === type);
    if (typeAnalyses.length === 0) return rows;
    const typeMaximum = typeAnalyses.reduce(
      (sum, analysis) => sum + Number(analysis.question.valor),
      0,
    );
    const typeScore = typeAnalyses.reduce((sum, analysis) => sum + analysis.result.points, 0);

    if (type === "disc") {
      rows.push({
        key: type,
        label: questionTypeLabel(type),
        correct: null,
        incorrect: null,
        blank: null,
        achievement: `${formatDecimal(typeScore)} / ${formatDecimal(typeMaximum)}`,
      });
      return rows;
    }

    rows.push({
      key: type,
      label: questionTypeLabel(type),
      correct: typeAnalyses.filter((analysis) =>
        ["correct", "annulled"].includes(analysis.result.statusKey),
      ).length,
      incorrect: typeAnalyses.filter((analysis) => analysis.result.statusKey === "incorrect")
        .length,
      blank: typeAnalyses.filter((analysis) => analysis.result.statusKey === "blank").length,
      achievement: typeMaximum > 0 ? `${Math.round((typeScore / typeMaximum) * 100)}%` : "0%",
    });
    return rows;
  }, []);

  const objectiveAnalyses = analyses.filter((analysis) => analysis.question.tipo !== "disc");
  summary.push({
    key: "total",
    label: "Total",
    correct: objectiveAnalyses.filter((analysis) =>
      ["correct", "annulled"].includes(analysis.result.statusKey),
    ).length,
    incorrect: objectiveAnalyses.filter((analysis) => analysis.result.statusKey === "incorrect")
      .length,
    blank: objectiveAnalyses.filter((analysis) => analysis.result.statusKey === "blank").length,
    achievement: `${percentage}%`,
  });

  return {
    score,
    maximum,
    percentage,
    validClassCorrections: validStudentIds.size,
    summary,
    questions: analyses,
  };
}

export function evaluateFeedbackQuestion(
  question: FeedbackQuestion,
  response: FeedbackResponse | undefined,
): FeedbackQuestionResult {
  if (question.anulada) {
    return {
      answer: response?.resposta?.trim() || "Em branco",
      expected: "Questão anulada",
      points: Number(question.valor),
      status: "Anulada",
      statusKey: "annulled",
      feedback: question.tipo === "disc" ? response?.feedback || "" : "",
    };
  }

  if (question.tipo === "disc") {
    const hasManualScore = response?.nota_manual != null;
    const manual = hasManualScore
      ? clamp(Number(response.nota_manual), 0, Number(question.valor))
      : 0;
    return {
      answer: response?.resposta?.trim() || "Em branco",
      expected: question.resposta_modelo?.trim() || "",
      points: manual,
      status: hasManualScore ? "Corrigida manualmente" : "Aguardando correção",
      statusKey: hasManualScore ? "manual" : "pending",
      feedback: response?.feedback || "",
    };
  }

  const rawAnswer = response?.resposta?.trim() || "";
  const expected = question.gabarito?.trim().toUpperCase() || "Não informado";
  if (!rawAnswer) {
    return {
      answer: "Em branco",
      expected,
      points: 0,
      status: "Em branco",
      statusKey: "blank",
      feedback: "",
    };
  }

  const correct = rawAnswer.toUpperCase() === expected;
  return {
    answer: rawAnswer,
    expected,
    points: correct ? Number(question.valor) : -Number(question.desconto_erro || 0),
    status: correct ? "Correta" : "Incorreta",
    statusKey: correct ? "correct" : "incorrect",
    feedback: "",
  };
}

function buildDistribution(
  question: FeedbackQuestion,
  classResponses: FeedbackResponse[],
  validStudentIds: Set<string>,
): { available: boolean; rows: FeedbackDistributionRow[] } {
  if (question.tipo === "disc" || question.anulada || validStudentIds.size === 0) {
    return { available: false, rows: [] };
  }

  const byStudent = new Map(
    classResponses
      .filter((response) => response.questao_id === question.id)
      .map((response) => [response.aluno_id, response]),
  );
  const answers = Array.from(validStudentIds, (studentId) => byStudent.get(studentId));
  const denominator = validStudentIds.size;

  if (question.tipo === "num") {
    const correct = answers.filter(
      (response) => evaluateFeedbackQuestion(question, response).statusKey === "correct",
    ).length;
    const incorrect = answers.filter(
      (response) => evaluateFeedbackQuestion(question, response).statusKey === "incorrect",
    ).length;
    const blank = denominator - correct - incorrect;
    return {
      available: true,
      rows: [
        distributionRow("Acertaram", correct, denominator, "green"),
        distributionRow("Erraram", incorrect, denominator, "red"),
        distributionRow("Em branco", blank, denominator, "orange"),
      ],
    };
  }

  const options =
    question.tipo === "ce"
      ? ["C", "E"]
      : Array.from({ length: clamp(question.qtd_alternativas ?? 5, 2, 7) }, (_, index) =>
          String.fromCharCode(65 + index),
        );
  const palette: FeedbackChartTone[] = ["blue", "orange", "purple", "red", "gray"];
  const expected = question.gabarito?.trim().toUpperCase();
  const rows = options.map((option, index) => {
    const count = answers.filter(
      (response) => response?.resposta?.trim().toUpperCase() === option,
    ).length;
    return distributionRow(
      option,
      count,
      denominator,
      option === expected ? "green" : palette[index % palette.length],
    );
  });
  const blank = answers.filter((response) => !response?.resposta?.trim()).length;
  if (blank > 0) rows.push(distributionRow("Em branco", blank, denominator, "orange"));
  return { available: true, rows };
}

function distributionRow(
  label: string,
  count: number,
  denominator: number,
  tone: FeedbackChartTone,
): FeedbackDistributionRow {
  return {
    label,
    count,
    percent: denominator > 0 ? Math.round((count / denominator) * 100) : 0,
    tone,
  };
}

export function questionTypeLabel(type: FeedbackQuestionType): string {
  if (type === "mc") return "Múltipla escolha";
  if (type === "ce") return "Certo/Errado";
  if (type === "num") return "Numérica";
  return "Discursiva";
}

function formatDecimal(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(roundScore(value));
}

function roundScore(value: number): number {
  return Math.round(value * 100) / 100;
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) return minimum;
  return Math.min(maximum, Math.max(minimum, value));
}
