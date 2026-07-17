export interface QuestionWithOptions {
  tipo: string;
  qtd_alternativas: number | null;
}

export function alternativas(question: QuestionWithOptions): string[] {
  if (question.tipo === "mc") {
    const count = question.qtd_alternativas ?? 5;
    return ["A", "B", "C", "D", "E", "F", "G"].slice(0, count);
  }
  if (question.tipo === "ce") return ["C", "E"];
  return [];
}
