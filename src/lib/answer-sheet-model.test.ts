import assert from "node:assert/strict";
import test from "node:test";

import { restoreAnswerSheetModel } from "@/lib/answer-sheet-model";
import type { Avaliacao, ModeloFolhaResposta } from "@/lib/domain";

const assessment: Avaliacao = {
  id: "assessment-1",
  titulo: "Teste atual",
  disciplina: "Física",
  turma_id: "class-1",
  data_aplicacao: null,
  valor_total: 1,
  instrucoes: null,
  status: "elaboracao",
  created_at: "2026-07-17T00:00:00.000Z",
};

test("restores layout and identification from the saved model", () => {
  const model = {
    id: "model-3",
    avaliacao_id: assessment.id,
    versao: 3,
    colunas: 4,
    linhas_por_coluna: 20,
    orientacao: "landscape",
    created_at: "2026-07-17T00:00:00.000Z",
    snapshot: {
      identificacao: { modo: "blank", digitos: 8 },
      avaliacao: {
        titulo: assessment.titulo,
        disciplina: assessment.disciplina,
        turmaId: assessment.turma_id,
        valorTotal: assessment.valor_total,
      },
      questoes: [
        {
          id: "question-1",
          numero: 1,
          tipo: "ce",
          qtdAlternativas: 2,
          numDigitos: null,
          gabarito: "C",
          valor: 1,
          descontoErro: 0,
          anulada: false,
          conteudo: null,
        },
      ],
    },
  } as ModeloFolhaResposta;

  const restored = restoreAnswerSheetModel(model, assessment);

  assert.deepEqual(restored.layout, {
    columns: 4,
    rowsPerColumn: 20,
    orientation: "landscape",
  });
  assert.deepEqual(restored.identification, { mode: "blank", digits: 8 });
});
