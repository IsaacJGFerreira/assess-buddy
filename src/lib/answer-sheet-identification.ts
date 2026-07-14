import type { Aluno } from "@/lib/domain";

export type AnswerSheetIdentificationMode = "none" | "blank" | "prefilled";

export const DEFAULT_IDENTIFIER_DIGITS = 6;
export const MIN_IDENTIFIER_DIGITS = 2;
export const MAX_IDENTIFIER_DIGITS = 12;

export interface MatriculaReadingLike {
  value: string | null;
  status: "confident" | "blank" | "ambiguous" | "reviewed";
  requiresReview: boolean;
}

export type MatriculaResolutionStatus =
  "not_present" | "blank" | "linked" | "not_found" | "inconsistent";

export interface MatriculaResolution {
  status: MatriculaResolutionStatus;
  value: string | null;
  studentId: string | null;
  studentName: string | null;
  matchingStudentIds: string[];
}

export function normalizeNumericMatricula(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || !/^[\d\s./-]+$/.test(trimmed)) return null;
  const digits = trimmed.replace(/\D/g, "");
  return digits || null;
}

export function formatMatriculaForSheet(
  value: string | null | undefined,
  identifierDigits: number,
): string | null {
  const normalized = normalizeNumericMatricula(value);
  const digits = clampIdentifierDigits(identifierDigits);
  if (!normalized || normalized.length > digits) return null;
  return normalized.padStart(digits, "0");
}

export function determineIdentifierDigits(alunos: Aluno[]): number {
  const longest = alunos.reduce((maximum, aluno) => {
    const matricula = normalizeNumericMatricula(aluno.matricula);
    return Math.max(maximum, matricula?.length ?? 0);
  }, 0);
  return clampIdentifierDigits(longest || DEFAULT_IDENTIFIER_DIGITS);
}

export function isStudentEligibleForPrefilledSheet(
  aluno: Aluno,
  identifierDigits: number,
): boolean {
  return formatMatriculaForSheet(aluno.matricula, identifierDigits) !== null;
}

export function resolveMatriculaReading(
  reading: MatriculaReadingLike | null,
  alunos: Aluno[],
  identifierDigits: number,
): MatriculaResolution {
  if (!reading) return emptyResolution("not_present");
  if (reading.status === "blank" && !reading.requiresReview) return emptyResolution("blank");
  if (reading.requiresReview || reading.status === "ambiguous" || !reading.value) {
    return { ...emptyResolution("inconsistent"), value: reading.value };
  }

  const value = formatMatriculaForSheet(reading.value, identifierDigits);
  if (!value) return { ...emptyResolution("inconsistent"), value: reading.value };

  const matches = alunos.filter(
    (aluno) => formatMatriculaForSheet(aluno.matricula, identifierDigits) === value,
  );
  if (matches.length === 0) {
    return { ...emptyResolution("not_found"), value };
  }
  if (matches.length > 1) {
    return {
      ...emptyResolution("inconsistent"),
      value,
      matchingStudentIds: matches.map((aluno) => aluno.id),
    };
  }
  return {
    status: "linked",
    value,
    studentId: matches[0].id,
    studentName: matches[0].nome,
    matchingStudentIds: [matches[0].id],
  };
}

export function clampIdentifierDigits(value: number): number {
  return Math.min(MAX_IDENTIFIER_DIGITS, Math.max(MIN_IDENTIFIER_DIGITS, Math.round(value)));
}

function emptyResolution(status: MatriculaResolutionStatus): MatriculaResolution {
  return {
    status,
    value: null,
    studentId: null,
    studentName: null,
    matchingStudentIds: [],
  };
}
