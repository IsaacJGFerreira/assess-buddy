import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, FileUp, Loader2, Save } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AnswerSheetUploadPanel } from "@/components/answer-sheet-upload-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  alternativas,
  calcularNotaAluno,
  corrigirQuestao,
  listAlunosByTurma,
  listRespostasByAvaliacao,
  saveResposta,
  updateAvaliacao,
  type Aluno,
  type Avaliacao,
  type Questao,
  type Resposta,
} from "@/lib/domain";

import { mobileQueryKeys } from "./mobile-query-keys";
import {
  MobileCard,
  MobileCardHeader,
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobileNativeSelect,
  MobileStatusPill,
} from "./mobile-ui";
import { formatDecimal } from "./mobile-utils";

export function MobileCorrection({
  assessment,
  questions,
  connected,
}: {
  assessment: Avaliacao;
  questions: Questao[];
  connected: boolean;
}) {
  const queryClient = useQueryClient();
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
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [showUpload, setShowUpload] = useState(false);

  const students = studentsQuery.data ?? [];
  const activeStudentId = selectedStudentId || students[0]?.id || "";
  const activeStudent = students.find((item) => item.id === activeStudentId) ?? null;
  const studentResponses = useMemo(
    () => (responsesQuery.data ?? []).filter((item) => item.aluno_id === activeStudentId),
    [activeStudentId, responsesQuery.data],
  );
  const responseByQuestion = useMemo(
    () => new Map(studentResponses.map((item) => [item.questao_id, item])),
    [studentResponses],
  );
  const score = calcularNotaAluno(questions, studentResponses);

  const save = useMutation({
    mutationFn: ({
      questionId,
      answer,
      manualScore,
    }: {
      questionId: string;
      answer?: string | null;
      manualScore?: number | null;
    }) => {
      if (!classId || !activeStudentId) throw new Error("Selecione uma turma e um aluno.");
      return saveResposta({
        avaliacaoId: assessment.id,
        turmaId: classId,
        alunoId: activeStudentId,
        questaoId: questionId,
        resposta: answer,
        notaManual: manualScore,
      });
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData<Resposta[]>(
        mobileQueryKeys.responses(assessment.id),
        (current = []) => {
          const exists = current.some((item) => item.id === saved.id);
          return exists
            ? current.map((item) => (item.id === saved.id ? saved : item))
            : [...current, saved];
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.responses(assessment.id) }),
        queryClient.invalidateQueries({
          queryKey: ["firebase-feedback-responses", assessment.id, activeStudentId],
        }),
      ]);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const finish = useMutation({
    mutationFn: () => updateAvaliacao(assessment, { status: "corrigida" }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(mobileQueryKeys.assessment(assessment.id), updated);
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.assessments });
      toast.success("Avaliação marcada como corrigida.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  if (!classId) {
    return (
      <MobileEmpty>Associe uma turma nos dados da avaliação para registrar respostas.</MobileEmpty>
    );
  }

  if (!connected && (studentsQuery.data === undefined || responsesQuery.data === undefined)) {
    return <MobileError error="Reconecte-se para carregar alunos e respostas." />;
  }
  if (studentsQuery.isPending || responsesQuery.isPending) {
    return <MobileLoading label="Carregando alunos e respostas…" />;
  }
  if (studentsQuery.isError) {
    return <MobileError error={studentsQuery.error} onRetry={() => void studentsQuery.refetch()} />;
  }
  if (responsesQuery.isError) {
    return (
      <MobileError error={responsesQuery.error} onRetry={() => void responsesQuery.refetch()} />
    );
  }
  if (!students.length || !questions.length) {
    return <MobileEmpty>Cadastre alunos e questões antes de iniciar a correção.</MobileEmpty>;
  }

  return (
    <div className="mobile-stack">
      <MobileCard>
        <MobileCardHeader
          title="Arquivos de respostas"
          description="O upload comum de JPG, PNG e PDF continua disponível."
          action={
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowUpload((value) => !value)}
            >
              <FileUp /> {showUpload ? "Fechar" : "Enviar arquivo"}
            </Button>
          }
        />
        {showUpload && (
          <div className="mobile-embedded-upload">
            <AnswerSheetUploadPanel
              avaliacao={assessment}
              alunos={students}
              connected={connected}
            />
          </div>
        )}
      </MobileCard>

      <MobileCard>
        <MobileCardHeader
          title="Correção manual"
          description="Escolha um aluno; cada resposta é salva no mesmo Data Connect."
        />
        <MobileNativeSelect label="Aluno" value={activeStudentId} onChange={setSelectedStudentId}>
          {students.map((student) => {
            const filled = (responsesQuery.data ?? []).filter(
              (response) =>
                response.aluno_id === student.id &&
                (response.resposta || response.nota_manual != null),
            ).length;
            return (
              <option key={student.id} value={student.id}>
                {student.nome} · {filled}/{questions.length}
              </option>
            );
          })}
        </MobileNativeSelect>

        {activeStudent && (
          <div className="mobile-correction-summary">
            <div>
              <span>Aluno</span>
              <strong>{activeStudent.nome}</strong>
            </div>
            <div>
              <span>Nota atual</span>
              <strong>{formatDecimal(score.nota)}</strong>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!connected || finish.isPending}
              onClick={() => finish.mutate()}
            >
              {finish.isPending ? <Loader2 className="animate-spin" /> : <CheckCircle2 />}
              Marcar corrigida
            </Button>
          </div>
        )}
      </MobileCard>

      <div className="mobile-stack">
        {questions.map((question) => {
          const response = responseByQuestion.get(question.id);
          const answer = response?.resposta ?? "";
          const manualScore = response?.nota_manual ?? null;
          const result = corrigirQuestao(question, answer);

          return (
            <CorrectionQuestionCard
              key={question.id}
              question={question}
              answer={answer}
              manualScore={manualScore}
              result={result.situacao}
              disabled={!connected || save.isPending}
              saving={save.isPending && save.variables?.questionId === question.id}
              onAnswer={(value) => save.mutate({ questionId: question.id, answer: value || null })}
              onManualScore={(value) =>
                save.mutate({ questionId: question.id, manualScore: value })
              }
            />
          );
        })}
      </div>
    </div>
  );
}

function CorrectionQuestionCard({
  question,
  answer,
  manualScore,
  result,
  disabled,
  saving,
  onAnswer,
  onManualScore,
}: {
  question: Questao;
  answer: string;
  manualScore: number | null;
  result: ReturnType<typeof corrigirQuestao>["situacao"];
  disabled: boolean;
  saving: boolean;
  onAnswer: (answer: string) => void;
  onManualScore: (score: number | null) => void;
}) {
  const status = question.anulada
    ? { label: "Anulada", tone: "neutral" as const }
    : question.tipo === "disc"
      ? manualScore == null
        ? { label: "Sem nota", tone: "warning" as const }
        : {
            label: `${formatDecimal(manualScore)} / ${formatDecimal(question.valor)}`,
            tone: "success" as const,
          }
      : !answer
        ? { label: "Em branco", tone: "neutral" as const }
        : result === "correta"
          ? { label: "Correta", tone: "success" as const }
          : { label: "Incorreta", tone: "danger" as const };

  return (
    <article className="mobile-card mobile-correction-question">
      <div className="mobile-question-header">
        <div>
          <span className="mobile-question-number">{question.numero}</span>
          <div>
            <h2>{question.conteudo || `Questão ${question.numero}`}</h2>
            <p>Valor {formatDecimal(question.valor)}</p>
          </div>
        </div>
        {saving ? (
          <Loader2 className="animate-spin" />
        ) : (
          <MobileStatusPill tone={status.tone}>{status.label}</MobileStatusPill>
        )}
      </div>

      {question.tipo === "disc" ? (
        <label className="mobile-field">
          <span className="text-sm font-medium">Nota discursiva</span>
          <div className="mobile-score-input">
            <Input
              key={`${question.id}-${manualScore ?? ""}`}
              inputMode="decimal"
              defaultValue={manualScore == null ? "" : formatDecimal(manualScore)}
              placeholder="0"
              disabled={disabled}
              onBlur={(event) => {
                const raw = event.currentTarget.value.trim().replace(",", ".");
                if (!raw) {
                  if (manualScore != null) onManualScore(null);
                  return;
                }
                const parsed = Number(raw);
                if (!Number.isFinite(parsed) || parsed < 0 || parsed > Number(question.valor)) {
                  toast.error(`A nota deve ficar entre 0 e ${formatDecimal(question.valor)}.`);
                  event.currentTarget.value = manualScore == null ? "" : formatDecimal(manualScore);
                  return;
                }
                const normalized = Math.round(parsed * 100) / 100;
                if (normalized !== manualScore) onManualScore(normalized);
              }}
            />
            <span>/ {formatDecimal(question.valor)}</span>
          </div>
        </label>
      ) : question.tipo === "num" ? (
        <label className="mobile-field">
          <span className="text-sm font-medium">Resposta numérica</span>
          <Input
            key={`${question.id}-${answer}`}
            className="font-mono"
            inputMode="numeric"
            maxLength={question.num_digitos ?? 3}
            defaultValue={answer}
            disabled={disabled}
            onBlur={(event) => {
              const digits = question.num_digitos ?? 3;
              const raw = event.currentTarget.value.replace(/\D/g, "");
              const normalized = raw ? raw.padStart(digits, "0").slice(-digits) : "";
              if (normalized !== answer) onAnswer(normalized);
            }}
          />
        </label>
      ) : (
        <div className="mobile-answer-options">
          {alternativas(question).map((option) => (
            <button
              type="button"
              key={option}
              className={answer === option ? "is-selected" : ""}
              disabled={disabled}
              onClick={() => onAnswer(answer === option ? "" : option)}
            >
              {option}
            </button>
          ))}
          <Button
            type="button"
            variant="ghost"
            disabled={disabled || !answer}
            onClick={() => onAnswer("")}
          >
            Limpar
          </Button>
        </div>
      )}
    </article>
  );
}
