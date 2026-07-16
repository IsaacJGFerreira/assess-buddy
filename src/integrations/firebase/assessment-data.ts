import {
  StatusAvaliacao as DataConnectStatusAvaliacao,
  TipoQuestao as DataConnectTipoQuestao,
  atualizarAvaliacaoComTurma,
  atualizarAvaliacaoSemTurma,
  atualizarQuestao,
  criarAvaliacaoComTurma,
  criarAvaliacaoSemTurma,
  criarQuestao,
  excluirAvaliacao,
  excluirQuestao,
  listarMinhasAvaliacoes,
  listarMinhasQuestoes,
  obterMinhaAvaliacao,
  obterMinhaQuestao,
} from "@assess-buddy/dataconnect";

import { getFirebaseDataConnect } from "./dataconnect";

export type FirebaseStatusAvaliacao =
  "elaboracao" | "pronta" | "aplicada" | "em_correcao" | "corrigida" | "devolvida";

export type FirebaseTipoQuestao = "mc" | "ce" | "num" | "disc";

export interface FirebaseTurmaResumo {
  id: string;
  nome: string;
  serie: string | null;
  ano: number | null;
}

export interface FirebaseAvaliacao {
  id: string;
  turmaId: string | null;
  titulo: string;
  disciplina: string | null;
  dataAplicacao: string | null;
  valorTotal: number;
  instrucoes: string | null;
  comentarioDevolutiva: string | null;
  status: FirebaseStatusAvaliacao;
  createdAt: string;
  updatedAt: string;
  turma: FirebaseTurmaResumo | null;
}

export interface FirebaseQuestao {
  id: string;
  avaliacaoId: string;
  numero: number;
  tipo: FirebaseTipoQuestao;
  qtdAlternativas: number | null;
  numDigitos: number | null;
  gabarito: string | null;
  valor: number;
  descontoErro: number;
  anulada: boolean;
  conteudo: string | null;
  orientacaoCorrecao: string | null;
  respostaModelo: string | null;
  respostaModeloImagemPath: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalvarAvaliacaoInput {
  turmaId?: string | null;
  titulo: string;
  disciplina?: string | null;
  dataAplicacao?: string | null;
  valorTotal: number;
  instrucoes?: string | null;
  comentarioDevolutiva?: string | null;
  status: FirebaseStatusAvaliacao;
}

export interface AtualizarAvaliacaoInput extends SalvarAvaliacaoInput {
  id: string;
}

export interface CriarQuestaoInput {
  avaliacaoId: string;
  numero: number;
  tipo: FirebaseTipoQuestao;
  qtdAlternativas?: number | null;
  numDigitos?: number | null;
  gabarito?: string | null;
  valor: number;
  descontoErro: number;
  anulada: boolean;
  conteudo?: string | null;
  orientacaoCorrecao?: string | null;
  respostaModelo?: string | null;
  respostaModeloImagemPath?: string | null;
}

export interface AtualizarQuestaoInput extends Omit<CriarQuestaoInput, "avaliacaoId"> {
  id: string;
}

const STATUS_TO_DATA_CONNECT: Record<FirebaseStatusAvaliacao, DataConnectStatusAvaliacao> = {
  elaboracao: DataConnectStatusAvaliacao.ELABORACAO,
  pronta: DataConnectStatusAvaliacao.PRONTA,
  aplicada: DataConnectStatusAvaliacao.APLICADA,
  em_correcao: DataConnectStatusAvaliacao.EM_CORRECAO,
  corrigida: DataConnectStatusAvaliacao.CORRIGIDA,
  devolvida: DataConnectStatusAvaliacao.DEVOLVIDA,
};

const STATUS_FROM_DATA_CONNECT: Record<DataConnectStatusAvaliacao, FirebaseStatusAvaliacao> = {
  [DataConnectStatusAvaliacao.ELABORACAO]: "elaboracao",
  [DataConnectStatusAvaliacao.PRONTA]: "pronta",
  [DataConnectStatusAvaliacao.APLICADA]: "aplicada",
  [DataConnectStatusAvaliacao.EM_CORRECAO]: "em_correcao",
  [DataConnectStatusAvaliacao.CORRIGIDA]: "corrigida",
  [DataConnectStatusAvaliacao.DEVOLVIDA]: "devolvida",
};

const TIPO_TO_DATA_CONNECT: Record<FirebaseTipoQuestao, DataConnectTipoQuestao> = {
  mc: DataConnectTipoQuestao.MULTIPLA_ESCOLHA,
  ce: DataConnectTipoQuestao.CERTO_ERRADO,
  num: DataConnectTipoQuestao.NUMERICA,
  disc: DataConnectTipoQuestao.DISCURSIVA,
};

const TIPO_FROM_DATA_CONNECT: Record<DataConnectTipoQuestao, FirebaseTipoQuestao> = {
  [DataConnectTipoQuestao.MULTIPLA_ESCOLHA]: "mc",
  [DataConnectTipoQuestao.CERTO_ERRADO]: "ce",
  [DataConnectTipoQuestao.NUMERICA]: "num",
  [DataConnectTipoQuestao.DISCURSIVA]: "disc",
};

export async function listarAvaliacoesFirebase(): Promise<FirebaseAvaliacao[]> {
  const result = await listarMinhasAvaliacoes(getFirebaseDataConnect());

  return result.data.avaliacoes.map(mapAvaliacao);
}

export async function obterAvaliacaoFirebase(id: string): Promise<FirebaseAvaliacao | null> {
  const result = await obterMinhaAvaliacao(getFirebaseDataConnect(), {
    id: normalizeRequiredText(id, "Avaliação inválida."),
  });
  const avaliacao = result.data.avaliacoes[0];

  return avaliacao ? mapAvaliacao(avaliacao) : null;
}

export async function criarAvaliacaoFirebase(
  input: SalvarAvaliacaoInput,
): Promise<FirebaseAvaliacao> {
  const normalized = normalizeAvaliacaoInput(input);
  const dataConnect = getFirebaseDataConnect();

  const result = normalized.turmaId
    ? await criarAvaliacaoComTurma(dataConnect, {
        turmaId: normalized.turmaId,
        titulo: normalized.titulo,
        disciplina: normalized.disciplina,
        dataAplicacao: normalized.dataAplicacao,
        valorTotal: normalized.valorTotal,
        instrucoes: normalized.instrucoes,
        comentarioDevolutiva: normalized.comentarioDevolutiva,
        status: STATUS_TO_DATA_CONNECT[normalized.status],
      })
    : await criarAvaliacaoSemTurma(dataConnect, {
        titulo: normalized.titulo,
        disciplina: normalized.disciplina,
        dataAplicacao: normalized.dataAplicacao,
        valorTotal: normalized.valorTotal,
        instrucoes: normalized.instrucoes,
        comentarioDevolutiva: normalized.comentarioDevolutiva,
        status: STATUS_TO_DATA_CONNECT[normalized.status],
      });

  const id = "avaliacao_insert" in result.data ? result.data.avaliacao_insert.id : null;

  if (!id) {
    throw new Error("A avaliação não pôde ser criada.");
  }

  const avaliacao = await obterAvaliacaoFirebase(id);

  if (!avaliacao) {
    throw new Error("A avaliação foi criada, mas não pôde ser carregada.");
  }

  return avaliacao;
}

export async function atualizarAvaliacaoFirebase(
  input: AtualizarAvaliacaoInput,
): Promise<FirebaseAvaliacao> {
  const id = normalizeRequiredText(input.id, "Avaliação inválida.");
  const normalized = normalizeAvaliacaoInput(input);
  const dataConnect = getFirebaseDataConnect();

  const result = normalized.turmaId
    ? await atualizarAvaliacaoComTurma(dataConnect, {
        id,
        turmaId: normalized.turmaId,
        titulo: normalized.titulo,
        disciplina: normalized.disciplina,
        dataAplicacao: normalized.dataAplicacao,
        valorTotal: normalized.valorTotal,
        instrucoes: normalized.instrucoes,
        comentarioDevolutiva: normalized.comentarioDevolutiva,
        status: STATUS_TO_DATA_CONNECT[normalized.status],
      })
    : await atualizarAvaliacaoSemTurma(dataConnect, {
        id,
        titulo: normalized.titulo,
        disciplina: normalized.disciplina,
        dataAplicacao: normalized.dataAplicacao,
        valorTotal: normalized.valorTotal,
        instrucoes: normalized.instrucoes,
        comentarioDevolutiva: normalized.comentarioDevolutiva,
        status: STATUS_TO_DATA_CONNECT[normalized.status],
      });

  const updated = "avaliacao_update" in result.data ? result.data.avaliacao_update : null;

  if (!updated) {
    throw new Error("Avaliação não encontrada ou sem permissão para alteração.");
  }

  const avaliacao = await obterAvaliacaoFirebase(id);

  if (!avaliacao) {
    throw new Error("A avaliação foi atualizada, mas não pôde ser carregada.");
  }

  return avaliacao;
}

export async function excluirAvaliacaoFirebase(id: string): Promise<void> {
  const result = await excluirAvaliacao(getFirebaseDataConnect(), {
    id: normalizeRequiredText(id, "Avaliação inválida."),
  });

  if (!result.data.avaliacao_delete) {
    throw new Error("Avaliação não encontrada ou sem permissão para exclusão.");
  }
}

export async function listarQuestoesFirebase(avaliacaoId: string): Promise<FirebaseQuestao[]> {
  const result = await listarMinhasQuestoes(getFirebaseDataConnect(), {
    avaliacaoId: normalizeRequiredText(avaliacaoId, "Avaliação inválida."),
  });

  return result.data.questoes.map(mapQuestao);
}

export async function obterQuestaoFirebase(id: string): Promise<FirebaseQuestao | null> {
  const result = await obterMinhaQuestao(getFirebaseDataConnect(), {
    id: normalizeRequiredText(id, "Questão inválida."),
  });
  const questao = result.data.questoes[0];

  return questao ? mapQuestao(questao) : null;
}

export async function criarQuestaoFirebase(input: CriarQuestaoInput): Promise<FirebaseQuestao> {
  const normalized = normalizeQuestaoInput(input);

  const result = await criarQuestao(getFirebaseDataConnect(), {
    avaliacaoId: normalizeRequiredText(input.avaliacaoId, "Avaliação inválida."),
    numero: normalized.numero,
    tipo: TIPO_TO_DATA_CONNECT[normalized.tipo],
    qtdAlternativas: normalized.qtdAlternativas,
    numDigitos: normalized.numDigitos,
    gabarito: normalized.gabarito,
    valor: normalized.valor,
    descontoErro: normalized.descontoErro,
    anulada: normalized.anulada,
    conteudo: normalized.conteudo,
    orientacaoCorrecao: normalized.orientacaoCorrecao,
    respostaModelo: normalized.respostaModelo,
    respostaModeloImagemPath: normalized.respostaModeloImagemPath,
  });

  const questao = await obterQuestaoFirebase(result.data.questao_insert.id);

  if (!questao) {
    throw new Error("A questão foi criada, mas não pôde ser carregada.");
  }

  return questao;
}

export async function criarQuestoesFirebase(
  inputs: CriarQuestaoInput[],
): Promise<FirebaseQuestao[]> {
  const questoes: FirebaseQuestao[] = [];

  for (const input of inputs) {
    questoes.push(await criarQuestaoFirebase(input));
  }

  return questoes;
}

export async function atualizarQuestaoFirebase(
  input: AtualizarQuestaoInput,
): Promise<FirebaseQuestao> {
  const id = normalizeRequiredText(input.id, "Questão inválida.");
  const normalized = normalizeQuestaoInput(input);

  const result = await atualizarQuestao(getFirebaseDataConnect(), {
    id,
    numero: normalized.numero,
    tipo: TIPO_TO_DATA_CONNECT[normalized.tipo],
    qtdAlternativas: normalized.qtdAlternativas,
    numDigitos: normalized.numDigitos,
    gabarito: normalized.gabarito,
    valor: normalized.valor,
    descontoErro: normalized.descontoErro,
    anulada: normalized.anulada,
    conteudo: normalized.conteudo,
    orientacaoCorrecao: normalized.orientacaoCorrecao,
    respostaModelo: normalized.respostaModelo,
    respostaModeloImagemPath: normalized.respostaModeloImagemPath,
  });

  if (!result.data.questao_update) {
    throw new Error("Questão não encontrada ou sem permissão para alteração.");
  }

  const questao = await obterQuestaoFirebase(id);

  if (!questao) {
    throw new Error("A questão foi atualizada, mas não pôde ser carregada.");
  }

  return questao;
}

export async function excluirQuestaoFirebase(id: string): Promise<void> {
  const result = await excluirQuestao(getFirebaseDataConnect(), {
    id: normalizeRequiredText(id, "Questão inválida."),
  });

  if (!result.data.questao_delete) {
    throw new Error("Questão não encontrada ou sem permissão para exclusão.");
  }
}

function mapAvaliacao(avaliacao: {
  id: string;
  turmaId?: string | null;
  titulo: string;
  disciplina?: string | null;
  dataAplicacao?: string | null;
  valorTotal: number;
  instrucoes?: string | null;
  comentarioDevolutiva?: string | null;
  status: DataConnectStatusAvaliacao;
  createdAt: string;
  updatedAt: string;
  turma?: {
    id: string;
    nome: string;
    serie?: string | null;
    ano?: number | null;
  } | null;
}): FirebaseAvaliacao {
  return {
    id: avaliacao.id,
    turmaId: avaliacao.turmaId ?? null,
    titulo: avaliacao.titulo,
    disciplina: avaliacao.disciplina ?? null,
    dataAplicacao: avaliacao.dataAplicacao ?? null,
    valorTotal: Number(avaliacao.valorTotal),
    instrucoes: avaliacao.instrucoes ?? null,
    comentarioDevolutiva: avaliacao.comentarioDevolutiva ?? null,
    status: STATUS_FROM_DATA_CONNECT[avaliacao.status],
    createdAt: avaliacao.createdAt,
    updatedAt: avaliacao.updatedAt,
    turma: avaliacao.turma
      ? {
          id: avaliacao.turma.id,
          nome: avaliacao.turma.nome,
          serie: avaliacao.turma.serie ?? null,
          ano: avaliacao.turma.ano ?? null,
        }
      : null,
  };
}

function mapQuestao(questao: {
  id: string;
  avaliacaoId: string;
  numero: number;
  tipo: DataConnectTipoQuestao;
  qtdAlternativas?: number | null;
  numDigitos?: number | null;
  gabarito?: string | null;
  valor: number;
  descontoErro: number;
  anulada: boolean;
  conteudo?: string | null;
  orientacaoCorrecao?: string | null;
  respostaModelo?: string | null;
  respostaModeloImagemPath?: string | null;
  createdAt: string;
  updatedAt: string;
}): FirebaseQuestao {
  return {
    id: questao.id,
    avaliacaoId: questao.avaliacaoId,
    numero: questao.numero,
    tipo: TIPO_FROM_DATA_CONNECT[questao.tipo],
    qtdAlternativas: questao.qtdAlternativas ?? null,
    numDigitos: questao.numDigitos ?? null,
    gabarito: questao.gabarito ?? null,
    valor: Number(questao.valor),
    descontoErro: Number(questao.descontoErro),
    anulada: questao.anulada,
    conteudo: questao.conteudo ?? null,
    orientacaoCorrecao: questao.orientacaoCorrecao ?? null,
    respostaModelo: questao.respostaModelo ?? null,
    respostaModeloImagemPath: questao.respostaModeloImagemPath ?? null,
    createdAt: questao.createdAt,
    updatedAt: questao.updatedAt,
  };
}

function normalizeAvaliacaoInput(input: SalvarAvaliacaoInput) {
  return {
    turmaId: normalizeNullableText(input.turmaId),
    titulo: normalizeRequiredText(input.titulo, "Informe o título da avaliação."),
    disciplina: normalizeNullableText(input.disciplina),
    dataAplicacao: normalizeDate(input.dataAplicacao),
    valorTotal: normalizeFiniteNumber(input.valorTotal, "Informe um valor total válido."),
    instrucoes: normalizeNullableText(input.instrucoes),
    comentarioDevolutiva: normalizeNullableText(input.comentarioDevolutiva),
    status: input.status,
  };
}

function normalizeQuestaoInput(input: Omit<CriarQuestaoInput, "avaliacaoId">) {
  return {
    numero: normalizePositiveInteger(input.numero, "Informe um número válido para a questão."),
    tipo: input.tipo,
    qtdAlternativas: normalizeOptionalInteger(
      input.qtdAlternativas,
      "Quantidade de alternativas inválida.",
    ),
    numDigitos: normalizeOptionalInteger(input.numDigitos, "Quantidade de dígitos inválida."),
    gabarito: normalizeNullableText(input.gabarito),
    valor: normalizeFiniteNumber(input.valor, "Informe um valor válido para a questão."),
    descontoErro: normalizeFiniteNumber(input.descontoErro, "Informe um desconto por erro válido."),
    anulada: input.anulada,
    conteudo: normalizeNullableText(input.conteudo),
    orientacaoCorrecao: normalizeNullableText(input.orientacaoCorrecao),
    respostaModelo: normalizeNullableText(input.respostaModelo),
    respostaModeloImagemPath: normalizeNullableText(input.respostaModeloImagemPath),
  };
}

function normalizeRequiredText(value: string, errorMessage: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(errorMessage);
  }

  return normalized;
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";

  return normalized || null;
}

function normalizeDate(value: string | null | undefined): string | null {
  const normalized = normalizeNullableText(value);

  if (normalized && !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw new Error("Informe uma data de aplicação válida.");
  }

  return normalized;
}

function normalizeFiniteNumber(value: number, errorMessage: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(errorMessage);
  }

  return value;
}

function normalizePositiveInteger(value: number, errorMessage: string): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(errorMessage);
  }

  return value;
}

function normalizeOptionalInteger(
  value: number | null | undefined,
  errorMessage: string,
): number | null {
  if (value == null) return null;

  if (!Number.isInteger(value) || value < 1) {
    throw new Error(errorMessage);
  }

  return value;
}
