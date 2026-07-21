import { useQuery } from "@tanstack/react-query";
import { BarChart3 } from "lucide-react";

import { buildAssessmentReport } from "@/lib/assessment-report";
import {
  listAlunosByTurma,
  listRespostasByAvaliacao,
  type Avaliacao,
  type Questao,
} from "@/lib/domain";

import { mobileQueryKeys } from "./mobile-query-keys";
import { MobileCard, MobileCardHeader, MobileEmpty, MobileError, MobileLoading } from "./mobile-ui";

export function MobileReport({
  assessment,
  questions,
  connected,
}: {
  assessment: Avaliacao;
  questions: Questao[];
  connected: boolean;
}) {
  const classId = assessment.turma_id;
  const studentsQuery = useQuery({
    queryKey: mobileQueryKeys.students(classId ?? ""),
    queryFn: () => (classId ? listAlunosByTurma(classId) : Promise.resolve([])),
    enabled: connected && Boolean(classId),
  });
  const responsesQuery = useQuery({
    queryKey: mobileQueryKeys.responses(assessment.id),
    queryFn: () => listRespostasByAvaliacao(assessment.id),
    enabled: connected,
  });

  if (!classId) {
    return <MobileEmpty>Associe uma turma à avaliação para gerar o relatório.</MobileEmpty>;
  }
  if (!connected && (studentsQuery.data === undefined || responsesQuery.data === undefined)) {
    return <MobileError error="Reconecte-se para calcular o relatório." />;
  }
  if (studentsQuery.isPending || responsesQuery.isPending) {
    return <MobileLoading label="Calculando relatório…" />;
  }
  if (studentsQuery.isError) {
    return <MobileError error={studentsQuery.error} onRetry={() => void studentsQuery.refetch()} />;
  }
  if (responsesQuery.isError) {
    return (
      <MobileError error={responsesQuery.error} onRetry={() => void responsesQuery.refetch()} />
    );
  }
  if (!questions.length || !studentsQuery.data?.length) {
    return <MobileEmpty>Cadastre questões e alunos para visualizar os indicadores.</MobileEmpty>;
  }

  const report = buildAssessmentReport(questions, studentsQuery.data, responsesQuery.data ?? []);

  return (
    <div className="mobile-stack">
      <div className="mobile-stat-grid is-four">
        <ReportStat label="Média" value={report.summary.average.toFixed(2)} />
        <ReportStat label="Mediana" value={report.summary.median.toFixed(2)} />
        <ReportStat label="Maior" value={report.summary.highest.toFixed(2)} />
        <ReportStat label="Menor" value={report.summary.lowest.toFixed(2)} />
      </div>

      <MobileCard>
        <MobileCardHeader
          title="Notas por aluno"
          description="As notas discursivas manuais já entram no total."
        />
        <div className="mobile-card-list">
          {report.studentResults.map((item) => (
            <article key={item.aluno.id} className="mobile-report-student">
              <div>
                <strong>{item.aluno.nome}</strong>
                <span>
                  {item.acertos} acertos · {item.erros} erros · {item.branco} em branco
                </span>
              </div>
              <b>{item.nota.toFixed(2)}</b>
            </article>
          ))}
        </div>
      </MobileCard>

      <MobileCard>
        <MobileCardHeader
          title="Aproveitamento por questão"
          description="Percentual calculado pela mesma correção usada na web."
        />
        <div className="mobile-card-list">
          {report.questionResults.map(({ questao, correct, total, percent }) => (
            <article key={questao.id} className="mobile-question-performance">
              <div className="mobile-question-performance-title">
                <span className="mobile-question-number">{questao.numero}</span>
                <div>
                  <strong>{questao.conteudo || `Questão ${questao.numero}`}</strong>
                  <p>
                    {correct}/{total} respostas corretas
                  </p>
                </div>
                <b>{percent}%</b>
              </div>
              <div className="mobile-progress-track" aria-label={`${percent}% de aproveitamento`}>
                <span style={{ width: `${percent}%` }} />
              </div>
            </article>
          ))}
        </div>
      </MobileCard>
    </div>
  );
}

function ReportStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="mobile-stat-card is-static">
      <BarChart3 />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
