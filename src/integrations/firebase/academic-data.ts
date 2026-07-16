import {
  atualizarAluno,
  atualizarTurma,
  criarAluno,
  criarTurma,
  excluirAluno,
  excluirTurma,
  listarMeusAlunosPorTurma,
  listarMinhasTurmas,
  meuPerfil,
  obterMeuAluno,
  obterMinhaTurma,
  salvarMeuPerfil,
} from "@assess-buddy/dataconnect";

import { getFirebaseDataConnect } from "./dataconnect";

export interface FirebaseProfessorProfile {
  uid: string;
  nome: string | null;
  email: string | null;
  escola: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FirebaseTurma {
  id: string;
  nome: string;
  serie: string | null;
  ano: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface FirebaseAluno {
  id: string;
  turmaId: string;
  nome: string;
  matricula: string | null;
  chamada: number | null;
  email: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalvarPerfilInput {
  nome?: string | null;
  email?: string | null;
  escola?: string | null;
}

export interface CriarTurmaInput {
  nome: string;
  serie?: string | null;
  ano?: number | null;
}

export interface AtualizarTurmaInput extends CriarTurmaInput {
  id: string;
}

export interface CriarAlunoInput {
  turmaId: string;
  nome: string;
  matricula?: string | null;
  chamada?: number | null;
  email?: string | null;
}

export interface AtualizarAlunoInput extends CriarAlunoInput {
  id: string;
}

export async function buscarMeuPerfil(): Promise<FirebaseProfessorProfile | null> {
  const result = await meuPerfil(getFirebaseDataConnect());
  const profile = result.data.professors[0];

  if (!profile) return null;

  return {
    uid: profile.uid,
    nome: profile.nome ?? null,
    email: profile.email ?? null,
    escola: profile.escola ?? null,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

export async function salvarPerfil(input: SalvarPerfilInput): Promise<FirebaseProfessorProfile> {
  await salvarMeuPerfil(getFirebaseDataConnect(), {
    nome: normalizeNullableText(input.nome),
    email: normalizeEmail(input.email),
    escola: normalizeNullableText(input.escola),
  });

  const profile = await buscarMeuPerfil();

  if (!profile) {
    throw new Error("O perfil foi salvo, mas não pôde ser carregado.");
  }

  return profile;
}

export async function listarTurmasFirebase(): Promise<FirebaseTurma[]> {
  const result = await listarMinhasTurmas(getFirebaseDataConnect());

  return result.data.turmas.map(mapTurma);
}

export async function obterTurmaFirebase(id: string): Promise<FirebaseTurma | null> {
  const result = await obterMinhaTurma(getFirebaseDataConnect(), { id });
  const turma = result.data.turmas[0];

  return turma ? mapTurma(turma) : null;
}

export async function criarTurmaFirebase(input: CriarTurmaInput): Promise<FirebaseTurma> {
  const result = await criarTurma(getFirebaseDataConnect(), {
    nome: normalizeRequiredText(input.nome, "Informe o nome da turma."),
    serie: normalizeNullableText(input.serie),
    ano: input.ano ?? null,
  });

  const turma = await obterTurmaFirebase(result.data.turma_insert.id);

  if (!turma) {
    throw new Error("A turma foi criada, mas não pôde ser carregada.");
  }

  return turma;
}

export async function atualizarTurmaFirebase(input: AtualizarTurmaInput): Promise<FirebaseTurma> {
  const result = await atualizarTurma(getFirebaseDataConnect(), {
    id: input.id,
    nome: normalizeRequiredText(input.nome, "Informe o nome da turma."),
    serie: normalizeNullableText(input.serie),
    ano: input.ano ?? null,
  });

  if (!result.data.turma_update) {
    throw new Error("Turma não encontrada ou sem permissão para alteração.");
  }

  const turma = await obterTurmaFirebase(input.id);

  if (!turma) {
    throw new Error("A turma foi atualizada, mas não pôde ser carregada.");
  }

  return turma;
}

export async function excluirTurmaFirebase(id: string): Promise<void> {
  const result = await excluirTurma(getFirebaseDataConnect(), { id });

  if (!result.data.turma_delete) {
    throw new Error("Turma não encontrada ou sem permissão para exclusão.");
  }
}

export async function listarAlunosFirebase(turmaId: string): Promise<FirebaseAluno[]> {
  const result = await listarMeusAlunosPorTurma(getFirebaseDataConnect(), {
    turmaId,
  });

  return result.data.alunos.map(mapAluno);
}

export async function obterAlunoFirebase(id: string): Promise<FirebaseAluno | null> {
  const result = await obterMeuAluno(getFirebaseDataConnect(), { id });
  const aluno = result.data.alunos[0];

  return aluno ? mapAluno(aluno) : null;
}

export async function criarAlunoFirebase(input: CriarAlunoInput): Promise<FirebaseAluno> {
  const result = await criarAluno(getFirebaseDataConnect(), {
    turmaId: input.turmaId,
    nome: normalizeRequiredText(input.nome, "Informe o nome do aluno."),
    matricula: normalizeNullableText(input.matricula),
    chamada: input.chamada ?? null,
    email: normalizeEmail(input.email),
  });

  const aluno = await obterAlunoFirebase(result.data.aluno_insert.id);

  if (!aluno) {
    throw new Error("O aluno foi criado, mas não pôde ser carregado.");
  }

  return aluno;
}

export async function criarAlunosFirebase(inputs: CriarAlunoInput[]): Promise<FirebaseAluno[]> {
  const alunos: FirebaseAluno[] = [];

  for (const input of inputs) {
    alunos.push(await criarAlunoFirebase(input));
  }

  return alunos;
}

export async function atualizarAlunoFirebase(input: AtualizarAlunoInput): Promise<FirebaseAluno> {
  const result = await atualizarAluno(getFirebaseDataConnect(), {
    id: input.id,
    turmaId: input.turmaId,
    nome: normalizeRequiredText(input.nome, "Informe o nome do aluno."),
    matricula: normalizeNullableText(input.matricula),
    chamada: input.chamada ?? null,
    email: normalizeEmail(input.email),
  });

  if (!result.data.aluno_update) {
    throw new Error("Aluno não encontrado ou sem permissão para alteração.");
  }

  const aluno = await obterAlunoFirebase(input.id);

  if (!aluno) {
    throw new Error("O aluno foi atualizado, mas não pôde ser carregado.");
  }

  return aluno;
}

export async function excluirAlunoFirebase(id: string): Promise<void> {
  const result = await excluirAluno(getFirebaseDataConnect(), { id });

  if (!result.data.aluno_delete) {
    throw new Error("Aluno não encontrado ou sem permissão para exclusão.");
  }
}

function mapTurma(turma: {
  id: string;
  nome: string;
  serie?: string | null;
  ano?: number | null;
  createdAt: string;
  updatedAt: string;
}): FirebaseTurma {
  return {
    id: turma.id,
    nome: turma.nome,
    serie: turma.serie ?? null,
    ano: turma.ano ?? null,
    createdAt: turma.createdAt,
    updatedAt: turma.updatedAt,
  };
}

function mapAluno(aluno: {
  id: string;
  turmaId: string;
  nome: string;
  matricula?: string | null;
  chamada?: number | null;
  email?: string | null;
  createdAt: string;
  updatedAt: string;
}): FirebaseAluno {
  return {
    id: aluno.id,
    turmaId: aluno.turmaId,
    nome: aluno.nome,
    matricula: aluno.matricula ?? null,
    chamada: aluno.chamada ?? null,
    email: aluno.email ?? null,
    createdAt: aluno.createdAt,
    updatedAt: aluno.updatedAt,
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

function normalizeEmail(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase() ?? "";

  return normalized || null;
}
