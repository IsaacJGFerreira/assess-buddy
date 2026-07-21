export type GradingQuestion = {
  id: string;
  tipo: "mc" | "ce" | "num" | "disc";
  gabarito: string | null;
  valor: number;
  desconto_erro: number;
  anulada: boolean;
};

export type GradingResponse = {
  id?: string;
  avaliacao_id?: string;
  aluno_id?: string;
  questao_id: string;
  resposta: string | null;
  nota_manual?: number | null;
};

export type Situacao = "correta" | "incorreta" | "branco" | "anulada";

export function corrigirQuestao(
  question: GradingQuestion,
  answer: string | null | undefined,
): { situacao: Situacao; pontos: number } {
  if (question.anulada) return { situacao: "anulada", pontos: Number(question.valor) };
  if (question.tipo === "disc") return { situacao: "branco", pontos: 0 };

  const normalizedAnswer = (answer ?? "").trim();
  if (!normalizedAnswer) return { situacao: "branco", pontos: 0 };

  const answerKey = (question.gabarito ?? "").trim().toUpperCase();
  if (!answerKey) return { situacao: "incorreta", pontos: 0 };

  return normalizedAnswer.toUpperCase() === answerKey
    ? { situacao: "correta", pontos: Number(question.valor) }
    : { situacao: "incorreta", pontos: -Number(question.desconto_erro ?? 0) };
}

export function calcularNotaAluno(
  questions: GradingQuestion[],
  responses: GradingResponse[],
): { nota: number; acertos: number; erros: number; branco: number; anuladas: number } {
  const responseByQuestion = new Map(responses.map((response) => [response.questao_id, response]));
  let nota = 0;
  let acertos = 0;
  let erros = 0;
  let branco = 0;
  let anuladas = 0;

  for (const question of questions) {
    const response = responseByQuestion.get(question.id);
    if (question.tipo === "disc" && !question.anulada) {
      if (response?.nota_manual == null) {
        branco += 1;
      } else {
        nota += Math.min(Number(question.valor), Math.max(0, Number(response.nota_manual)));
      }
      continue;
    }

    const { situacao, pontos } = corrigirQuestao(question, response?.resposta);
    nota += pontos;
    if (situacao === "correta") acertos += 1;
    else if (situacao === "incorreta") erros += 1;
    else if (situacao === "branco") branco += 1;
    else anuladas += 1;
  }

  return {
    nota: Math.round(nota * 100) / 100,
    acertos,
    erros,
    branco,
    anuladas,
  };
}
