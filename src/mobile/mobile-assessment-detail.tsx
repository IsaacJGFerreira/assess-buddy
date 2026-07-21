import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart3,
  ClipboardCheck,
  FileCheck2,
  FileText,
  Loader2,
  MessageSquareText,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  deleteAvaliacao,
  getAvaliacao,
  listQuestoes,
  listTurmas,
  STATUS_LABEL,
  updateAvaliacao,
  type Avaliacao,
  type StatusAvaliacao,
} from "@/lib/domain";

import type { MobileAssessmentSection, MobileRoute } from "./mobile-navigation";
import { mobileQueryKeys } from "./mobile-query-keys";
import { MobileCorrection } from "./mobile-correction";
import { MobileFeedback } from "./mobile-feedback";
import { MobileQuestions } from "./mobile-questions";
import { MobileReport } from "./mobile-report";
import { MobileSheet } from "./mobile-sheet";
import {
  MobileCard,
  MobileCardHeader,
  MobileError,
  MobileField,
  MobileLoading,
  MobileNativeSelect,
  MobilePage,
  MobileStatusPill,
} from "./mobile-ui";
import { parseNonNegativeDecimal } from "./mobile-utils";

const sections: Array<{
  value: MobileAssessmentSection;
  label: string;
  icon: ReactNode;
}> = [
  { value: "details", label: "Dados", icon: <Settings2 /> },
  { value: "questions", label: "Questões", icon: <FileCheck2 /> },
  { value: "sheet", label: "Folha", icon: <FileText /> },
  { value: "correction", label: "Correção", icon: <ClipboardCheck /> },
  { value: "report", label: "Relatório", icon: <BarChart3 /> },
  { value: "feedback", label: "Devolutiva", icon: <MessageSquareText /> },
];

export function MobileAssessmentDetail({
  assessmentId,
  section,
  connected,
  onNavigate,
}: {
  assessmentId: string;
  section: MobileAssessmentSection;
  connected: boolean;
  onNavigate: (route: MobileRoute) => void;
}) {
  const assessmentQuery = useQuery({
    queryKey: mobileQueryKeys.assessment(assessmentId),
    queryFn: () => getAvaliacao(assessmentId),
    enabled: connected,
  });
  const questionsQuery = useQuery({
    queryKey: mobileQueryKeys.questions(assessmentId),
    queryFn: () => listQuestoes(assessmentId),
    enabled: connected,
  });

  const assessment = assessmentQuery.data;
  const questions = questionsQuery.data;
  const hasCachedAssessment = Boolean(assessment) && questions !== undefined;

  if (!connected && !hasCachedAssessment) {
    return (
      <MobilePage title="Avaliação">
        <MobileError error="Reconecte-se para carregar a avaliação." />
      </MobilePage>
    );
  }
  if (!hasCachedAssessment && (assessmentQuery.isPending || questionsQuery.isPending)) {
    return <MobileLoading label="Carregando avaliação…" />;
  }
  if (!assessment && assessmentQuery.isError) {
    return (
      <MobileError error={assessmentQuery.error} onRetry={() => void assessmentQuery.refetch()} />
    );
  }
  if (questions === undefined && questionsQuery.isError) {
    return (
      <MobileError error={questionsQuery.error} onRetry={() => void questionsQuery.refetch()} />
    );
  }
  if (!assessment || questions === undefined) {
    return <MobileError error="Não foi possível carregar a avaliação." />;
  }

  return (
    <MobilePage
      title={assessment.titulo}
      description={`${assessment.disciplina ?? "Sem disciplina"} · ${questions.length} questão${questions.length === 1 ? "" : "ões"}`}
      action={<MobileStatusPill>{STATUS_LABEL[assessment.status]}</MobileStatusPill>}
    >
      <nav className="mobile-section-nav" aria-label="Seções da avaliação">
        {sections.map((item) => (
          <button
            type="button"
            key={item.value}
            className={section === item.value ? "is-active" : ""}
            aria-current={section === item.value ? "page" : undefined}
            onClick={() => onNavigate({ kind: "assessment", assessmentId, section: item.value })}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      {section === "details" && (
        <MobileAssessmentDetails
          assessment={assessment}
          connected={connected}
          onDeleted={() => onNavigate({ kind: "assessments" })}
        />
      )}
      {section === "questions" && (
        <MobileQuestions assessmentId={assessmentId} questions={questions} connected={connected} />
      )}
      {section === "sheet" && (
        <MobileSheet assessment={assessment} questions={questions} connected={connected} />
      )}
      {section === "correction" && (
        <MobileCorrection assessment={assessment} questions={questions} connected={connected} />
      )}
      {section === "report" && (
        <MobileReport assessment={assessment} questions={questions} connected={connected} />
      )}
      {section === "feedback" && (
        <MobileFeedback assessment={assessment} questions={questions} connected={connected} />
      )}
    </MobilePage>
  );
}

function MobileAssessmentDetails({
  assessment,
  connected,
  onDeleted,
}: {
  assessment: Avaliacao;
  connected: boolean;
  onDeleted: () => void;
}) {
  const queryClient = useQueryClient();
  const classesQuery = useQuery({
    queryKey: mobileQueryKeys.classes,
    queryFn: listTurmas,
    enabled: connected,
  });
  const [title, setTitle] = useState(assessment.titulo);
  const [subject, setSubject] = useState(assessment.disciplina ?? "");
  const [classId, setClassId] = useState(assessment.turma_id ?? "");
  const [date, setDate] = useState(assessment.data_aplicacao ?? "");
  const [total, setTotal] = useState(String(assessment.valor_total));
  const [instructions, setInstructions] = useState(assessment.instrucoes ?? "");
  const [status, setStatus] = useState<StatusAvaliacao>(assessment.status);

  useEffect(() => {
    setTitle(assessment.titulo);
    setSubject(assessment.disciplina ?? "");
    setClassId(assessment.turma_id ?? "");
    setDate(assessment.data_aplicacao ?? "");
    setTotal(String(assessment.valor_total));
    setInstructions(assessment.instrucoes ?? "");
    setStatus(assessment.status);
  }, [assessment]);

  const update = useMutation({
    mutationFn: () => {
      const parsedTotal = parseNonNegativeDecimal(total);
      if (parsedTotal === null) throw new Error("Informe um valor total válido.");
      return updateAvaliacao(assessment, {
        titulo: title,
        disciplina: subject || null,
        turma_id: classId || null,
        data_aplicacao: date || null,
        valor_total: parsedTotal,
        instrucoes: instructions || null,
        status,
      });
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(mobileQueryKeys.assessment(assessment.id), updated);
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.assessments });
      toast.success("Avaliação atualizada no Firebase.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteAvaliacao,
    onSuccess: async ({ storageCleanupFailed }) => {
      queryClient.removeQueries({ queryKey: mobileQueryKeys.assessment(assessment.id) });
      queryClient.removeQueries({ queryKey: mobileQueryKeys.questions(assessment.id) });
      queryClient.removeQueries({ queryKey: mobileQueryKeys.responses(assessment.id) });
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.assessments });
      toast[storageCleanupFailed ? "warning" : "success"](
        storageCleanupFailed
          ? "Avaliação apagada; alguns arquivos não puderam ser removidos."
          : "Avaliação e dados relacionados apagados.",
      );
      onDeleted();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    update.mutate();
  }

  function deleteAssessment() {
    if (
      window.confirm(
        `Apagar “${assessment.titulo}”? Questões, respostas, folhas e arquivos vinculados também serão apagados.`,
      )
    ) {
      remove.mutate(assessment.id);
    }
  }

  return (
    <MobileCard>
      <MobileCardHeader
        title="Dados da avaliação"
        description="Edite os mesmos dados exibidos na versão web."
      />
      <form className="mobile-form" onSubmit={submit}>
        <MobileField label="Título *" htmlFor={`assessment-title-${assessment.id}`}>
          <Input
            id={`assessment-title-${assessment.id}`}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </MobileField>
        <MobileField label="Disciplina" htmlFor={`assessment-subject-${assessment.id}`}>
          <Input
            id={`assessment-subject-${assessment.id}`}
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
          />
        </MobileField>
        <MobileNativeSelect
          label="Turma"
          value={classId}
          onChange={setClassId}
          disabled={classesQuery.isPending}
        >
          <option value="">Sem turma</option>
          {classesQuery.data?.map((item) => (
            <option key={item.id} value={item.id}>
              {item.nome}
            </option>
          ))}
        </MobileNativeSelect>
        <div className="mobile-form-grid">
          <MobileField label="Data" htmlFor={`assessment-date-${assessment.id}`}>
            <Input
              id={`assessment-date-${assessment.id}`}
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </MobileField>
          <MobileField label="Valor total" htmlFor={`assessment-total-${assessment.id}`}>
            <Input
              id={`assessment-total-${assessment.id}`}
              inputMode="decimal"
              value={total}
              onChange={(event) => setTotal(event.target.value)}
            />
          </MobileField>
        </div>
        <MobileNativeSelect
          label="Situação"
          value={status}
          onChange={(value) => setStatus(value as StatusAvaliacao)}
        >
          {(Object.entries(STATUS_LABEL) as Array<[StatusAvaliacao, string]>).map(
            ([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ),
          )}
        </MobileNativeSelect>
        <MobileField label="Instruções" htmlFor={`assessment-instructions-${assessment.id}`}>
          <textarea
            id={`assessment-instructions-${assessment.id}`}
            className="mobile-textarea"
            rows={4}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
          />
        </MobileField>
        <Button type="submit" disabled={!connected || !title.trim() || update.isPending}>
          {update.isPending ? <Loader2 className="animate-spin" /> : <Save />}
          Salvar alterações
        </Button>
      </form>
      <Button
        type="button"
        variant="ghost"
        className="mobile-danger-action"
        disabled={!connected || remove.isPending}
        onClick={deleteAssessment}
      >
        {remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
        Apagar avaliação e dados vinculados
      </Button>
    </MobileCard>
  );
}
