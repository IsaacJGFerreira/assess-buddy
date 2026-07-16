import {
  OrientacaoFolha as DataConnectOrientacaoFolha,
  criarFolhaRespostaComAluno,
  criarFolhaRespostaSemAluno,
  criarModeloFolha,
  listarMeusModelosFolha,
  listarMinhasFolhasPorAvaliacao,
  listarMinhasFolhasPorModelo,
  obterMeuModeloFolha,
  obterMinhaFolhaPorCodigo,
} from "@assess-buddy/dataconnect";

import { getFirebaseDataConnect } from "./dataconnect";

export type FirebaseOrientacaoFolha = "portrait" | "landscape";

export interface FirebaseModeloFolhaResposta {
  id: string;
  avaliacaoId: string;
  versao: number;
  colunas: number;
  linhasPorColuna: number;
  orientacao: FirebaseOrientacaoFolha;
  snapshot: unknown;
  createdAt: string;
}

export interface FirebaseFolhaResposta {
  id: string;
  avaliacaoId: string;
  modeloId: string;
  alunoId: string | null;
  codigo: string;
  qrPayload: string;
  createdAt: string;
}

export interface CriarOuObterFolhaFirebaseInput {
  avaliacaoId: string;
  turmaId?: string | null;
  alunoId?: string | null;
  colunas: number;
  linhasPorColuna: number;
  orientacao: FirebaseOrientacaoFolha;
  snapshot: unknown;
}

export interface FirebaseIdentificacaoFolhaResposta {
  modeloId: string;
  versao: number;
  folhaId: string;
  codigo: string;
  qrPayload: string;
}

const ORIENTACAO_TO_DATA_CONNECT: Record<FirebaseOrientacaoFolha, DataConnectOrientacaoFolha> = {
  portrait: DataConnectOrientacaoFolha.RETRATO,
  landscape: DataConnectOrientacaoFolha.PAISAGEM,
};

const ORIENTACAO_FROM_DATA_CONNECT: Record<DataConnectOrientacaoFolha, FirebaseOrientacaoFolha> = {
  [DataConnectOrientacaoFolha.RETRATO]: "portrait",
  [DataConnectOrientacaoFolha.PAISAGEM]: "landscape",
};

export async function listarModelosFolhaFirebase(
  avaliacaoId: string,
): Promise<FirebaseModeloFolhaResposta[]> {
  const result = await listarMeusModelosFolha(getFirebaseDataConnect(), {
    avaliacaoId: normalizeRequiredText(avaliacaoId, "Avaliação inválida."),
  });

  return result.data.modelosFolhaResposta.map(mapModelo);
}

export async function obterModeloFolhaFirebase(
  id: string,
): Promise<FirebaseModeloFolhaResposta | null> {
  const result = await obterMeuModeloFolha(getFirebaseDataConnect(), {
    id: normalizeRequiredText(id, "Modelo inválido."),
  });

  const modelo = result.data.modelosFolhaResposta[0];

  return modelo ? mapModelo(modelo) : null;
}

export async function listarFolhasPorAvaliacaoFirebase(
  avaliacaoId: string,
): Promise<FirebaseFolhaResposta[]> {
  const result = await listarMinhasFolhasPorAvaliacao(getFirebaseDataConnect(), {
    avaliacaoId: normalizeRequiredText(avaliacaoId, "Avaliação inválida."),
  });

  return result.data.folhasResposta.map(mapFolha);
}

export async function listarFolhasPorModeloFirebase(
  modeloId: string,
): Promise<FirebaseFolhaResposta[]> {
  const result = await listarMinhasFolhasPorModelo(getFirebaseDataConnect(), {
    modeloId: normalizeRequiredText(modeloId, "Modelo inválido."),
  });

  return result.data.folhasResposta.map(mapFolha);
}

export async function obterFolhaPorCodigoFirebase(
  codigo: string,
): Promise<FirebaseFolhaResposta | null> {
  const result = await obterMinhaFolhaPorCodigo(getFirebaseDataConnect(), {
    codigo: normalizeRequiredText(codigo, "Código da folha inválido."),
  });

  const folha = result.data.folhasResposta[0];

  return folha ? mapFolha(folha) : null;
}

export async function criarOuObterFolhaFirebase(
  input: CriarOuObterFolhaFirebaseInput,
): Promise<FirebaseIdentificacaoFolhaResposta> {
  const avaliacaoId = normalizeRequiredText(input.avaliacaoId, "Avaliação inválida.");
  const alunoId = normalizeNullableText(input.alunoId);
  const turmaId = normalizeNullableText(input.turmaId);

  if (alunoId && !turmaId) {
    throw new Error("A turma é obrigatória para gerar uma folha identificada.");
  }

  const configuracao = {
    avaliacaoId,
    colunas: normalizeInteger(
      input.colunas,
      1,
      6,
      "A quantidade de colunas deve estar entre 1 e 6.",
    ),
    linhasPorColuna: normalizeInteger(
      input.linhasPorColuna,
      5,
      35,
      "A quantidade de linhas deve estar entre 5 e 35.",
    ),
    orientacao: input.orientacao,
    snapshot: normalizeSnapshot(input.snapshot),
  };

  const modelo = await criarOuObterModelo(configuracao);
  const folha = await criarOuObterFolha({
    avaliacaoId,
    turmaId,
    alunoId,
    modeloId: modelo.id,
  });

  return {
    modeloId: modelo.id,
    versao: modelo.versao,
    folhaId: folha.id,
    codigo: folha.codigo,
    qrPayload: folha.qrPayload,
  };
}

async function criarOuObterModelo(input: {
  avaliacaoId: string;
  colunas: number;
  linhasPorColuna: number;
  orientacao: FirebaseOrientacaoFolha;
  snapshot: unknown;
}): Promise<FirebaseModeloFolhaResposta> {
  const modelos = await listarModelosFolhaFirebase(input.avaliacaoId);
  const modeloMaisRecente = modelos[0] ?? null;

  if (modeloMaisRecente && mesmoModelo(modeloMaisRecente, input)) {
    return modeloMaisRecente;
  }

  const proximaVersao = Math.max(0, ...modelos.map((modelo) => modelo.versao)) + 1;

  try {
    const result = await criarModeloFolha(getFirebaseDataConnect(), {
      avaliacaoId: input.avaliacaoId,
      versao: proximaVersao,
      colunas: input.colunas,
      linhasPorColuna: input.linhasPorColuna,
      orientacao: ORIENTACAO_TO_DATA_CONNECT[input.orientacao],
      snapshot: input.snapshot,
    });

    const criado = await obterModeloFolhaFirebase(result.data.modeloFolhaResposta_insert.id);

    if (!criado) {
      throw new Error("O modelo foi criado, mas não pôde ser carregado.");
    }

    return criado;
  } catch (error) {
    const modelosAtualizados = await listarModelosFolhaFirebase(input.avaliacaoId);

    const criadoEmParalelo = modelosAtualizados[0] ?? null;

    if (criadoEmParalelo && mesmoModelo(criadoEmParalelo, input)) {
      return criadoEmParalelo;
    }

    throw error;
  }
}

async function criarOuObterFolha(input: {
  avaliacaoId: string;
  turmaId: string | null;
  alunoId: string | null;
  modeloId: string;
}): Promise<FirebaseFolhaResposta> {
  const folhas = await listarFolhasPorModeloFirebase(input.modeloId);
  const existente = localizarFolha(folhas, input.alunoId);

  if (existente) {
    return existente;
  }

  const codigo = gerarCodigoFolha();
  const qrPayload = `AB1|${codigo}`;

  try {
    const dataConnect = getFirebaseDataConnect();

    if (input.alunoId && input.turmaId) {
      await criarFolhaRespostaComAluno(dataConnect, {
        avaliacaoId: input.avaliacaoId,
        modeloId: input.modeloId,
        turmaId: input.turmaId,
        alunoId: input.alunoId,
        codigo,
        qrPayload,
      });
    } else {
      await criarFolhaRespostaSemAluno(dataConnect, {
        avaliacaoId: input.avaliacaoId,
        modeloId: input.modeloId,
        codigo,
        qrPayload,
      });
    }

    const criada = await obterFolhaPorCodigoFirebase(codigo);

    if (!criada) {
      throw new Error("A folha foi criada, mas não pôde ser carregada.");
    }

    return criada;
  } catch (error) {
    const folhasAtualizadas = await listarFolhasPorModeloFirebase(input.modeloId);

    const criadaEmParalelo = localizarFolha(folhasAtualizadas, input.alunoId);

    if (criadaEmParalelo) {
      return criadaEmParalelo;
    }

    throw error;
  }
}

function localizarFolha(
  folhas: FirebaseFolhaResposta[],
  alunoId: string | null,
): FirebaseFolhaResposta | null {
  return folhas.find((folha) => (folha.alunoId ?? null) === alunoId) ?? null;
}

function mesmoModelo(
  modelo: FirebaseModeloFolhaResposta,
  input: {
    colunas: number;
    linhasPorColuna: number;
    orientacao: FirebaseOrientacaoFolha;
    snapshot: unknown;
  },
): boolean {
  return (
    modelo.colunas === input.colunas &&
    modelo.linhasPorColuna === input.linhasPorColuna &&
    modelo.orientacao === input.orientacao &&
    stableStringify(modelo.snapshot) === stableStringify(input.snapshot)
  );
}

function mapModelo(modelo: {
  id: string;
  avaliacaoId: string;
  versao: number;
  colunas: number;
  linhasPorColuna: number;
  orientacao: DataConnectOrientacaoFolha;
  snapshot: unknown;
  createdAt: string;
}): FirebaseModeloFolhaResposta {
  return {
    id: modelo.id,
    avaliacaoId: modelo.avaliacaoId,
    versao: modelo.versao,
    colunas: modelo.colunas,
    linhasPorColuna: modelo.linhasPorColuna,
    orientacao: ORIENTACAO_FROM_DATA_CONNECT[modelo.orientacao],
    snapshot: modelo.snapshot,
    createdAt: modelo.createdAt,
  };
}

function mapFolha(folha: {
  id: string;
  avaliacaoId: string;
  modeloId: string;
  alunoId?: string | null;
  codigo: string;
  qrPayload: string;
  createdAt: string;
}): FirebaseFolhaResposta {
  return {
    id: folha.id,
    avaliacaoId: folha.avaliacaoId,
    modeloId: folha.modeloId,
    alunoId: folha.alunoId ?? null,
    codigo: folha.codigo,
    qrPayload: folha.qrPayload,
    createdAt: folha.createdAt,
  };
}

function gerarCodigoFolha(): string {
  return crypto.randomUUID().replaceAll("-", "").slice(0, 20).toUpperCase();
}

function normalizeRequiredText(value: string, message: string): string {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error(message);
  }

  return normalized;
}

function normalizeNullableText(value: string | null | undefined): string | null {
  const normalized = value?.trim() ?? "";

  return normalized || null;
}

function normalizeInteger(value: number, min: number, max: number, message: string): number {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(message);
  }

  return value;
}

function normalizeSnapshot(value: unknown): unknown {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("O snapshot da folha precisa ser um objeto.");
  }

  try {
    return JSON.parse(JSON.stringify(value)) as unknown;
  } catch {
    throw new Error("O snapshot da folha possui dados inválidos.");
  }
}

function stableStringify(value: unknown): string {
  return JSON.stringify(sortJsonValue(value));
}

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortJsonValue(item)]),
    );
  }

  return value;
}
