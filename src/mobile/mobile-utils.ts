export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function parseOptionalInteger(value: string): number | null {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) throw new Error("Informe um número inteiro válido.");
  return parsed;
}

export function parseNonNegativeDecimal(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

export function formatDecimal(value: number): string {
  return String(Math.round(value * 100) / 100);
}
