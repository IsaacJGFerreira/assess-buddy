import Papa from "papaparse";

import type { CriarAlunoInput } from "@/integrations/firebase/academic-data";

export interface StudentFields {
  nome: string;
  matricula: string;
  email: string;
}

export function validateStudentFields({ nome, matricula, email }: StudentFields): void {
  if (!nome.trim()) throw new Error("Informe o nome do aluno.");
  if (matricula && !/^\d+$/.test(matricula)) {
    throw new Error("A matrícula deve conter somente números.");
  }
  if (email && !isValidEmail(email)) {
    throw new Error("Informe um e-mail válido para o aluno.");
  }
}

export async function parseStudentCsvFile(file: File, classId: string): Promise<CriarAlunoInput[]> {
  return normalizeStudentCsvRows(await parseCsv(file), classId);
}

export function normalizeStudentCsvRows(
  rows: Record<string, string>[],
  classId: string,
): CriarAlunoInput[] {
  const invalidEnrollmentRows = rows.flatMap((row, index) => {
    const value = csvValue(row, ["matricula", "Matricula", "MATRICULA"]);
    return value && !/^\d+$/.test(value) ? [index + 2] : [];
  });
  if (invalidEnrollmentRows.length > 0) {
    throw new Error(
      `Matrícula inválida nas linhas ${summarizeRows(invalidEnrollmentRows)}. Use somente números.`,
    );
  }

  const invalidEmailRows = rows.flatMap((row, index) => {
    const value = csvValue(row, ["email", "Email", "EMAIL", "e_mail"]);
    return value && !isValidEmail(value) ? [index + 2] : [];
  });
  if (invalidEmailRows.length > 0) {
    throw new Error(`E-mail inválido nas linhas ${summarizeRows(invalidEmailRows)}.`);
  }

  const normalized = rows
    .map((row) => ({
      turmaId: classId,
      nome: csvValue(row, ["nome", "Nome", "NOME"]),
      matricula: csvValue(row, ["matricula", "Matricula", "MATRICULA"]) || null,
      email: csvValue(row, ["email", "Email", "EMAIL", "e_mail"]).toLowerCase() || null,
    }))
    .filter((row) => row.nome);

  if (!normalized.length) {
    throw new Error("Nenhuma linha válida. A coluna 'nome' é obrigatória.");
  }
  return normalized;
}

export function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function parseCsv(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => resolve(result.data),
      error: (error) => reject(error),
    });
  });
}

function csvValue(row: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const value = row[key];
    if (value) return value.trim();
  }
  return "";
}

function summarizeRows(rows: number[]): string {
  return `${rows.slice(0, 5).join(", ")}${rows.length > 5 ? "…" : ""}`;
}
