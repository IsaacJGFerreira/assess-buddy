export type AnswerSheetOrientation = "portrait" | "landscape";

export interface AnswerSheetLayout {
  columns: number;
  rowsPerColumn: number;
  orientation: AnswerSheetOrientation;
}

export const DEFAULT_ANSWER_SHEET_LAYOUT: AnswerSheetLayout = {
  columns: 5,
  rowsPerColumn: 20,
  orientation: "landscape",
};
