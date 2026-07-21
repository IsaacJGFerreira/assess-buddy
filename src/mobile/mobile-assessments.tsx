import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Loader2, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createAvaliacao,
  deleteAvaliacao,
  listAvaliacoes,
  listTurmas,
  STATUS_LABEL,
  type Avaliacao,
} from "@/lib/domain";

import type { MobileRoute } from "./mobile-navigation";
import { mobileQueryKeys } from "./mobile-query-keys";
import {
  MobileCard,
  MobileCardHeader,
  MobileEmpty,
  MobileError,
  MobileField,
  MobileLoading,
  MobileNativeSelect,
  MobilePage,
  MobileStatusPill,
} from "./mobile-ui";

export function MobileAssessmentsScreen({
  connected,
  onNavigate,
}: {
  connected: boolean;
  onNavigate: (route: MobileRoute) => void;
}) {
  const queryClient = useQueryClient();
  const assessmentsQuery = useQuery({
    queryKey: mobileQueryKeys.assessments,
    queryFn: listAvaliacoes,
    enabled: connected,
  });
  const classesQuery = useQuery({
    queryKey: mobileQueryKeys.classes,
    queryFn: listTurmas,
    enabled: connected,
  });
  const className = (id: string | null) =>
    classesQuery.data?.find((item) => item.id === id)?.nome ?? "Sem turma";

  const removeAssessment = useMutation({
    mutationFn: deleteAvaliacao,
    onSuccess: async ({ storageCleanupFailed }) => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.assessments });
      toast[storageCleanupFailed ? "warning" : "success"](
        storageCleanupFailed
          ? "Avaliação apagada; alguns arquivos não puderam ser removidos."
          : "Avaliação e dados vinculados apagados.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function remove(avaliacao: Avaliacao) {
    if (
      window.confirm(
        `Apagar “${avaliacao.titulo}” e todos os dados relacionados? Esta ação não pode ser desfeita.`,
      )
    ) {
      removeAssessment.mutate(avaliacao.id);
    }
  }

  return (
    <MobilePage
      title="Avaliações"
      description="Crie, edite, corrija e acompanhe suas avaliações."
      action={
        <Button
          type="button"
          disabled={!connected}
          onClick={() => onNavigate({ kind: "new-assessment" })}
        >
          <Plus /> Nova
        </Button>
      }
    >
      {!connected ? (
        <MobileEmpty>Reconecte-se para carregar as avaliações.</MobileEmpty>
      ) : assessmentsQuery.isPending ? (
        <MobileLoading label="Carregando avaliações…" />
      ) : assessmentsQuery.isError ? (
        <MobileError
          error={assessmentsQuery.error}
          onRetry={() => void assessmentsQuery.refetch()}
        />
      ) : assessmentsQuery.data?.length ? (
        <div className="mobile-stack">
          {assessmentsQuery.data.map((avaliacao) => (
            <article key={avaliacao.id} className="mobile-card mobile-assessment-card">
              <button
                type="button"
                className="mobile-assessment-open"
                onClick={() =>
                  onNavigate({
                    kind: "assessment",
                    assessmentId: avaliacao.id,
                    section: "details",
                  })
                }
              >
                <div className="mobile-list-card-row">
                  <h2>{avaliacao.titulo}</h2>
                  <MobileStatusPill>{STATUS_LABEL[avaliacao.status]}</MobileStatusPill>
                </div>
                <p>{avaliacao.disciplina ?? "Sem disciplina"}</p>
                <div className="mobile-assessment-meta">
                  <span>{className(avaliacao.turma_id)}</span>
                  <span>{avaliacao.data_aplicacao ?? "Sem data"}</span>
                  <span>Valor {avaliacao.valor_total}</span>
                </div>
              </button>
              <div className="mobile-card-actions">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    onNavigate({
                      kind: "assessment",
                      assessmentId: avaliacao.id,
                      section: "questions",
                    })
                  }
                >
                  Configurar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-destructive"
                  disabled={!connected || removeAssessment.isPending}
                  onClick={() => remove(avaliacao)}
                >
                  {removeAssessment.isPending && removeAssessment.variables === avaliacao.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                  Apagar
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <MobileEmpty>
          <ClipboardList />
          <p>Nenhuma avaliação cadastrada.</p>
          <Button type="button" onClick={() => onNavigate({ kind: "new-assessment" })}>
            Criar avaliação
          </Button>
        </MobileEmpty>
      )}
    </MobilePage>
  );
}

export function MobileNewAssessmentScreen({
  connected,
  onNavigate,
}: {
  connected: boolean;
  onNavigate: (route: MobileRoute) => void;
}) {
  const queryClient = useQueryClient();
  const classesQuery = useQuery({
    queryKey: mobileQueryKeys.classes,
    queryFn: listTurmas,
    enabled: connected,
  });
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classId, setClassId] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createAvaliacao({
        titulo: title,
        disciplina: subject || null,
        turmaId: classId || null,
        valorTotal: 10,
        status: "elaboracao",
      }),
    onSuccess: async (assessment) => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.assessments });
      toast.success("Avaliação criada no mesmo Firebase.");
      onNavigate({ kind: "assessment", assessmentId: assessment.id, section: "questions" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connected || create.isPending) return;
    create.mutate();
  }

  return (
    <MobilePage
      title="Nova avaliação"
      description="Preencha o essencial e configure as questões em seguida."
    >
      <MobileCard>
        <MobileCardHeader title="Dados da avaliação" />
        <form className="mobile-form" onSubmit={submit}>
          <MobileField label="Título *" htmlFor="mobile-assessment-title">
            <Input
              id="mobile-assessment-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ex.: Prova bimestral de Física"
              enterKeyHint="next"
              required
            />
          </MobileField>
          <MobileField label="Disciplina" htmlFor="mobile-assessment-subject">
            <Input
              id="mobile-assessment-subject"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Ex.: Física"
              enterKeyHint="next"
            />
          </MobileField>
          <MobileNativeSelect
            label="Turma"
            value={classId}
            disabled={classesQuery.isPending}
            onChange={setClassId}
          >
            <option value="">Sem turma</option>
            {classesQuery.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nome}
              </option>
            ))}
          </MobileNativeSelect>
          {classesQuery.isError && <MobileError error={classesQuery.error} />}
          <div className="mobile-form-actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onNavigate({ kind: "assessments" })}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!connected || !title.trim() || create.isPending}>
              {create.isPending && <Loader2 className="animate-spin" />}
              Criar e configurar
            </Button>
          </div>
        </form>
      </MobileCard>
    </MobilePage>
  );
}
