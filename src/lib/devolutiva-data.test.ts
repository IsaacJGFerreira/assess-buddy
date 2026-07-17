import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFeedbackAnalysis,
  type FeedbackQuestion,
  type FeedbackResponse,
} from "@/lib/devolutiva-data";
import { renderFeedbackQuestionCard } from "@/lib/devolutiva-pdf-card";

const questions: FeedbackQuestion[] = [
  question("q1", 1, "mc", "A", 1),
  question("q2", 2, "mc", "C", 1),
  question("q3", 3, "ce", "C", 1),
  question("q4", 4, "num", "42", 2),
  {
    ...question("q5", 5, "disc", null, 1),
    resposta_modelo: "O aluno deve justificar o raciocínio.",
    orientacao_correcao: "**Observe** a organização da resposta.",
  },
];

const studentResponses: FeedbackResponse[] = [
  response("a1", "q1", "A"),
  response("a1", "q2", "B"),
  response("a1", "q3", null),
  response("a1", "q4", "42"),
  {
    ...response("a1", "q5", "Texto do aluno"),
    nota_manual: 0.2,
    feedback: "Revise a **conclusão**.",
  },
];

const classResponses: FeedbackResponse[] = [
  ...studentResponses,
  response("a2", "q1", "A"),
  response("a2", "q2", "C"),
  response("a2", "q3", "C"),
  response("a2", "q4", "40"),
  response("a3", "q1", "B"),
  response("a3", "q2", "C"),
  response("a3", "q3", "E"),
  response("a3", "q4", null),
];

test("calculates score, per-type summary and real class distributions", () => {
  const analysis = buildFeedbackAnalysis({
    questions,
    responses: studentResponses,
    classResponses,
    maximumOverride: 6,
  });

  assert.equal(analysis.score, 3.2);
  assert.equal(analysis.maximum, 6);
  assert.equal(analysis.percentage, 53);
  assert.equal(analysis.validClassCorrections, 3);

  assert.deepEqual(
    analysis.summary.map((row) => row.key),
    ["mc", "ce", "num", "disc", "total"],
  );
  assert.deepEqual(analysis.summary[0], {
    key: "mc",
    label: "Múltipla escolha",
    correct: 1,
    incorrect: 1,
    blank: 0,
    achievement: "50%",
  });
  assert.equal(analysis.summary[3].achievement, "0,2 / 1");
  assert.equal(analysis.summary[4].achievement, "53%");

  assert.deepEqual(
    analysis.questions[0].distribution.map(({ label, percent }) => ({ label, percent })),
    [
      { label: "A", percent: 67 },
      { label: "B", percent: 33 },
      { label: "C", percent: 0 },
      { label: "D", percent: 0 },
      { label: "E", percent: 0 },
    ],
  );
  assert.deepEqual(
    analysis.questions[3].distribution.map(({ label, percent }) => ({ label, percent })),
    [
      { label: "Acertaram", percent: 33 },
      { label: "Erraram", percent: 33 },
      { label: "Em branco", percent: 33 },
    ],
  );
});

test("renders a complete discursive card with model answer and formatted comments", () => {
  const analysis = buildFeedbackAnalysis({
    questions,
    responses: studentResponses,
    classResponses,
  });
  const html = renderFeedbackQuestionCard(analysis.questions[4]);

  assert.match(html, /Questão 5/);
  assert.match(html, /Corrigida manualmente/);
  assert.match(html, /0,2 de 1/);
  assert.match(html, /O aluno deve justificar o raciocínio/);
  assert.match(html, /<strong>Observe<\/strong>/);
  assert.match(html, /<strong>conclusão<\/strong>/);
});

test("marks the numerical distribution for its wider labels", () => {
  const analysis = buildFeedbackAnalysis({
    questions,
    responses: studentResponses,
    classResponses,
  });
  const html = renderFeedbackQuestionCard(analysis.questions[3]);

  assert.match(html, /feedback-pdf-distribution-num/);
  assert.match(html, /Acertaram/);
  assert.match(html, /Erraram/);
  assert.match(html, /Em branco/);
});

test("does not generate class statistics for an annulled question", () => {
  const annulled = { ...question("qa", 1, "mc", "A", 1), anulada: true };
  const analysis = buildFeedbackAnalysis({
    questions: [annulled],
    responses: [response("a1", "qa", "B")],
    classResponses: [response("a1", "qa", "B"), response("a2", "qa", "A")],
  });

  assert.equal(analysis.questions[0].result.statusKey, "annulled");
  assert.equal(analysis.questions[0].distributionAvailable, false);
  assert.match(
    renderFeedbackQuestionCard(analysis.questions[0]),
    /Estatísticas não se aplicam à questão anulada/,
  );
});

function question(
  id: string,
  numero: number,
  tipo: FeedbackQuestion["tipo"],
  gabarito: string | null,
  valor: number,
): FeedbackQuestion {
  return {
    id,
    numero,
    tipo,
    qtd_alternativas: 5,
    num_digitos: tipo === "num" ? 2 : null,
    gabarito,
    valor,
    desconto_erro: 0,
    anulada: false,
    conteudo: null,
  };
}

function response(
  alunoId: string,
  questaoId: string,
  resposta: string | null,
): FeedbackResponse {
  return {
    aluno_id: alunoId,
    questao_id: questaoId,
    resposta,
    nota_manual: null,
    feedback: null,
  };
}
