import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteAvaliacao, listAvaliacoes, listTurmas, STATUS_LABEL } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/painel")({
  component: Painel,
});

function Painel() {
  const queryClient = useQueryClient();
  const avals = useQuery({ queryKey: ["avaliacoes"], queryFn: listAvaliacoes });
  const turmas = useQuery({ queryKey: ["turmas"], queryFn: listTurmas });
  const turmaNome = (id: string | null) => turmas.data?.find((t) => t.id === id)?.nome ?? "—";
  const removeAssessment = useMutation({
    mutationFn: deleteAvaliacao,
    onSuccess: async ({ storageCleanupFailed }) => {
      await queryClient.invalidateQueries({ queryKey: ["avaliacoes"] });
      if (storageCleanupFailed) {
        toast.warning("Prova apagada. Alguns arquivos digitalizados não puderam ser removidos.");
      } else {
        toast.success("Prova apagada por completo.");
      }
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function confirmAssessmentRemoval(id: string, title: string) {
    if (
      window.confirm(
        `Apagar a prova “${title}”? Questões, respostas, folhas e digitalizações também serão apagadas. Esta ação não pode ser desfeita.`,
      )
    ) {
      removeAssessment.mutate(id);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Painel</h1>
          <p className="text-muted-foreground mt-1">Suas avaliações e turmas.</p>
        </div>
        <Button asChild>
          <Link to="/avaliacoes/nova">
            <Plus className="h-4 w-4 mr-2" />
            Nova avaliação
          </Link>
        </Button>
      </div>

      {avals.isLoading ? (
        <p className="text-muted-foreground">Carregando…</p>
      ) : !avals.data?.length ? (
        <div className="rounded-lg border border-dashed border-border p-12 text-center">
          <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
          <h2 className="mt-4 font-semibold">Nenhuma avaliação ainda</h2>
          <p className="text-sm text-muted-foreground mt-1">Comece criando sua primeira prova.</p>
          <Button asChild className="mt-4">
            <Link to="/avaliacoes/nova">Criar avaliação</Link>
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Disciplina</th>
                <th className="px-4 py-3 font-medium">Turma</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Situação</th>
                <th className="w-16 px-4 py-3 text-right font-medium">Ações</th>
              </tr>
            </thead>
            <tbody>
              {avals.data.map((a) => (
                <tr key={a.id} className="border-t border-border hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <Link
                      to="/avaliacoes/$id"
                      params={{ id: a.id }}
                      className="font-medium text-primary hover:underline"
                    >
                      {a.titulo}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{a.disciplina ?? "—"}</td>
                  <td className="px-4 py-3">{turmaNome(a.turma_id)}</td>
                  <td className="px-4 py-3">{a.data_aplicacao ?? "—"}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
                      {STATUS_LABEL[a.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Apagar a prova ${a.titulo}`}
                      title="Apagar prova"
                      disabled={removeAssessment.isPending}
                      onClick={() => confirmAssessmentRemoval(a.id, a.titulo)}
                    >
                      {removeAssessment.isPending && removeAssessment.variables === a.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
