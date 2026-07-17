import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";

import { AnswerSheet } from "@/components/answer-sheet";
import type { AnswerSheetIdentificationMode } from "@/lib/answer-sheet-identification";
import type { Aluno, Avaliacao, Questao } from "@/lib/domain";

const assessment: Avaliacao = {
  id: "assessment-1",
  titulo: "Teste",
  disciplina: "Física",
  turma_id: "class-1",
  data_aplicacao: null,
  valor_total: 1,
  instrucoes: null,
  status: "elaboracao",
  created_at: "2026-07-17T00:00:00.000Z",
};

const student: Aluno = {
  id: "student-1",
  turma_id: "class-1",
  nome: "Ana Souza",
  matricula: "123456",
  chamada: 1,
};

const questions: Questao[] = [
  {
    id: "question-1",
    avaliacao_id: assessment.id,
    numero: 1,
    tipo: "mc",
    qtd_alternativas: 5,
    num_digitos: null,
    gabarito: "A",
    valor: 1,
    desconto_erro: 0,
    anulada: false,
    conteudo: null,
  },
];

function render(mode: AnswerSheetIdentificationMode): string {
  return renderToStaticMarkup(
    <AnswerSheet
      avaliacao={assessment}
      questoes={questions}
      aluno={mode === "prefilled" ? student : null}
      layout={{ columns: 2, rowsPerColumn: 35, orientation: "portrait" }}
      identificationMode={mode}
      identifierDigits={6}
    />,
  );
}

function occurrences(value: string, fragment: string): number {
  return value.split(fragment).length - 1;
}

test("keeps markers and question geometry stable in every identification mode", () => {
  const sheets = {
    none: render("none"),
    blank: render("blank"),
    prefilled: render("prefilled"),
  };

  for (const html of Object.values(sheets)) {
    assert.equal(occurrences(html, "answer-sheet-marker"), 4);
    assert.equal(occurrences(html, "answer-sheet-identifier-card"), 1);
    assert.equal(occurrences(html, 'style="width:39.4mm"'), 1);
    assert.equal(occurrences(html, 'data-omr-question-id="question-1"'), 5);
  }

  assert.match(sheets.none, /answer-sheet-identifier-card is-placeholder/);
  assert.equal(occurrences(sheets.none, 'data-omr-question-id="__matricula__"'), 0);
  assert.equal(occurrences(sheets.blank, 'data-omr-question-id="__matricula__"'), 60);
  assert.equal(occurrences(sheets.prefilled, 'data-omr-question-id="__matricula__"'), 60);
  assert.match(sheets.prefilled, /Ana Souza/);
});
