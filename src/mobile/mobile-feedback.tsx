import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  MessageSquareText,
  Send,
  Share2,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { FeedbackCommentConfigurator } from "@/components/feedback-comment-configurator";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getCurrentUser } from "@/integrations/firebase/auth";
import { generateFeedbackPdf, type FeedbackResponse } from "@/lib/devolutiva-pdf";
import {
  listAlunosByTurma,
  listRespostasByAvaliacao,
  type Avaliacao,
  type Questao,
} from "@/lib/domain";
import {
  runSequentialFeedbackDelivery,
  type FeedbackDeliveryStatus,
  type FeedbackDeliveryUpdate,
} from "@/lib/feedback-delivery-queue";
import { prepareFeedbackQuestions } from "@/lib/feedback-preparation";
import { connectGmail, sendPdfWithGmail } from "@/lib/gmail-sender";

import { mobileQueryKeys } from "./mobile-query-keys";
import {
  isNativeMobileApp,
  openPdfOnDevice,
  savePdfOnDevice,
  sharePdfOnDevice,
} from "./native-device";
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
  blob: Blob;
}

interface DeliveryProgressItem {
  status: FeedbackDeliveryStatus;
  error?: string;
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
  const [fileAction, setFileAction] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [deliveryProgress, setDeliveryProgress] = useState<Record<string, DeliveryProgressItem>>(
    {},
  );
  const native = isNativeMobileApp();

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
    if (generating || sending) return;
    setSelectedIds((current) =>
      checked
        ? current.includes(studentId)
          ? current
          : [...current, studentId]
        : current.filter((id) => id !== studentId),
    );
  }

  function buildClassResponses(): FeedbackResponse[] {
    return (responsesQuery.data ?? []).map((response) => ({
      aluno_id: response.aluno_id,
      questao_id: response.questao_id,
      resposta: response.resposta,
      nota_manual: response.nota_manual ?? null,
      feedback: response.feedback ?? null,
    }));
  }

  async function generateSelected() {
    if (!selectedStudents.length || generating || sending) return;
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
      const classResponses = buildClassResponses();
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
          blob: pdf,
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

  function updateDelivery(update: FeedbackDeliveryUpdate) {
    setDeliveryProgress((current) => ({
      ...current,
      [update.id]: { status: update.status, error: update.error },
    }));
  }

  async function sendSelected() {
    if (!selectedStudents.length || sending || generating) return;
    if (!connected) {
      toast.error("Conecte-se à internet para enviar as devolutivas.");
      return;
    }
    const teacherEmail = getCurrentUser()?.email?.trim().toLowerCase();
    if (!teacherEmail) {
      toast.error("A conta do professor não possui um e-mail válido.");
      return;
    }

    setSending(true);
    setDeliveryProgress(
      Object.fromEntries(
        selectedStudents.map((student) => [
          student.id,
          { status: "queued" as FeedbackDeliveryStatus },
        ]),
      ),
    );

    try {
      const connection = await connectGmail({ expectedEmail: teacherEmail });
      const preparedQuestions = await prepareFeedbackQuestions(questions);
      const classResponses = buildClassResponses();
      const results = await runSequentialFeedbackDelivery(
        selectedStudents,
        async (student, setPhase) => {
          const recipient = student.email?.trim().toLowerCase();
          if (!recipient) throw new Error("Aluno sem e-mail cadastrado.");

          setPhase("preparing");
          await allowPaint();
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

          setPhase("sending");
          await allowPaint();
          await sendPdfWithGmail(connection, {
            to: recipient,
            subject: `Devolutiva — ${assessment.titulo}`,
            text: feedbackEmailText(student.nome, assessment.titulo, teacherEmail),
            pdf,
            filename: `devolutiva-${safeFilename(student.nome)}.pdf`,
          });
        },
        updateDelivery,
      );

      const failedIds = results
        .filter((result) => result.status === "failed")
        .map((result) => result.id);
      const sentCount = results.length - failedIds.length;
      setSelectedIds(failedIds);
      if (failedIds.length === 0) {
        toast.success(
          `${sentCount} devolutiva${sentCount === 1 ? "" : "s"} enviada${sentCount === 1 ? "" : "s"}.`,
        );
      } else {
        toast.warning(
          `${sentCount} enviada${sentCount === 1 ? "" : "s"} e ${failedIds.length} com falha.`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setDeliveryProgress((current) =>
        Object.fromEntries(
          Object.entries(current).map(([studentId, progress]) => [
            studentId,
            progress.status === "sent" || progress.status === "failed"
              ? progress
              : { status: "failed", error: message },
          ]),
        ),
      );
      toast.error(message);
    } finally {
      setSending(false);
    }
  }

  async function handleGeneratedFile(item: GeneratedFeedback, action: "open" | "save" | "share") {
    const actionId = `${item.studentId}:${action}`;
    if (fileAction) return;
    setFileAction(actionId);
    try {
      if (!native) {
        const link = document.createElement("a");
        link.href = item.url;
        link.download = item.filename;
        link.click();
      } else if (action === "open") {
        await openPdfOnDevice(item.blob, item.filename);
      } else if (action === "save") {
        await savePdfOnDevice(item.blob, item.filename);
        toast.success("Devolutiva salva na pasta Documentos/Folha.");
      } else {
        await sharePdfOnDevice(
          item.blob,
          item.filename,
          `Devolutiva · ${item.studentName}`,
          `Devolutiva da avaliação ${assessment.titulo}.`,
        );
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setFileAction(null);
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
  if (!connected && (studentsQuery.data === undefined || responsesQuery.data === undefined)) {
    return <MobileError error="Reconecte-se para carregar as devolutivas." />;
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
          description="Gere, compartilhe ou envie as devolutivas pelo Gmail autorizado."
          action={
            <Button
              type="button"
              variant="ghost"
              disabled={generating || sending}
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
            const progress = deliveryProgress[student.id];
            return (
              <label
                key={student.id}
                className={
                  checked ? "mobile-feedback-student is-selected" : "mobile-feedback-student"
                }
              >
                <Checkbox
                  checked={checked}
                  disabled={generating || sending}
                  onCheckedChange={(value) => toggleStudent(student.id, value === true)}
                />
                <span>
                  <strong>{student.nome}</strong>
                  <small>
                    {student.matricula ? `Matrícula ${student.matricula}` : "Sem matrícula"}
                    {student.email ? ` · ${student.email}` : " · sem e-mail"}
                    {progress ? ` · ${deliveryStatusLabel(progress.status)}` : ""}
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
            disabled={
              !connected || !selectedIds.length || generating || sending || !questions.length
            }
            onClick={() => void generateSelected()}
          >
            {generating ? <Loader2 className="animate-spin" /> : <FileText />}
            {generating
              ? `Gerando ${Math.min(generationProgress.done + 1, generationProgress.total)} de ${generationProgress.total}`
              : "Gerar PDFs"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={
              !connected || !selectedIds.length || generating || sending || !questions.length
            }
            onClick={() => void sendSelected()}
          >
            {sending ? <Loader2 className="animate-spin" /> : <Send />}
            {sending ? "Enviando…" : "Enviar por Gmail"}
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
            description="Abra, salve ou compartilhe cada PDF usando os recursos do Android."
          />
          <div className="mobile-card-list">
            {generated.map((item) => (
              <div key={item.studentId} className="mobile-generated-feedback">
                <CheckCircle2 />
                <span>
                  <strong>{item.studentName}</strong>
                  <small>PDF pronto</small>
                </span>
                <div className="flex shrink-0 gap-1">
                  {native && (
                    <FeedbackFileButton
                      label={`Abrir devolutiva de ${item.studentName}`}
                      loading={fileAction === `${item.studentId}:open`}
                      disabled={fileAction !== null}
                      icon={<ExternalLink />}
                      onClick={() => void handleGeneratedFile(item, "open")}
                    />
                  )}
                  <FeedbackFileButton
                    label={`Salvar devolutiva de ${item.studentName}`}
                    loading={fileAction === `${item.studentId}:save`}
                    disabled={fileAction !== null}
                    icon={<Download />}
                    onClick={() => void handleGeneratedFile(item, "save")}
                  />
                  {native && (
                    <FeedbackFileButton
                      label={`Compartilhar devolutiva de ${item.studentName}`}
                      loading={fileAction === `${item.studentId}:share`}
                      disabled={fileAction !== null}
                      icon={<Share2 />}
                      onClick={() => void handleGeneratedFile(item, "share")}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </MobileCard>
      )}

      {Object.values(deliveryProgress).some((item) => item.status === "failed") && (
        <MobileCard className="mobile-known-limitation">
          <MobileStatusPill tone="warning">Envio incompleto</MobileStatusPill>
          <p>
            Os alunos com falha continuam selecionados. Confira o e-mail, a internet e a autorização
            Google antes de tentar novamente.
          </p>
        </MobileCard>
      )}
    </div>
  );
}

function FeedbackFileButton({
  label,
  loading,
  disabled,
  icon,
  onClick,
}: {
  label: string;
  loading: boolean;
  disabled: boolean;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {loading ? <Loader2 className="animate-spin" /> : icon}
    </Button>
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

function feedbackEmailText(
  studentName: string,
  assessmentTitle: string,
  teacherEmail: string,
): string {
  return [
    `Olá, ${studentName}.`,
    "",
    `Segue em anexo a devolutiva da avaliação “${assessmentTitle}”.`,
    "",
    `Mensagem enviada por ${teacherEmail} pelo sistema Folha.`,
  ].join("\n");
}

function deliveryStatusLabel(status: FeedbackDeliveryStatus): string {
  if (status === "queued") return "aguardando envio";
  if (status === "preparing") return "preparando PDF";
  if (status === "sending") return "enviando";
  if (status === "sent") return "enviada";
  return "falha no envio";
}
