import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listTurmas } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/avaliacoes/nova")({
  component: NovaAvaliacao,
});

function NovaAvaliacao() {
  const navigate = useNavigate();
  const { data: turmas = [] } = useQuery({ queryKey: ["turmas"], queryFn: listTurmas });

  const [titulo, setTitulo] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [turmaId, setTurmaId] = useState<string>("");
  const [data, setData] = useState("");
  const [valorTotal, setValorTotal] = useState("10");
  const [instrucoes, setInstrucoes] = useState("Preencha completamente apenas uma alternativa por questão. Evite rasuras.");

  const create = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data: row, error } = await supabase
        .from("avaliacoes")
        .insert({
          titulo, disciplina: disciplina || null,
          turma_id: turmaId || null,
          data_aplicacao: data || null,
          valor_total: Number(valorTotal),
          instrucoes: instrucoes || null,
          owner_id: u.user!.id,
        })
        .select().single();
      if (error) throw error;
      return row;
    },
    onSuccess: (row) => {
      toast.success("Avaliação criada");
      navigate({ to: "/avaliacoes/$id", params: { id: row.id } });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Nova avaliação</h1>
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <div><Label>Título *</Label><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Prova bimestral de Ciências" /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Disciplina</Label><Input value={disciplina} onChange={(e) => setDisciplina(e.target.value)} /></div>
          <div>
            <Label>Turma</Label>
            <Select value={turmaId} onValueChange={setTurmaId}>
              <SelectTrigger><SelectValue placeholder="Selecione…" /></SelectTrigger>
              <SelectContent>
                {turmas.map((t) => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><Label>Data de aplicação</Label><Input type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
          <div><Label>Valor total</Label><Input type="number" step="0.1" value={valorTotal} onChange={(e) => setValorTotal(e.target.value)} /></div>
        </div>
        <div><Label>Instruções ao aluno</Label><Textarea rows={3} value={instrucoes} onChange={(e) => setInstrucoes(e.target.value)} /></div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => navigate({ to: "/painel" })}>Cancelar</Button>
          <Button disabled={!titulo || create.isPending} onClick={() => create.mutate()}>Criar e configurar questões</Button>
        </div>
      </div>
    </div>
  );
}