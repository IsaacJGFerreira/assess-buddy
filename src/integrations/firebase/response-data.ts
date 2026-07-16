import {
  atualizarRespostaAluno,
  criarRespostaAluno,
  excluirRespostaAluno,
  listarMinhasRespostasPorAluno,
  listarMinhasRespostasPorAvaliacao,
  obterMinhaRespostaPorAlunoEQuestao,
} from "@assess-buddy/dataconnect";

import { getFirebaseDataConnect } from "./dataconnect";

export interface FirebaseRespostaAluno {
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

export interface SalvarRespostaAlunoInput {
  avaliacaoId: string;
  turmaId: string;
  alunoId: string;
  questaoId: string;
  resposta?: string | null;
  notaManual?: number | null;
  feedback?: string | null;
}

interface ValoresResposta {
  resposta: string | null;
  notaManual: number | null;
  feedback: string | null;
}

interface IdentidadeResposta {
  avaliacaoId: string;
  alunoId: string;
  questaoId: string;
}

export async function listarRespostasPorAvaliacaoFirebase(
  avaliacaoId: string,
): Promise<FirebaseRespostaAluno[]> {
  const result = await listarMinhasRespostasPorAvaliacao(getFirebaseDataConnect(), {
    avaliacaoId: normalizeRequiredText(avaliacaoId, "Avaliação inválida."),
  });

  return result.data.respostasAluno.map(mapResposta);
}

export async function listarRespostasPorAlunoFirebase(
  avaliacaoId: string,
  alunoId: string,
): Promise<FirebaseRespostaAluno[]> {
  const result = await listarMinhasRespostasPorAluno(getFirebaseDataConnect(), {
    avaliacaoId: normalizeRequiredText(avaliacaoId, "Avaliação inválida."),
    alunoId: normalizeRequiredText(alunoId, "Aluno inválido."),
  });

  return result.data.respostasAluno.map(mapResposta);
}

export async function obterRespostaFirebase(
  avaliacaoId: string,
  alunoId: string,
  questaoId: string,
): Promise<FirebaseRespostaAluno | null> {
  const identidade = normalizeIdentidade({
    avaliacaoId,
    alunoId,
    questaoId,
  });

  const result = await obterMinhaRespostaPorAlunoEQuestao(getFirebaseDataConnect(), identidade);

  const resposta = result.data.respostasAluno[0];

  return resposta ? mapResposta(resposta) : null;
}

export async function salvarRespostaFirebase(
  input: SalvarRespostaAlunoInput,
): Promise<FirebaseRespostaAluno> {
  const identidade = normalizeIdentidade(input);
  const turmaId = normalizeRequiredText(input.turmaId, "Turma inválida.");

  const existente = await obterRespostaFirebase(
    identidade.avaliacaoId,
    identidade.alunoId,
    identidade.questaoId,
  );

  if (existente) {
    return atualizarRespostaExistente(existente, identidade, mergeValores(existente, input));
  }

  const valores = mergeValores(null, input);

  try {
    await criarRespostaAluno(getFirebaseDataConnect(), {
      ...identidade,
      turmaId,
      ...valores,
    });
  } catch (error) {
    /*
     * Outra gravação pode ter criado a mesma resposta entre a consulta
     * e a inserção. Nesse caso, buscamos novamente e atualizamos.
     */
    const criadaEmParalelo = await obterRespostaFirebase(
      identidade.avaliacaoId,
      identidade.alunoId,
      identidade.questaoId,
    );

    if (!criadaEmParalelo) {
      throw error;
    }

    return atualizarRespostaExistente(
      criadaEmParalelo,
      identidade,
      mergeValores(criadaEmParalelo, input),
    );
  }

  const criada = await obterRespostaFirebase(
    identidade.avaliacaoId,
    identidade.alunoId,
    identidade.questaoId,
  );

  if (!criada) {
    throw new Error("A resposta foi salva, mas não pôde ser carregada.");
  }

  return criada;
}

export async function salvarRespostasFirebase(
  inputs: SalvarRespostaAlunoInput[],
): Promise<FirebaseRespostaAluno[]> {
  const respostas: FirebaseRespostaAluno[] = [];

  for (const input of inputs) {
    respostas.push(await salvarRespostaFirebase(input));
  }

  return respostas;
}

export async function excluirRespostaFirebase(id: string): Promise<void> {
  const result = await excluirRespostaAluno(getFirebaseDataConnect(), {
    id: normalizeRequiredText(id, "Resposta inválida."),
  });

  if (!result.data.respostaAluno_delete) {
    throw new Error("Resposta não encontrada ou sem permissão para exclusão.");
  }
}

async function atualizarRespostaExistente(
  existente: FirebaseRespostaAluno,
  identidade: IdentidadeResposta,
  valores: ValoresResposta,
): Promise<FirebaseRespostaAluno> {
  const result = await atualizarRespostaAluno(getFirebaseDataConnect(), {
    id: existente.id,
    ...valores,
  });

  if (!result.data.respostaAluno_update) {
    throw new Error("Resposta não encontrada ou sem permissão para alteração.");
  }

  const atualizada = await obterRespostaFirebase(
    identidade.avaliacaoId,
    identidade.alunoId,
    identidade.questaoId,
  );

  if (!atualizada) {
    throw new Error("A resposta foi atualizada, mas não pôde ser carregada.");
  }

  return atualizada;
}

function mergeValores(
  existente: FirebaseRespostaAluno | null,
  input: Pick<SalvarRespostaAlunoInput, "resposta" | "notaManual" | "feedback">,
): ValoresResposta {
  return {
    resposta:
      input.resposta === undefined
        ? (existente?.resposta ?? null)
        : normalizeNullableText(input.resposta),
    notaManual:
      input.notaManual === undefined
        ? (existente?.notaManual ?? null)
        : normalizeOptionalNumber(input.notaManual, "Informe uma nota manual válida."),
    feedback:
      input.feedback === undefined
        ? (existente?.feedback ?? null)
        : normalizeNullableText(input.feedback),
  };
}

function normalizeIdentidade(input: IdentidadeResposta): IdentidadeResposta {
  return {
    avaliacaoId: normalizeRequiredText(input.avaliacaoId, "Avaliação inválida."),
    alunoId: normalizeRequiredText(input.alunoId, "Aluno inválido."),
    questaoId: normalizeRequiredText(input.questaoId, "Questão inválida."),
  };
}

function mapResposta(resposta: {
  id: string;
  avaliacaoId: string;
  alunoId: string;
  questaoId: string;
  resposta?: string | null;
  notaManual?: number | null;
  feedback?: string | null;
  createdAt: string;
  updatedAt: string;
}): FirebaseRespostaAluno {
  return {
    id: resposta.id,
    avaliacaoId: resposta.avaliacaoId,
    alunoId: resposta.alunoId,
    questaoId: resposta.questaoId,
    resposta: resposta.resposta ?? null,
    notaManual: resposta.notaManual == null ? null : Number(resposta.notaManual),
    feedback: resposta.feedback ?? null,
    createdAt: resposta.createdAt,
    updatedAt: resposta.updatedAt,
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

function normalizeOptionalNumber(
  value: number | null | undefined,
  errorMessage: string,
): number | null {
  if (value == null) return null;

  if (!Number.isFinite(value)) {
    throw new Error(errorMessage);
  }

  return value;
}
