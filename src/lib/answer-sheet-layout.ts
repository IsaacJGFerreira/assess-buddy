export type AnswerSheetOrientation = "portrait" | "landscape";

export interface AnswerSheetLayout {
  columns: number;
  rowsPerColumn: number;
  orientation: AnswerSheetOrientation;
}

export const DEFAULT_ANSWER_SHEET_LAYOUT: AnswerSheetLayout = {
  columns: 2,
  rowsPerColumn: 35,
  orientation: "portrait",
};
