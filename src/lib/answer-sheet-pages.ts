import type { AnswerSheetLayout } from "@/lib/answer-sheet-layout";
import type { Questao } from "@/lib/domain";

export type AnswerSheetPageDescriptor =
  | { kind: "main"; questions: Questao[]; numericQuestions: Questao[] }
  | { kind: "numeric"; questions: Questao[]; numericQuestions: Questao[] };

export function buildAnswerSheetPages(
  questions: Questao[],
  layout: AnswerSheetLayout,
): AnswerSheetPageDescriptor[] {
  const capacity = Math.max(1, layout.columns * layout.rowsPerColumn);
  const groups = chunk(questions, capacity);
  if (groups.length === 0) groups.push([]);

  return groups.flatMap((pageQuestions) => {
    const numericQuestions = pageQuestions.filter((question) => question.tipo === "num");
    const numericOnMainPage = layout.columns < 6 ? numericQuestions.slice(0, 4) : [];
    const numericOverflow = layout.columns < 6 ? numericQuestions.slice(4) : numericQuestions;
    const supplements = chunk(numericOverflow, layout.orientation === "landscape" ? 8 : 6);

    return [
      {
        kind: "main",
        questions: pageQuestions,
        numericQuestions: numericOnMainPage,
      } as AnswerSheetPageDescriptor,
      ...supplements.map((items) => ({
        kind: "numeric" as const,
        questions: [],
        numericQuestions: items,
      })),
    ];
  });
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
