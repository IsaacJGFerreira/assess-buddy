import { calcularNotaAluno, corrigirQuestao } from "@/lib/assessment-grading";
import type { Aluno, Questao, Resposta } from "@/lib/domain";

export interface StudentAssessmentResult {
  aluno: Aluno;
  nota: number;
  acertos: number;
  erros: number;
  branco: number;
  anuladas: number;
}

export interface QuestionAssessmentResult {
  questao: Questao;
  correct: number;
  total: number;
  percent: number;
}

export interface AssessmentReport {
  studentResults: StudentAssessmentResult[];
  questionResults: QuestionAssessmentResult[];
  summary: {
    average: number;
    median: number;
    highest: number;
    lowest: number;
  };
}

export function buildAssessmentReport(
  questions: Questao[],
  students: Aluno[],
  responses: Resposta[],
): AssessmentReport {
  const responsesByStudent = new Map<string, Resposta[]>();
  const responsesByStudentAndQuestion = new Map<string, Resposta>();

  for (const response of responses) {
    const studentResponses = responsesByStudent.get(response.aluno_id) ?? [];
    studentResponses.push(response);
    responsesByStudent.set(response.aluno_id, studentResponses);
    responsesByStudentAndQuestion.set(
      responseKey(response.aluno_id, response.questao_id),
      response,
    );
  }

  const studentResults = students.map((aluno) => ({
    aluno,
    ...calcularNotaAluno(questions, responsesByStudent.get(aluno.id) ?? []),
  }));
  const sortedScores = studentResults.map((item) => item.nota).sort((left, right) => left - right);
  const middle = Math.floor(sortedScores.length / 2);
  const average = sortedScores.length
    ? sortedScores.reduce((sum, value) => sum + value, 0) / sortedScores.length
    : 0;
  const median = sortedScores.length
    ? sortedScores.length % 2
      ? sortedScores[middle]
      : (sortedScores[middle - 1] + sortedScores[middle]) / 2
    : 0;

  const questionResults = questions.map((questao) => {
    let correct = 0;
    let total = 0;

    for (const aluno of students) {
      const response = responsesByStudentAndQuestion.get(responseKey(aluno.id, questao.id));
      if (!response?.resposta) continue;
      total += 1;
      if (corrigirQuestao(questao, response.resposta).situacao === "correta") correct += 1;
    }

    return {
      questao,
      correct,
      total,
      percent: total ? Math.round((correct / total) * 100) : 0,
    };
  });

  return {
    studentResults,
    questionResults,
    summary: {
      average,
      median,
      highest: sortedScores.at(-1) ?? 0,
      lowest: sortedScores[0] ?? 0,
    },
  };
}

function responseKey(studentId: string, questionId: string): string {
  return `${studentId}:${questionId}`;
}
