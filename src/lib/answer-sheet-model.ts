import type { AnswerSheetLayout } from "@/lib/answer-sheet-layout";
import {
  clampIdentifierDigits,
  DEFAULT_IDENTIFIER_DIGITS,
  type AnswerSheetIdentificationMode,
} from "@/lib/answer-sheet-identification";
import type { Avaliacao, ModeloFolhaResposta, Questao, TipoQuestao } from "@/lib/domain";

export interface RestoredAnswerSheetModel {
  avaliacao: Avaliacao;
  questoes: Questao[];
  layout: AnswerSheetLayout;
  identification: {
    mode: AnswerSheetIdentificationMode;
    digits: number;
  };
}

export function restoreAnswerSheetModel(
  model: ModeloFolhaResposta,
  currentAssessment: Avaliacao,
): RestoredAnswerSheetModel {
  const snapshot = asRecord(model.snapshot);
  const assessmentSnapshot = asRecord(snapshot?.avaliacao);
  const identificationSnapshot = asRecord(snapshot?.identificacao);
  const questionSnapshots = Array.isArray(snapshot?.questoes) ? snapshot.questoes : null;
  if (!snapshot || !assessmentSnapshot || !questionSnapshots) {
    throw new Error(`O snapshot da versão ${model.versao} está incompleto.`);
  }

  const questions = questionSnapshots.map((value, index): Questao => {
    const question = asRecord(value);
    const type = question?.tipo;
    if (
      !question ||
      typeof question.id !== "string" ||
      !isQuestionType(type) ||
      !Number.isFinite(Number(question.numero))
    ) {
      throw new Error(`A questão ${index + 1} da versão ${model.versao} está inválida.`);
    }
    return {
      id: question.id,
      avaliacao_id: model.avaliacao_id,
      numero: Number(question.numero),
      tipo: type,
      qtd_alternativas: nullableNumber(question.qtdAlternativas),
      num_digitos: nullableNumber(question.numDigitos),
      gabarito: nullableString(question.gabarito),
      valor: Number.isFinite(Number(question.valor)) ? Number(question.valor) : 0,
      desconto_erro: Number.isFinite(Number(question.descontoErro))
        ? Number(question.descontoErro)
        : 0,
      anulada: question.anulada === true,
      conteudo: nullableString(question.conteudo),
    };
  });

  return {
    avaliacao: {
      ...currentAssessment,
      titulo: stringOrFallback(assessmentSnapshot.titulo, currentAssessment.titulo),
      disciplina: nullableString(assessmentSnapshot.disciplina),
      turma_id: nullableString(assessmentSnapshot.turmaId),
      data_aplicacao: nullableString(assessmentSnapshot.dataAplicacao),
      valor_total: Number.isFinite(Number(assessmentSnapshot.valorTotal))
        ? Number(assessmentSnapshot.valorTotal)
        : currentAssessment.valor_total,
      instrucoes: nullableString(assessmentSnapshot.instrucoes),
    },
    questoes: questions.sort((left, right) => left.numero - right.numero),
    layout: {
      columns: model.colunas,
      rowsPerColumn: model.linhas_por_coluna,
      orientation: model.orientacao,
    },
    identification: {
      mode: isIdentificationMode(identificationSnapshot?.modo)
        ? identificationSnapshot.modo
        : "none",
      digits: clampIdentifierDigits(
        Number.isFinite(Number(identificationSnapshot?.digitos))
          ? Number(identificationSnapshot?.digitos)
          : DEFAULT_IDENTIFIER_DIGITS,
      ),
    },
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isQuestionType(value: unknown): value is TipoQuestao {
  return value === "mc" || value === "ce" || value === "num";
}

function isIdentificationMode(value: unknown): value is AnswerSheetIdentificationMode {
  return value === "none" || value === "blank" || value === "prefilled";
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined || !Number.isFinite(Number(value))
    ? null
    : Number(value);
}

function nullableString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function stringOrFallback(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}
