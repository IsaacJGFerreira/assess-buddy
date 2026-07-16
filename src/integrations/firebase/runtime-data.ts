import { QueryFetchPolicy } from "firebase/data-connect";
import {
  StatusAvaliacao as DataConnectStatusAvaliacao,
  TipoQuestao as DataConnectTipoQuestao,
  atualizarAvaliacaoComTurma,
  atualizarAvaliacaoSemTurma,
  atualizarQuestao,
  atualizarRespostaAluno,
  criarAvaliacaoComTurma,
  criarAvaliacaoSemTurma,
  criarQuestao,
  criarRespostaAluno,
  excluirAvaliacao,
  excluirQuestao,
  excluirRespostaAluno,
  listarMinhasAvaliacoes,
  listarMinhasQuestoes,
  listarMinhasRespostasPorAluno,
  listarMinhasRespostasPorAvaliacao,
  obterMinhaAvaliacao,
  obterMinhaQuestao,
  obterMinhaRespostaPorAlunoEQuestao,
} from "@assess-buddy/dataconnect";

import { getFirebaseDataConnect } from "./dataconnect";

export type RuntimeStatusAvaliacao =
  | "elaboracao"
  | "pronta"
  | "aplicada"
  | "em_correcao"
  | "corrigida"
  | "devolvida";

export type RuntimeTipoQuestao = "mc" | "ce" | "num" | "disc";

export interface RuntimeTurmaResumo {
  id: string;
  nome: string;
  serie: string | null;
  ano: number | null;
}

export interface RuntimeAvaliacao {
  id: string;
  turmaId: string | null;
  titulo: string;
  disciplina: string | null;
  dataAplicacao: string | null;
  valorTotal: number;
  instrucoes: string | null;
  comentarioDevolutiva: string | null;
  status: RuntimeStatusAvaliacao;
  createdAt: string;
  updatedAt: string;
  turma: RuntimeTurmaResumo | null;
}

export interface RuntimeQuestao {
  id: string;
  avaliacaoId: string;
  numero: number;
  tipo: RuntimeTipoQuestao;
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

export interface RuntimeResposta {
  id: string;
  avaliacaoId: string;
  alunoId: string;
  questaoId: string;
  resposta: string | null;
  notaManual: number | null;
  feedback: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalvarAvaliacaoRuntimeInput {
  turmaId?: string | null;
  titulo: string;
  disciplina?: string | null;
  dataAplicacao?: string | null;
  valorTotal: number;
  instrucoes?: string | null;
  comentarioDevolutiva?: string | null;
  status: RuntimeStatusAvaliacao;
}

export interface AtualizarAvaliacaoRuntimeInput extends SalvarAvaliacaoRuntimeInput {
  id: string;
}

export interface CriarQuestaoRuntimeInput {
  avaliacaoId: string;
  numero: number;
  tipo: RuntimeTipoQuestao;
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

export interface AtualizarQuestaoRuntimeInput
  extends Omit<CriarQuestaoRuntimeInput, "avaliacaoId"> {
  id: string;
}

export interface SalvarRespostaRuntimeInput {
  avaliacaoId: string;
  turmaId: string;
  alunoId: string;
  questaoId: string;
  resposta?: string | null;
  notaManual?: number | null;
  feedback?: string | null;
}

const SERVER_ONLY = {
  fetchPolicy: QueryFetchPolicy.SERVER_ONLY,
} as const;

const STATUS_TO_DATA_CONNECT: Record<RuntimeStatusAvaliacao, DataConnectStatusAvaliacao> = {
  elaboracao: DataConnectStatusAvaliacao.ELABORACAO,
  pronta: DataConnectStatusAvaliacao.PRONTA,
  aplicada: DataConnectStatusAvaliacao.APLICADA,
  em_correcao: DataConnectStatusAvaliacao.EM_CORRECAO,
  corrigida: DataConnectStatusAvaliacao.CORRIGIDA,
  devolvida: DataConnectStatusAvaliacao.DEVOLVIDA,
};

const STATUS_FROM_DATA_CONNECT: Record<DataConnectStatusAvaliacao, RuntimeStatusAvaliacao> = {
  [DataConnectStatusAvaliacao.ELABORACAO]: "elaboracao",
  [DataConnectStatusAvaliacao.PRONTA]: "pronta",
  [DataConnectStatusAvaliacao.APLICADA]: "aplicada",
  [DataConnectStatusAvaliacao.EM_CORRECAO]: "em_correcao",
  [DataConnectStatusAvaliacao.CORRIGIDA]: "corrigida",
  [DataConnectStatusAvaliacao.DEVOLVIDA]: "devolvida",
};

const TIPO_TO_DATA_CONNECT: Record<RuntimeTipoQuestao, DataConnectTipoQuestao> = {
  mc: DataConnectTipoQuestao.MULTIPLA_ESCOLHA,
  ce: DataConnectTipoQuestao.CERTO_ERRADO,
  num: DataConnectTipoQuestao.NUMERICA,
  disc: DataConnectTipoQuestao.DISCURSIVA,
};

const TIPO_FROM_DATA_CONNECT: Record<DataConnectTipoQuestao, RuntimeTipoQuestao> = {
  [DataConnectTipoQuestao.MULTIPLA_ESCOLHA]: "mc",
  [DataConnectTipoQuestao.CERTO_ERRADO]: "ce",
  [DataConnectTipoQuestao.NUMERICA]: "num",
  [DataConnectTipoQuestao.DISCURSIVA]: "disc",
};

export async function listarAvaliacoesRuntime(): Promise<RuntimeAvaliacao[]> {
  const result = await listarMinhasAvaliacoes(getFirebaseDataConnect(), SERVER_ONLY);
  return result.data.avaliacoes.map(mapAvaliacao);
}

export async function obterAvaliacaoRuntime(id: string): Promise<RuntimeAvaliacao | null> {
  const result = await obterMinhaAvaliacao(
    getFirebaseDataConnect(),
    { id: required(id, "Avaliação inválida.") },
    SERVER_ONLY,
  );
  const avaliacao = result.data.avaliacoes[0];
  return avaliacao ? mapAvaliacao(avaliacao) : null;
}

export async function criarAvaliacaoRuntime(
  input: SalvarAvaliacaoRuntimeInput,
): Promise<RuntimeAvaliacao> {
  const normalized = normalizeAvaliacao(input);
  const dc = getFirebaseDataConnect();
  const result = normalized.turmaId
    ? await criarAvaliacaoComTurma(dc, {
        turmaId: normalized.turmaId,
        titulo: normalized.titulo,
        disciplina: normalized.disciplina,
        dataAplicacao: normalized.dataAplicacao,
        valorTotal: normalized.valorTotal,
        instrucoes: normalized.instrucoes,
        comentarioDevolutiva: normalized.comentarioDevolutiva,
        status: STATUS_TO_DATA_CONNECT[normalized.status],
      })
    : await criarAvaliacaoSemTurma(dc, {
        titulo: normalized.titulo,
        disciplina: normalized.disciplina,
        dataAplicacao: normalized.dataAplicacao,
        valorTotal: normalized.valorTotal,
        instrucoes: normalized.instrucoes,
        comentarioDevolutiva: normalized.comentarioDevolutiva,
        status: STATUS_TO_DATA_CONNECT[normalized.status],
      });

  const id = result.data.avaliacao_insert.id;
  const created = await readAfterWrite(() => obterAvaliacaoRuntime(id));
  if (!created) throw new Error("A avaliação foi criada, mas não pôde ser carregada.");
  return created;
}

export async function atualizarAvaliacaoRuntime(
  input: AtualizarAvaliacaoRuntimeInput,
): Promise<RuntimeAvaliacao> {
  const id = required(input.id, "Avaliação inválida.");
  const normalized = normalizeAvaliacao(input);
  const dc = getFirebaseDataConnect();
  const result = normalized.turmaId
    ? await atualizarAvaliacaoComTurma(dc, {
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
    : await atualizarAvaliacaoSemTurma(dc, {
        id,
        titulo: normalized.titulo,
        disciplina: normalized.disciplina,
        dataAplicacao: normalized.dataAplicacao,
        valorTotal: normalized.valorTotal,
        instrucoes: normalized.instrucoes,
        comentarioDevolutiva: normalized.comentarioDevolutiva,
        status: STATUS_TO_DATA_CONNECT[normalized.status],
      });

  if (!result.data.avaliacao_update) {
    throw new Error("Avaliação não encontrada ou sem permissão para alteração.");
  }

  const updated = await readAfterWrite(() => obterAvaliacaoRuntime(id));
  if (!updated) throw new Error("A avaliação foi atualizada, mas não pôde ser carregada.");
  return updated;
}

export async function excluirAvaliacaoRuntime(id: string): Promise<void> {
  const result = await excluirAvaliacao(getFirebaseDataConnect(), {
    id: required(id, "Avaliação inválida."),
  });
  if (!result.data.avaliacao_delete) {
    throw new Error("Avaliação não encontrada ou sem permissão para exclusão.");
  }
}

export async function listarQuestoesRuntime(
  avaliacaoId: string,
): Promise<RuntimeQuestao[]> {
  const result = await listarMinhasQuestoes(
    getFirebaseDataConnect(),
    { avaliacaoId: required(avaliacaoId, "Avaliação inválida.") },
    SERVER_ONLY,
  );
  return result.data.questoes.map(mapQuestao);
}

export async function obterQuestaoRuntime(id: string): Promise<RuntimeQuestao | null> {
  const result = await obterMinhaQuestao(
    getFirebaseDataConnect(),
    { id: required(id, "Questão inválida.") },
    SERVER_ONLY,
  );
  const questao = result.data.questoes[0];
  return questao ? mapQuestao(questao) : null;
}

export async function criarQuestaoRuntime(
  input: CriarQuestaoRuntimeInput,
): Promise<RuntimeQuestao> {
  const normalized = normalizeQuestao(input, true);
  const result = await criarQuestao(getFirebaseDataConnect(), {
    avaliacaoId: required(input.avaliacaoId, "Avaliação inválida."),
    ...toQuestionMutation(normalized),
  });
  const created = await readAfterWrite(() =>
    obterQuestaoRuntime(result.data.questao_insert.id),
  );
  if (!created) throw new Error("A questão foi criada, mas não pôde ser carregada.");
  return created;
}

export async function criarQuestoesRuntime(
  inputs: CriarQuestaoRuntimeInput[],
): Promise<RuntimeQuestao[]> {
  const created: RuntimeQuestao[] = [];
  for (const input of inputs) created.push(await criarQuestaoRuntime(input));
  return created;
}

export async function atualizarQuestaoRuntime(
  input: AtualizarQuestaoRuntimeInput,
): Promise<RuntimeQuestao> {
  const id = required(input.id, "Questão inválida.");
  const normalized = normalizeQuestao(input, true);
  await updateQuestionRecord(id, normalized);
  const updated = await readAfterWrite(() => obterQuestaoRuntime(id));
  if (!updated) throw new Error("A questão foi atualizada, mas não pôde ser carregada.");
  return updated;
}

export async function excluirQuestaoRuntime(id: string): Promise<void> {
  const result = await excluirQuestao(getFirebaseDataConnect(), {
    id: required(id, "Questão inválida."),
  });
  if (!result.data.questao_delete) {
    throw new Error("Questão não encontrada ou sem permissão para exclusão.");
  }
}

export async function reordenarQuestoesRuntime(
  questoes: RuntimeQuestao[],
  questaoId: string,
  novaPosicao: number,
): Promise<RuntimeQuestao[]> {
  const origem = questoes.findIndex((item) => item.id === questaoId);
  const destino = novaPosicao - 1;
  if (origem < 0 || destino < 0 || destino >= questoes.length || origem === destino) {
    return questoes;
  }

  const atual = questoes[origem];
  const alvo = questoes[destino];
  const numeroTemporario = Math.min(-1, ...questoes.map((item) => item.numero)) - 1;

  try {
    await updateQuestionRecord(atual.id, { ...atual, numero: numeroTemporario });
    await updateQuestionRecord(alvo.id, { ...alvo, numero: atual.numero });
    await updateQuestionRecord(atual.id, { ...atual, numero: alvo.numero });
  } catch (error) {
    await updateQuestionRecord(atual.id, { ...atual, numero: numeroTemporario }).catch(
      () => undefined,
    );
    await updateQuestionRecord(alvo.id, { ...alvo, numero: alvo.numero }).catch(
      () => undefined,
    );
    await updateQuestionRecord(atual.id, { ...atual, numero: atual.numero }).catch(
      () => undefined,
    );
    throw error;
  }

  return listarQuestoesRuntime(atual.avaliacaoId);
}

export async function listarRespostasRuntime(
  avaliacaoId: string,
): Promise<RuntimeResposta[]> {
  const result = await listarMinhasRespostasPorAvaliacao(
    getFirebaseDataConnect(),
    { avaliacaoId: required(avaliacaoId, "Avaliação inválida.") },
    SERVER_ONLY,
  );
  return result.data.respostasAluno.map(mapResposta);
}

export async function listarRespostasAlunoRuntime(
  avaliacaoId: string,
  alunoId: string,
): Promise<RuntimeResposta[]> {
  const result = await listarMinhasRespostasPorAluno(
    getFirebaseDataConnect(),
    {
      avaliacaoId: required(avaliacaoId, "Avaliação inválida."),
      alunoId: required(alunoId, "Aluno inválido."),
    },
    SERVER_ONLY,
  );
  return result.data.respostasAluno.map(mapResposta);
}

export async function obterRespostaRuntime(
  avaliacaoId: string,
  alunoId: string,
  questaoId: string,
): Promise<RuntimeResposta | null> {
  const result = await obterMinhaRespostaPorAlunoEQuestao(
    getFirebaseDataConnect(),
    {
      avaliacaoId: required(avaliacaoId, "Avaliação inválida."),
      alunoId: required(alunoId, "Aluno inválido."),
      questaoId: required(questaoId, "Questão inválida."),
    },
    SERVER_ONLY,
  );
  const resposta = result.data.respostasAluno[0];
  return resposta ? mapResposta(resposta) : null;
}

export async function salvarRespostaRuntime(
  input: SalvarRespostaRuntimeInput,
): Promise<RuntimeResposta> {
  const identity = {
    avaliacaoId: required(input.avaliacaoId, "Avaliação inválida."),
    alunoId: required(input.alunoId, "Aluno inválido."),
    questaoId: required(input.questaoId, "Questão inválida."),
  };
  const current = await obterRespostaRuntime(
    identity.avaliacaoId,
    identity.alunoId,
    identity.questaoId,
  );
  const values = {
    resposta:
      input.resposta === undefined ? (current?.resposta ?? null) : nullable(input.resposta),
    notaManual:
      input.notaManual === undefined
        ? (current?.notaManual ?? null)
        : optionalNumber(input.notaManual, "Nota manual inválida."),
    feedback:
      input.feedback === undefined ? (current?.feedback ?? null) : nullable(input.feedback),
  };

  if (current) {
    const result = await atualizarRespostaAluno(getFirebaseDataConnect(), {
      id: current.id,
      ...values,
    });
    if (!result.data.respostaAluno_update) {
      throw new Error("Resposta não encontrada ou sem permissão para alteração.");
    }
  } else {
    await criarRespostaAluno(getFirebaseDataConnect(), {
      ...identity,
      turmaId: required(input.turmaId, "Turma inválida."),
      ...values,
    });
  }

  const saved = await readAfterWrite(() =>
    obterRespostaRuntime(identity.avaliacaoId, identity.alunoId, identity.questaoId),
  );
  if (!saved) throw new Error("A resposta foi salva, mas não pôde ser carregada.");
  return saved;
}

export async function excluirRespostaRuntime(id: string): Promise<void> {
  const result = await excluirRespostaAluno(getFirebaseDataConnect(), {
    id: required(id, "Resposta inválida."),
  });
  if (!result.data.respostaAluno_delete) {
    throw new Error("Resposta não encontrada ou sem permissão para exclusão.");
  }
}

async function updateQuestionRecord(
  id: string,
  input: Omit<RuntimeQuestao, "id" | "createdAt" | "updatedAt" | "avaliacaoId">,
): Promise<void> {
  const result = await atualizarQuestao(getFirebaseDataConnect(), {
    id,
    ...toQuestionMutation(input),
  });
  if (!result.data.questao_update) {
    throw new Error("Questão não encontrada ou sem permissão para alteração.");
  }
}

function toQuestionMutation(input: {
  numero: number;
  tipo: RuntimeTipoQuestao;
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
}) {
  return {
    numero: input.numero,
    tipo: TIPO_TO_DATA_CONNECT[input.tipo],
    qtdAlternativas: input.qtdAlternativas,
    numDigitos: input.numDigitos,
    gabarito: input.gabarito,
    valor: input.valor,
    descontoErro: input.descontoErro,
    anulada: input.anulada,
    conteudo: input.conteudo,
    orientacaoCorrecao: input.orientacaoCorrecao,
    respostaModelo: input.respostaModelo,
    respostaModeloImagemPath: input.respostaModeloImagemPath,
  };
}

function normalizeAvaliacao(input: SalvarAvaliacaoRuntimeInput) {
  const date = nullable(input.dataAplicacao);
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Data de aplicação inválida.");
  }
  return {
    turmaId: nullable(input.turmaId),
    titulo: required(input.titulo, "Informe o título da avaliação."),
    disciplina: nullable(input.disciplina),
    dataAplicacao: date,
    valorTotal: finite(input.valorTotal, "Valor total inválido."),
    instrucoes: nullable(input.instrucoes),
    comentarioDevolutiva: nullable(input.comentarioDevolutiva),
    status: input.status,
  };
}

function normalizeQuestao(
  input: Omit<CriarQuestaoRuntimeInput, "avaliacaoId">,
  positiveNumber: boolean,
) {
  const numero = integer(input.numero, "Número da questão inválido.");
  if (positiveNumber && numero < 1) throw new Error("Número da questão inválido.");
  return {
    numero,
    tipo: input.tipo,
    qtdAlternativas: optionalPositiveInteger(input.qtdAlternativas),
    numDigitos: optionalPositiveInteger(input.numDigitos),
    gabarito: nullable(input.gabarito),
    valor: finite(input.valor, "Valor da questão inválido."),
    descontoErro: finite(input.descontoErro, "Desconto por erro inválido."),
    anulada: input.anulada,
    conteudo: nullable(input.conteudo),
    orientacaoCorrecao: nullable(input.orientacaoCorrecao),
    respostaModelo: nullable(input.respostaModelo),
    respostaModeloImagemPath: nullable(input.respostaModeloImagemPath),
  };
}

function mapAvaliacao(value: {
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
  turma?: { id: string; nome: string; serie?: string | null; ano?: number | null } | null;
}): RuntimeAvaliacao {
  return {
    id: value.id,
    turmaId: value.turmaId ?? null,
    titulo: value.titulo,
    disciplina: value.disciplina ?? null,
    dataAplicacao: value.dataAplicacao ?? null,
    valorTotal: Number(value.valorTotal),
    instrucoes: value.instrucoes ?? null,
    comentarioDevolutiva: value.comentarioDevolutiva ?? null,
    status: STATUS_FROM_DATA_CONNECT[value.status],
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    turma: value.turma
      ? {
          id: value.turma.id,
          nome: value.turma.nome,
          serie: value.turma.serie ?? null,
          ano: value.turma.ano ?? null,
        }
      : null,
  };
}

function mapQuestao(value: {
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
}): RuntimeQuestao {
  return {
    id: value.id,
    avaliacaoId: value.avaliacaoId,
    numero: value.numero,
    tipo: TIPO_FROM_DATA_CONNECT[value.tipo],
    qtdAlternativas: value.qtdAlternativas ?? null,
    numDigitos: value.numDigitos ?? null,
    gabarito: value.gabarito ?? null,
    valor: Number(value.valor),
    descontoErro: Number(value.descontoErro),
    anulada: value.anulada,
    conteudo: value.conteudo ?? null,
    orientacaoCorrecao: value.orientacaoCorrecao ?? null,
    respostaModelo: value.respostaModelo ?? null,
    respostaModeloImagemPath: value.respostaModeloImagemPath ?? null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

function mapResposta(value: {
  id: string;
  avaliacaoId: string;
  alunoId: string;
  questaoId: string;
  resposta?: string | null;
  notaManual?: number | null;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
}): RuntimeResposta {
  return {
    id: value.id,
    avaliacaoId: value.avaliacaoId,
    alunoId: value.alunoId,
    questaoId: value.questaoId,
    resposta: value.resposta ?? null,
    notaManual: value.notaManual == null ? null : Number(value.notaManual),
    feedback: value.feedback ?? null,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
  };
}

async function readAfterWrite<T>(read: () => Promise<T | null>): Promise<T | null> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      const value = await read();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 5) await delay(120 * (attempt + 1));
  }
  if (lastError) throw lastError;
  return null;
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => globalThis.setTimeout(resolve, milliseconds));
}

function required(value: string, message: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(message);
  return normalized;
}

function nullable(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function finite(value: number, message: string): number {
  if (!Number.isFinite(value)) throw new Error(message);
  return value;
}

function integer(value: number, message: string): number {
  if (!Number.isInteger(value)) throw new Error(message);
  return value;
}

function optionalPositiveInteger(value: number | null | undefined): number | null {
  if (value == null) return null;
  if (!Number.isInteger(value) || value < 1) throw new Error("Quantidade inválida.");
  return value;
}

function optionalNumber(value: number | null | undefined, message: string): number | null {
  if (value == null) return null;
  if (!Number.isFinite(value)) throw new Error(message);
  return value;
}
