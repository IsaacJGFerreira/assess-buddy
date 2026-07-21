import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, FilePlus2, Loader2, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
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
  MobileEmpty,
  MobileError,
  MobileLoading,
  MobilePage,
  MobileStatusPill,
} from "./mobile-ui";

export function MobileDashboard({
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

  const removeAssessment = useMutation({
    mutationFn: deleteAvaliacao,
    onSuccess: async ({ storageCleanupFailed }) => {
      await queryClient.invalidateQueries({ queryKey: mobileQueryKeys.assessments });
      toast[storageCleanupFailed ? "warning" : "success"](
        storageCleanupFailed
          ? "Avaliação apagada; alguns arquivos não puderam ser removidos."
          : "Avaliação e dados relacionados apagados.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function remove(avaliacao: Avaliacao) {
    if (
      window.confirm(
        `Apagar “${avaliacao.titulo}”? Questões, respostas, folhas e digitalizações vinculadas também serão apagadas.`,
      )
    ) {
      removeAssessment.mutate(avaliacao.id);
    }
  }

  const recent = assessmentsQuery.data?.slice(0, 4) ?? [];

  return (
    <MobilePage
      title="Painel"
      description="Acompanhe suas turmas e avaliações no mesmo Firebase da web."
      action={
        <Button
          type="button"
          disabled={!connected}
          onClick={() => onNavigate({ kind: "new-assessment" })}
        >
          <FilePlus2 /> Nova
        </Button>
      }
    >
      <div className="mobile-stat-grid">
        <button
          type="button"
          className="mobile-stat-card"
          onClick={() => onNavigate({ kind: "classes" })}
        >
          <Users />
          <span>Turmas</span>
          <strong>{classesQuery.data?.length ?? "—"}</strong>
        </button>
        <button
          type="button"
          className="mobile-stat-card"
          onClick={() => onNavigate({ kind: "assessments" })}
        >
          <ClipboardList />
          <span>Avaliações</span>
          <strong>{assessmentsQuery.data?.length ?? "—"}</strong>
        </button>
      </div>

      <MobileCard>
        <div className="mobile-card-header">
          <div>
            <h2>Avaliações recentes</h2>
            <p>Toque em uma avaliação para continuar o trabalho.</p>
          </div>
          <Button type="button" variant="ghost" onClick={() => onNavigate({ kind: "assessments" })}>
            Ver todas
          </Button>
        </div>

        {!connected ? (
          <MobileEmpty>Reconecte-se para carregar seus dados.</MobileEmpty>
        ) : assessmentsQuery.isPending ? (
          <MobileLoading label="Carregando avaliações…" />
        ) : assessmentsQuery.isError ? (
          <MobileError
            error={assessmentsQuery.error}
            onRetry={() => void assessmentsQuery.refetch()}
          />
        ) : recent.length === 0 ? (
          <MobileEmpty>
            Nenhuma avaliação ainda. Use o botão “Nova” para criar a primeira.
          </MobileEmpty>
        ) : (
          <div className="mobile-card-list">
            {recent.map((avaliacao) => (
              <article key={avaliacao.id} className="mobile-list-card">
                <button
                  type="button"
                  className="mobile-list-card-main"
                  onClick={() =>
                    onNavigate({
                      kind: "assessment",
                      assessmentId: avaliacao.id,
                      section: "details",
                    })
                  }
                >
                  <div className="mobile-list-card-row">
                    <strong>{avaliacao.titulo}</strong>
                    <MobileStatusPill>{STATUS_LABEL[avaliacao.status]}</MobileStatusPill>
                  </div>
                  <p>
                    {avaliacao.disciplina ?? "Sem disciplina"}
                    {avaliacao.data_aplicacao ? ` · ${avaliacao.data_aplicacao}` : ""}
                  </p>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  aria-label={`Apagar ${avaliacao.titulo}`}
                  disabled={!connected || removeAssessment.isPending}
                  onClick={() => remove(avaliacao)}
                >
                  {removeAssessment.isPending && removeAssessment.variables === avaliacao.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </Button>
              </article>
            ))}
          </div>
        )}
      </MobileCard>
    </MobilePage>
  );
}
