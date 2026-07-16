import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAvaliacao, listTurmas } from "@/lib/domain";

export const Route = createFileRoute("/_authenticated/avaliacoes/nova")({
  component: NovaAvaliacao,
});

function NovaAvaliacao() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const turmasQuery = useQuery({
    queryKey: ["firebase-turmas"],
    queryFn: listTurmas,
  });

  const [titulo, setTitulo] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [turmaId, setTurmaId] = useState("");

  const create = useMutation({
    mutationFn: () =>
      createAvaliacao({
        titulo,
        disciplina: disciplina || null,
        turmaId: turmaId || null,
        valorTotal: 10,
        status: "elaboracao",
      }),
    onSuccess: async (avaliacao) => {
      await queryClient.invalidateQueries({ queryKey: ["avaliacoes"] });
      toast.success("Avaliação criada no Firebase.");
      await navigate({
        to: "/avaliacoes/$id",
        params: { id: avaliacao.id },
      });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Nova avaliação</h1>
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div>
          <Label htmlFor="assessment-title">Título *</Label>
          <Input
            id="assessment-title"
            value={titulo}
            onChange={(event) => setTitulo(event.target.value)}
            placeholder="Ex: Prova bimestral de Física"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label htmlFor="assessment-subject">Disciplina</Label>
            <Input
              id="assessment-subject"
              value={disciplina}
              onChange={(event) => setDisciplina(event.target.value)}
              placeholder="Ex: Física"
            />
          </div>

          <div>
            <Label>Turma</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger>
                <SelectValue
                  placeholder={turmasQuery.isPending ? "Carregando…" : "Selecione…"}
                />
              </SelectTrigger>
              <SelectContent>
                {turmasQuery.data?.map((turma) => (
                  <SelectItem key={turma.id} value={turma.id}>
                    {turma.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {turmasQuery.isError && (
              <p className="mt-1 text-xs text-destructive">
                Não foi possível carregar as turmas.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate({ to: "/painel" })}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={!titulo.trim() || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar e configurar questões
          </Button>
        </div>
      </div>
    </div>
  );
}
