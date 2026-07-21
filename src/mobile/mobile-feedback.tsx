import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Download, FileText, Loader2, MessageSquareText } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { FeedbackCommentConfigurator } from "@/components/feedback-comment-configurator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getCurrentUser } from "@/integrations/firebase/auth";
import { generateFeedbackPdf, type FeedbackResponse } from "@/lib/devolutiva-pdf";
import {
  listAlunosByTurma,
  listRespostasByAvaliacao,
  type Aluno,
  type Avaliacao,
  type Questao,
} from "@/lib/domain";
import { prepareFeedbackQuestions } from "@/lib/feedback-preparation";

import { mobileQueryKeys } from "./mobile-query-keys";
import {
  MobileCard,
  MobileCardHeader,
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobileStatusPill,
} from "./mobile-ui";

interface GeneratedFeedback {
  studentId: string;
  studentName: string;
  url: string;
  filename: string;
}

export function MobileFeedback({
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
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [configuring, setConfiguring] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ done: 0, total: 0 });
  const [generated, setGenerated] = useState<GeneratedFeedback[]>([]);

  useEffect(
    () => () => {
      for (const item of generated) URL.revokeObjectURL(item.url);
    },
    [generated],
  );

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const selectedStudents = useMemo(
    () => students.filter((student) => selectedIds.includes(student.id)),
    [selectedIds, students],
  );
  const allSelected = students.length > 0 && selectedIds.length === students.length;

  function toggleStudent(studentId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? current.includes(studentId)
          ? current
          : [...current, studentId]
        : current.filter((id) => id !== studentId),
    );
  }

  async function generateSelected() {
    if (!selectedStudents.length || generating) return;
    const teacherEmail = getCurrentUser()?.email?.trim().toLowerCase();
    if (!teacherEmail) {
      toast.error("A conta do professor não possui um e-mail válido.");
      return;
    }

    setGenerating(true);
    setGenerationProgress({ done: 0, total: selectedStudents.length });
    const nextGenerated: GeneratedFeedback[] = [];
    try {
      const preparedQuestions = await prepareFeedbackQuestions(questions);
      const classResponses: FeedbackResponse[] = (responsesQuery.data ?? []).map((response) => ({
        aluno_id: response.aluno_id,
        questao_id: response.questao_id,
        resposta: response.resposta,
        nota_manual: response.nota_manual ?? null,
        feedback: response.feedback ?? null,
      }));
      for (const [index, student] of selectedStudents.entries()) {
        const pdf = await generateFeedbackPdf({
          assessment,
          student: {
            id: student.id,
            nome: student.nome,
            matricula: student.matricula,
            email: student.email ?? null,
          },
          questions: preparedQuestions,
          responses: classResponses.filter((response) => response.aluno_id === student.id),
          classResponses,
          teacherEmail,
        });
        nextGenerated.push({
          studentId: student.id,
          studentName: student.nome,
          url: URL.createObjectURL(pdf),
          filename: `devolutiva-${safeFilename(student.nome)}.pdf`,
        });
        setGenerationProgress({ done: index + 1, total: selectedStudents.length });
        await allowPaint();
      }

      setGenerated(nextGenerated);
      toast.success(
        `${nextGenerated.length} devolutiva${nextGenerated.length === 1 ? "" : "s"} gerada${nextGenerated.length === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      for (const item of nextGenerated) URL.revokeObjectURL(item.url);
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setGenerating(false);
    }
  }

  if (configuring) {
    return (
      <div className="mobile-feedback-configurator">
        <FeedbackCommentConfigurator
          assessmentId={assessment.id}
          selectedStudentCount={selectedIds.length}
          onBack={() => setConfiguring(false)}
        />
      </div>
    );
  }

  if (!classId) {
    return <MobileEmpty>Associe uma turma à avaliação para preparar devolutivas.</MobileEmpty>;
  }
  if (studentsQuery.isPending || responsesQuery.isPending) {
    return <MobileLoading label="Carregando devolutivas…" />;
  }
  if (studentsQuery.isError) {
    return <MobileError error={studentsQuery.error} onRetry={() => void studentsQuery.refetch()} />;
  }
  if (responsesQuery.isError) {
    return (
      <MobileError error={responsesQuery.error} onRetry={() => void responsesQuery.refetch()} />
    );
  }
  if (!students.length) {
    return <MobileEmpty>Esta turma ainda não possui alunos.</MobileEmpty>;
  }

  return (
    <div className="mobile-stack">
      <MobileCard>
        <MobileCardHeader
          title="Comentários da devolutiva"
          description="Configure a explicação comum de cada questão, incluindo texto, equações e imagens."
          action={
            <Button type="button" variant="outline" onClick={() => setConfiguring(true)}>
              <MessageSquareText /> Configurar
            </Button>
          }
        />
      </MobileCard>

      <MobileCard>
        <MobileCardHeader
          title="Escolha os alunos"
          description="A lista larga da web foi transformada em cartões selecionáveis."
          action={
            <Button
              type="button"
              variant="ghost"
              disabled={generating}
              onClick={() =>
                setSelectedIds(allSelected ? [] : students.map((student) => student.id))
              }
            >
              {allSelected ? "Limpar" : "Todos"}
            </Button>
          }
        />
        <div className="mobile-card-list">
          {students.map((student) => {
            const checked = selectedIds.includes(student.id);
            return (
              <label
                key={student.id}
                className={
                  checked ? "mobile-feedback-student is-selected" : "mobile-feedback-student"
                }
              >
                <Checkbox
                  checked={checked}
                  disabled={generating}
                  onCheckedChange={(value) => toggleStudent(student.id, value === true)}
                />
                <span>
                  <strong>{student.nome}</strong>
                  <small>
                    {student.matricula ? `Matrícula ${student.matricula}` : "Sem matrícula"}
                    {student.email ? ` · ${student.email}` : " · sem e-mail"}
                  </small>
                </span>
              </label>
            );
          })}
        </div>
        <div className="mobile-feedback-actions">
          <span>
            {selectedIds.length} aluno{selectedIds.length === 1 ? "" : "s"} selecionado
            {selectedIds.length === 1 ? "" : "s"}
          </span>
          <Button
            type="button"
            disabled={!connected || !selectedIds.length || generating || !questions.length}
            onClick={() => void generateSelected()}
          >
            {generating ? <Loader2 className="animate-spin" /> : <FileText />}
            {generating
              ? `Gerando ${Math.min(generationProgress.done + 1, generationProgress.total)} de ${generationProgress.total}`
              : "Gerar PDFs"}
          </Button>
        </div>
      </MobileCard>

      {generating && (
        <MobileCard>
          <MobileCardHeader
            title="Geração em andamento"
            description={`${generationProgress.done} de ${generationProgress.total} concluídas`}
          />
          <div className="mobile-progress-track">
            <span
              style={{
                width: `${generationProgress.total ? Math.round((generationProgress.done / generationProgress.total) * 100) : 0}%`,
              }}
            />
          </div>
        </MobileCard>
      )}

      {generated.length > 0 && (
        <MobileCard>
          <MobileCardHeader
            title="Devolutivas prontas"
            description="Baixe cada PDF. O compartilhamento nativo será integrado no próximo PR."
          />
          <div className="mobile-card-list">
            {generated.map((item) => (
              <a
                key={item.studentId}
                className="mobile-generated-feedback"
                href={item.url}
                download={item.filename}
              >
                <CheckCircle2 />
                <span>
                  <strong>{item.studentName}</strong>
                  <small>PDF pronto para baixar</small>
                </span>
                <Download />
              </a>
            ))}
          </div>
        </MobileCard>
      )}

      <MobileCard className="mobile-known-limitation">
        <MobileStatusPill tone="warning">Próximo PR</MobileStatusPill>
        <p>
          O envio pelo Gmail dentro do Android depende do login Google nativo, que foi deixado
          explicitamente para a próxima etapa. A configuração e a geração completa dos PDFs já usam
          os mesmos dados e cálculos da web.
        </p>
      </MobileCard>
    </div>
  );
}

function safeFilename(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9._-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^[-.]+|[-.]+$/g, "")
      .toLowerCase() || "aluno"
  );
}

function allowPaint(): Promise<void> {
  return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
}
