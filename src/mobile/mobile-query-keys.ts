export const mobileQueryKeys = {
  classes: ["firebase-turmas"] as const,
  assessments: ["avaliacoes"] as const,
  students: (classId: string) => ["firebase-alunos", classId] as const,
  assessment: (assessmentId: string) => ["firebase-avaliacao", assessmentId] as const,
  questions: (assessmentId: string) => ["firebase-questoes", assessmentId] as const,
  responses: (assessmentId: string) => ["firebase-respostas", assessmentId] as const,
  latestSheetModel: (assessmentId: string) => ["firebase-modelo-folha", assessmentId] as const,
  sheetModels: (assessmentId: string) => ["answer-sheet-models", assessmentId] as const,
};
