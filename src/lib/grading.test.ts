import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { calcularNotaAluno } from "./assessment-grading";
import type { Questao, Resposta } from "./domain";

describe("shared grading", () => {
  it("inclui notas discursivas manuais sem duplicar a lógica entre web e Android", () => {
    const questions: Questao[] = [
      {
        id: "q1",
        avaliacao_id: "a1",
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
        avaliacao_id: "a1",
        numero: 2,
        tipo: "disc",
        qtd_alternativas: null,
        num_digitos: null,
        gabarito: null,
        valor: 3,
        desconto_erro: 0,
        anulada: false,
        conteudo: null,
      },
    ];
    const responses: Resposta[] = [
      { id: "r1", aluno_id: "s1", questao_id: "q1", resposta: "A" },
      {
        id: "r2",
        aluno_id: "s1",
        questao_id: "q2",
        resposta: "Texto",
        nota_manual: 2.5,
      },
    ];

    assert.equal(calcularNotaAluno(questions, responses).nota, 4.5);
  });

  it("limita a nota manual ao valor da questão", () => {
    const question: Questao = {
      id: "q1",
      avaliacao_id: "a1",
      numero: 1,
      tipo: "disc",
      qtd_alternativas: null,
      num_digitos: null,
      gabarito: null,
      valor: 2,
      desconto_erro: 0,
      anulada: false,
      conteudo: null,
    };

    assert.equal(
      calcularNotaAluno(
        [question],
        [
          {
            id: "r1",
            aluno_id: "s1",
            questao_id: "q1",
            resposta: null,
            nota_manual: 5,
          },
        ],
      ).nota,
      2,
    );
  });
});
