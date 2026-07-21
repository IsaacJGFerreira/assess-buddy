import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildAssessmentReport } from "./assessment-report";
import type { Aluno, Questao, Resposta } from "./domain";

const students: Aluno[] = [
  { id: "a1", turma_id: "t1", nome: "Ana", matricula: "1", chamada: null },
  { id: "a2", turma_id: "t1", nome: "Bia", matricula: "2", chamada: null },
];

const questions: Questao[] = [
  {
    id: "q1",
    avaliacao_id: "av1",
    numero: 1,
    tipo: "mc",
    qtd_alternativas: 4,
    num_digitos: null,
    gabarito: "A",
    valor: 2,
    desconto_erro: 0,
    anulada: false,
    conteudo: null,
  },
  {
    id: "q2",
    avaliacao_id: "av1",
    numero: 2,
    tipo: "mc",
    qtd_alternativas: 4,
    num_digitos: null,
    gabarito: "B",
    valor: 3,
    desconto_erro: 0,
    anulada: false,
    conteudo: null,
  },
];

const responses: Resposta[] = [
  { id: "r1", aluno_id: "a1", questao_id: "q1", resposta: "A" },
  { id: "r2", aluno_id: "a1", questao_id: "q2", resposta: "B" },
  { id: "r3", aluno_id: "a2", questao_id: "q1", resposta: "C" },
];

describe("buildAssessmentReport", () => {
  it("calcula a mesma nota compartilhada e os indicadores da turma", () => {
    const report = buildAssessmentReport(questions, students, responses);

    assert.deepEqual(
      report.studentResults.map(({ aluno, nota }) => [aluno.nome, nota]),
      [
        ["Ana", 5],
        ["Bia", 0],
      ],
    );
    assert.equal(report.summary.average, 2.5);
    assert.equal(report.summary.median, 2.5);
    assert.equal(report.summary.highest, 5);
    assert.equal(report.summary.lowest, 0);
    assert.deepEqual(
      report.questionResults.map(({ correct, total, percent }) => ({ correct, total, percent })),
      [
        { correct: 1, total: 2, percent: 50 },
        { correct: 1, total: 1, percent: 100 },
      ],
    );
  });

  it("retorna indicadores zerados quando a turma está vazia", () => {
    const report = buildAssessmentReport(questions, [], []);

    assert.deepEqual(report.summary, { average: 0, median: 0, highest: 0, lowest: 0 });
    assert.deepEqual(report.studentResults, []);
  });
});
