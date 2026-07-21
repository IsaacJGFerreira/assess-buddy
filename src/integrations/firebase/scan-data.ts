import {
  StatusDigitalizacao as DataConnectStatusDigitalizacao,
  atualizarLeituraDigitalizacaoComAluno,
  atualizarLeituraDigitalizacaoSemAluno,
  criarDigitalizacaoFolha,
  excluirDigitalizacaoFolha,
  listarMinhasDigitalizacoesPorAvaliacao,
  marcarDigitalizacaoComErro,
  obterMinhaDigitalizacao,
  vincularDigitalizacaoAFolha,
} from "@assess-buddy/dataconnect";
import { deleteObject, getBlob, ref, uploadBytes } from "firebase/storage";

import { getFirebaseAuth, getFirebaseStorage } from "./client";
import { listarQuestoesFirebase, type FirebaseQuestao } from "./assessment-data";
import { getFirebaseDataConnect } from "./dataconnect";
import { salvarRespostasFirebase } from "./response-data";
import { listarFolhasPorAvaliacaoFirebase } from "./sheet-data";

const MAX_SCAN_BYTES = 20 * 1024 * 1024;

export type FirebaseStatusDigitalizacao =
  "preparada" | "identificada" | "revisao" | "processada" | "erro";

export type FirebaseMimeDigitalizacao = "image/jpeg" | "image/png" | "application/pdf";

export interface FirebaseDigitalizacaoFolha {
  id: string;
  avaliacaoId: string;
  folhaId: string | null;
  modeloId: string | null;
  alunoId: string | null;
  arquivoOriginal: string;
  mimeOriginal: FirebaseMimeDigitalizacao;
  paginaOrigem: number;
  paginaModelo: number | null;
  rotacao: number;
  recorte: unknown;
  storagePath: string;
  larguraPx: number;
  alturaPx: number;
  tamanhoBytes: number;
  resultadoLeitura: unknown | null;
  confiancaLeitura: number | null;
  status: FirebaseStatusDigitalizacao;
  processadoAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UploadDigitalizacaoFirebaseInput {
  avaliacaoId: string;
  arquivoOriginal: string;
  mimeOriginal: FirebaseMimeDigitalizacao;
  paginaOrigem: number;
  rotacao: number;
  recorte: unknown;
  imagem: Blob;
  larguraPx: number;
  alturaPx: number;
}

export interface SalvarLeituraDigitalizacaoFirebaseInput {
  digitalizacaoId: string;
  avaliacaoId: string;
  turmaId?: string | null;
  alunoId?: string | null;
  modeloId: string;
  paginaModelo: number;
  resultado: unknown;
  confianca?: number | null;
}

export interface ExcluirDigitalizacaoFirebaseResultado {
  storageCleanupFailed: boolean;
}

interface RespostaLida {
  questaoId: string;
  valor: string | null;
}

const STATUS_TO_DATA_CONNECT: Record<FirebaseStatusDigitalizacao, DataConnectStatusDigitalizacao> =
  {
    preparada: DataConnectStatusDigitalizacao.PREPARADA,
    identificada: DataConnectStatusDigitalizacao.IDENTIFICADA,
    revisao: DataConnectStatusDigitalizacao.REVISAO,
    processada: DataConnectStatusDigitalizacao.PROCESSADA,
    erro: DataConnectStatusDigitalizacao.ERRO,
  };

const STATUS_FROM_DATA_CONNECT: Record<
  DataConnectStatusDigitalizacao,
  FirebaseStatusDigitalizacao
> = {
  [DataConnectStatusDigitalizacao.PREPARADA]: "preparada",
  [DataConnectStatusDigitalizacao.IDENTIFICADA]: "identificada",
  [DataConnectStatusDigitalizacao.REVISAO]: "revisao",
  [DataConnectStatusDigitalizacao.PROCESSADA]: "processada",
  [DataConnectStatusDigitalizacao.ERRO]: "erro",
};

export async function listarDigitalizacoesFirebase(
  avaliacaoId: string,
): Promise<FirebaseDigitalizacaoFolha[]> {
  const result = await listarMinhasDigitalizacoesPorAvaliacao(getFirebaseDataConnect(), {
    avaliacaoId: normalizeRequiredText(avaliacaoId, "Avaliação inválida."),
  });

  return result.data.digitalizacoesFolha.map(mapDigitalizacao);
}

export async function obterDigitalizacaoFirebase(
  id: string,
): Promise<FirebaseDigitalizacaoFolha | null> {
  const result = await obterMinhaDigitalizacao(getFirebaseDataConnect(), {
    id: normalizeRequiredText(id, "Digitalização inválida."),
  });

  const digitalizacao = result.data.digitalizacoesFolha[0];

  return digitalizacao ? mapDigitalizacao(digitalizacao) : null;
}

export async function uploadDigitalizacaoFirebase(
  input: UploadDigitalizacaoFirebaseInput,
): Promise<FirebaseDigitalizacaoFolha> {
  const user = getFirebaseAuth().currentUser;

  if (!user) {
    throw new Error("Sua sessão do Firebase expirou. Entre novamente.");
  }

  const avaliacaoId = normalizeRequiredText(input.avaliacaoId, "Avaliação inválida.");
  const imagem = normalizeScanBlob(input.imagem);
  const preparedMime = normalizePreparedImageMime(imagem.type);
  const preparedExtension = preparedMime === "image/png" ? "png" : "jpg";
  const id = crypto.randomUUID();
  const storagePath =
    `usuarios/${user.uid}/digitalizacoes/` + `${avaliacaoId}/${id}.${preparedExtension}`;

  const storageReference = ref(getFirebaseStorage(), storagePath);

  await uploadBytes(storageReference, imagem, {
    contentType: preparedMime,
    cacheControl: "private,max-age=3600",
    customMetadata: {
      avaliacaoId,
      digitalizacaoId: id,
    },
  });

  try {
    await criarDigitalizacaoFolha(getFirebaseDataConnect(), {
      id,
      avaliacaoId,
      arquivoOriginal: normalizeFileName(input.arquivoOriginal),
      mimeOriginal: normalizeMimeOriginal(input.mimeOriginal),
      paginaOrigem: normalizePositiveInteger(input.paginaOrigem, "Página de origem inválida."),
      rotacao: normalizeRotation(input.rotacao),
      recorte: normalizeJsonObject(input.recorte, "Recorte inválido."),
      storagePath,
      larguraPx: normalizeDimension(input.larguraPx, "Largura inválida."),
      alturaPx: normalizeDimension(input.alturaPx, "Altura inválida."),
      tamanhoBytes: String(imagem.size),
    });

    const criada = await obterDigitalizacaoFirebase(id);

    if (!criada) {
      throw new Error("A digitalização foi criada, mas não pôde ser carregada.");
    }

    return criada;
  } catch (error) {
    await excluirDigitalizacaoFolha(getFirebaseDataConnect(), { id }).catch(() => undefined);

    await deleteObject(storageReference).catch(() => undefined);

    throw error;
  }
}

export async function downloadDigitalizacaoFirebase(id: string): Promise<Blob> {
  const digitalizacao = await obterDigitalizacaoObrigatoria(id);

  return getBlob(ref(getFirebaseStorage(), digitalizacao.storagePath));
}

export async function excluirDigitalizacaoFirebase(
  id: string,
): Promise<ExcluirDigitalizacaoFirebaseResultado> {
  const digitalizacao = await obterDigitalizacaoObrigatoria(id);

  const result = await excluirDigitalizacaoFolha(getFirebaseDataConnect(), {
    id: digitalizacao.id,
  });

  if (!result.data.digitalizacaoFolha_delete) {
    throw new Error("Digitalização não encontrada ou sem permissão para exclusão.");
  }

  try {
    await deleteObject(ref(getFirebaseStorage(), digitalizacao.storagePath));

    return { storageCleanupFailed: false };
  } catch (error) {
    if (isStorageObjectNotFound(error)) {
      return { storageCleanupFailed: false };
    }

    return { storageCleanupFailed: true };
  }
}

export async function vincularDigitalizacaoFirebase(
  digitalizacaoId: string,
  avaliacaoId: string,
  folhaId: string,
): Promise<FirebaseDigitalizacaoFolha> {
  const id = normalizeRequiredText(digitalizacaoId, "Digitalização inválida.");

  const result = await vincularDigitalizacaoAFolha(getFirebaseDataConnect(), {
    id,
    avaliacaoId: normalizeRequiredText(avaliacaoId, "Avaliação inválida."),
    folhaId: normalizeRequiredText(folhaId, "Folha inválida."),
  });

  if (!result.data.digitalizacaoFolha_update) {
    throw new Error("Não foi possível vincular a digitalização à folha.");
  }

  return obterDigitalizacaoObrigatoria(id);
}

export async function salvarLeituraDigitalizacaoFirebase(
  input: SalvarLeituraDigitalizacaoFirebaseInput,
): Promise<FirebaseDigitalizacaoFolha> {
  const normalized = await normalizeReadingContext(input, false);

  await atualizarRegistroLeitura({
    ...normalized,
    status: "revisao",
    processadoAt: null,
  });

  return obterDigitalizacaoObrigatoria(normalized.digitalizacaoId);
}

export async function confirmarLeituraDigitalizacaoFirebase(
  input: SalvarLeituraDigitalizacaoFirebaseInput,
): Promise<FirebaseDigitalizacaoFolha> {
  const normalized = await normalizeReadingContext(input, true);

  if (normalized.alunoId) {
    if (!normalized.turmaId) {
      throw new Error("A turma é obrigatória para confirmar as respostas do aluno.");
    }

    const questoes = await listarQuestoesFirebase(normalized.avaliacaoId);

    const respostas = validateReadAnswers(extractReadAnswers(normalized.resultado), questoes);

    await salvarRespostasFirebase(
      respostas.map((item) => ({
        avaliacaoId: normalized.avaliacaoId,
        turmaId: normalized.turmaId as string,
        alunoId: normalized.alunoId as string,
        questaoId: item.questaoId,
        resposta: item.valor,
      })),
    );
  }

  await atualizarRegistroLeitura({
    ...normalized,
    status: "processada",
    processadoAt: new Date().toISOString(),
  });

  return obterDigitalizacaoObrigatoria(normalized.digitalizacaoId);
}

export async function marcarDigitalizacaoErroFirebase(
  id: string,
): Promise<FirebaseDigitalizacaoFolha> {
  const normalizedId = normalizeRequiredText(id, "Digitalização inválida.");

  const result = await marcarDigitalizacaoComErro(getFirebaseDataConnect(), { id: normalizedId });

  if (!result.data.digitalizacaoFolha_update) {
    throw new Error("Não foi possível marcar a digitalização com erro.");
  }

  return obterDigitalizacaoObrigatoria(normalizedId);
}

async function atualizarRegistroLeitura(input: {
  digitalizacaoId: string;
  avaliacaoId: string;
  turmaId: string | null;
  alunoId: string | null;
  modeloId: string;
  paginaModelo: number;
  resultado: Record<string, unknown>;
  confianca: number | null;
  status: FirebaseStatusDigitalizacao;
  processadoAt: string | null;
}): Promise<void> {
  const dataConnect = getFirebaseDataConnect();

  if (input.alunoId) {
    if (!input.turmaId) {
      throw new Error("A turma é obrigatória para vincular um aluno.");
    }

    const result = await atualizarLeituraDigitalizacaoComAluno(dataConnect, {
      id: input.digitalizacaoId,
      avaliacaoId: input.avaliacaoId,
      turmaId: input.turmaId,
      alunoId: input.alunoId,
      modeloId: input.modeloId,
      paginaModelo: input.paginaModelo,
      resultadoLeitura: input.resultado,
      confiancaLeitura: input.confianca,
      status: STATUS_TO_DATA_CONNECT[input.status],
      processadoAt: input.processadoAt,
    });

    if (!result.data.digitalizacaoFolha_update) {
      throw new Error("Não foi possível atualizar a leitura da digitalização.");
    }

    return;
  }

  const result = await atualizarLeituraDigitalizacaoSemAluno(dataConnect, {
    id: input.digitalizacaoId,
    avaliacaoId: input.avaliacaoId,
    modeloId: input.modeloId,
    paginaModelo: input.paginaModelo,
    resultadoLeitura: input.resultado,
    confiancaLeitura: input.confianca,
    status: STATUS_TO_DATA_CONNECT[input.status],
    processadoAt: input.processadoAt,
  });

  if (!result.data.digitalizacaoFolha_update) {
    throw new Error("Não foi possível atualizar a leitura da digitalização.");
  }
}

async function normalizeReadingContext(
  input: SalvarLeituraDigitalizacaoFirebaseInput,
  strictSheetValidation: boolean,
): Promise<{
  digitalizacaoId: string;
  avaliacaoId: string;
  turmaId: string | null;
  alunoId: string | null;
  modeloId: string;
  paginaModelo: number;
  resultado: Record<string, unknown>;
  confianca: number | null;
}> {
  const digitalizacaoId = normalizeRequiredText(input.digitalizacaoId, "Digitalização inválida.");
  const avaliacaoId = normalizeRequiredText(input.avaliacaoId, "Avaliação inválida.");
  const modeloId = normalizeRequiredText(input.modeloId, "Modelo inválido.");
  const turmaId = normalizeNullableText(input.turmaId);
  const alunoId = normalizeNullableText(input.alunoId);
  const resultado = normalizeJsonObject(input.resultado, "Resultado de leitura inválido.");

  const digitalizacao = await obterDigitalizacaoObrigatoria(digitalizacaoId);

  if (digitalizacao.avaliacaoId !== avaliacaoId) {
    throw new Error("A digitalização não pertence à avaliação informada.");
  }

  if (strictSheetValidation) {
    await validateIdentifiedSheet({
      digitalizacao,
      modeloId,
      alunoId,
    });
  }

  return {
    digitalizacaoId,
    avaliacaoId,
    turmaId,
    alunoId,
    modeloId,
    paginaModelo: normalizePositiveInteger(input.paginaModelo, "Página do modelo inválida."),
    resultado,
    confianca: resolveConfidence(input.confianca, resultado.confiancaMedia),
  };
}

async function validateIdentifiedSheet(input: {
  digitalizacao: FirebaseDigitalizacaoFolha;
  modeloId: string;
  alunoId: string | null;
}): Promise<void> {
  if (!input.digitalizacao.folhaId) return;

  const folhas = await listarFolhasPorAvaliacaoFirebase(input.digitalizacao.avaliacaoId);

  const folha = folhas.find((item) => item.id === input.digitalizacao.folhaId);

  if (!folha) {
    throw new Error("A folha identificada não foi encontrada.");
  }

  if (folha.modeloId !== input.modeloId) {
    throw new Error("A versão selecionada não corresponde à folha identificada.");
  }

  if (folha.alunoId && folha.alunoId !== input.alunoId) {
    throw new Error("A folha identificada pertence a outro aluno.");
  }
}

function extractReadAnswers(resultado: Record<string, unknown>): RespostaLida[] {
  if (!Array.isArray(resultado.respostas)) {
    throw new Error("O resultado não contém uma lista de respostas.");
  }

  const respostas = new Map<string, RespostaLida>();

  for (const item of resultado.respostas) {
    if (item === null || typeof item !== "object" || Array.isArray(item)) {
      throw new Error("Foi encontrada uma resposta lida inválida.");
    }

    const candidate = item as Record<string, unknown>;
    const questaoId = typeof candidate.questaoId === "string" ? candidate.questaoId.trim() : "";

    if (!questaoId) {
      throw new Error("Foi encontrado um identificador de questão inválido.");
    }

    const rawValue = candidate.valor;
    let valor: string | null;

    if (rawValue == null) {
      valor = null;
    } else if (typeof rawValue === "string" || typeof rawValue === "number") {
      valor = String(rawValue).trim() || null;
    } else {
      throw new Error("Foi encontrado um valor de resposta inválido.");
    }

    respostas.set(questaoId, {
      questaoId,
      valor,
    });
  }

  if (respostas.size === 0) {
    throw new Error("Nenhuma resposta foi enviada para confirmação.");
  }

  return [...respostas.values()];
}

function validateReadAnswers(
  respostas: RespostaLida[],
  questoes: FirebaseQuestao[],
): RespostaLida[] {
  const questoesPorId = new Map(questoes.map((questao) => [questao.id, questao]));

  return respostas.map((item) => {
    const questao = questoesPorId.get(item.questaoId);

    if (!questao) {
      throw new Error(`A questão ${item.questaoId} não pertence à avaliação.`);
    }

    if (item.valor === null) {
      return item;
    }

    const valorOriginal = item.valor.trim();

    if (!valorOriginal) {
      return {
        ...item,
        valor: null,
      };
    }

    if (questao.tipo === "disc") {
      return {
        ...item,
        valor: valorOriginal,
      };
    }

    const valor = valorOriginal.toUpperCase();

    if (questao.tipo === "mc") {
      const quantidadeAlternativas = questao.qtdAlternativas ?? 5;

      const indiceAlternativa =
        valor.length === 1 ? valor.charCodeAt(0) - "A".charCodeAt(0) + 1 : 0;

      if (!/^[A-G]$/.test(valor) || indiceAlternativa > quantidadeAlternativas) {
        throw new Error(`Resposta inválida para a questão ${questao.numero}.`);
      }
    }

    if (questao.tipo === "ce" && valor !== "C" && valor !== "E") {
      throw new Error(`Resposta inválida para a questão ${questao.numero}.`);
    }

    if (questao.tipo === "num") {
      const quantidadeDigitos = questao.numDigitos ?? 3;

      if (!/^[0-9]+$/.test(valor) || valor.length !== quantidadeDigitos) {
        throw new Error(`Resposta inválida para a questão ${questao.numero}.`);
      }
    }

    return {
      ...item,
      valor,
    };
  });
}

async function obterDigitalizacaoObrigatoria(id: string): Promise<FirebaseDigitalizacaoFolha> {
  const digitalizacao = await obterDigitalizacaoFirebase(id);

  if (!digitalizacao) {
    throw new Error("Digitalização não encontrada.");
  }

  return digitalizacao;
}

function mapDigitalizacao(digitalizacao: {
  id: string;
  avaliacaoId: string;
  folhaId?: string | null;
  modeloId?: string | null;
  alunoId?: string | null;
  arquivoOriginal: string;
  mimeOriginal: string;
  paginaOrigem: number;
  paginaModelo?: number | null;
  rotacao: number;
  recorte: unknown;
  storagePath: string;
  larguraPx: number;
  alturaPx: number;
  tamanhoBytes: string;
  resultadoLeitura?: unknown | null;
  confiancaLeitura?: number | null;
  status: DataConnectStatusDigitalizacao;
  processadoAt?: string | null;
  createdAt: string;
  updatedAt: string;
}): FirebaseDigitalizacaoFolha {
  const tamanhoBytes = Number(digitalizacao.tamanhoBytes);

  if (!Number.isSafeInteger(tamanhoBytes) || tamanhoBytes < 0) {
    throw new Error("A digitalização possui tamanho inválido.");
  }

  return {
    id: digitalizacao.id,
    avaliacaoId: digitalizacao.avaliacaoId,
    folhaId: digitalizacao.folhaId ?? null,
    modeloId: digitalizacao.modeloId ?? null,
    alunoId: digitalizacao.alunoId ?? null,
    arquivoOriginal: digitalizacao.arquivoOriginal,
    mimeOriginal: normalizeMimeOriginal(digitalizacao.mimeOriginal),
    paginaOrigem: digitalizacao.paginaOrigem,
    paginaModelo: digitalizacao.paginaModelo ?? null,
    rotacao: digitalizacao.rotacao,
    recorte: digitalizacao.recorte,
    storagePath: digitalizacao.storagePath,
    larguraPx: digitalizacao.larguraPx,
    alturaPx: digitalizacao.alturaPx,
    tamanhoBytes,
    resultadoLeitura: digitalizacao.resultadoLeitura ?? null,
    confiancaLeitura: digitalizacao.confiancaLeitura ?? null,
    status: STATUS_FROM_DATA_CONNECT[digitalizacao.status],
    processadoAt: digitalizacao.processadoAt ?? null,
    createdAt: digitalizacao.createdAt,
    updatedAt: digitalizacao.updatedAt,
  };
}

function normalizeScanBlob(imagem: Blob): Blob {
  if (!(imagem instanceof Blob)) {
    throw new Error("Arquivo da digitalização inválido.");
  }

  if (imagem.size <= 0 || imagem.size > MAX_SCAN_BYTES) {
    throw new Error("A imagem deve possuir no máximo 20 MB.");
  }

  return imagem;
}

function normalizePreparedImageMime(mime: string): "image/jpeg" | "image/png" {
  if (mime === "image/jpeg" || mime === "image/png") return mime;
  throw new Error("A imagem preparada deve estar em JPG ou PNG.");
}

function normalizeMimeOriginal(mime: string): FirebaseMimeDigitalizacao {
  if (mime !== "image/jpeg" && mime !== "image/png" && mime !== "application/pdf") {
    throw new Error("Formato original da digitalização inválido.");
  }

  return mime;
}

function normalizeFileName(value: string): string {
  const normalized = value.trim().split(/[\\/]/).pop()?.trim() ?? "";

  if (!normalized) {
    throw new Error("Nome do arquivo original inválido.");
  }

  return normalized.slice(0, 255);
}

function normalizeJsonObject(value: unknown, message: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
  } catch {
    throw new Error(message);
  }
}

function normalizeDimension(value: number, message: string): number {
  if (!Number.isInteger(value) || value <= 0 || value > 100_000) {
    throw new Error(message);
  }

  return value;
}

function normalizePositiveInteger(value: number, message: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(message);
  }

  return value;
}

function normalizeRotation(value: number): number {
  const normalized = ((value % 360) + 360) % 360;

  if (normalized !== 0 && normalized !== 90 && normalized !== 180 && normalized !== 270) {
    throw new Error("A rotação precisa ser 0°, 90°, 180° ou 270°.");
  }

  return normalized;
}

function resolveConfidence(
  directValue: number | null | undefined,
  resultValue: unknown,
): number | null {
  const candidate =
    directValue ??
    (typeof resultValue === "number"
      ? resultValue
      : typeof resultValue === "string"
        ? Number(resultValue)
        : null);

  if (candidate == null || !Number.isFinite(candidate)) {
    return null;
  }

  return Math.min(1, Math.max(0, candidate));
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

function isStorageObjectNotFound(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "storage/object-not-found"
  );
}
