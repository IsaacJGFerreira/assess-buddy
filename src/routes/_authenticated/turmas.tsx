import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { listTurmas, listAlunosByTurma, type Turma, type Aluno } from "@/lib/domain";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, Upload, Trash2 } from "lucide-react";
import Papa from "papaparse";

export const Route = createFileRoute("/_authenticated/turmas")({
  component: TurmasPage,
});

function TurmasPage() {
  const qc = useQueryClient();
  const { data: turmas = [] } = useQuery({ queryKey: ["turmas"], queryFn: listTurmas });
  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ?? turmas[0]?.id ?? null;

  const [novoNome, setNovoNome] = useState("");
  const [novaSerie, setNovaSerie] = useState("");

  const createTurma = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("turmas")
        .insert({ nome: novoNome, serie: novaSerie || null, owner_id: u.user!.id })
        .select()
        .single();
      if (error) throw error;
      return data as Turma;
    },
    onSuccess: (t) => {
      setNovoNome(""); setNovaSerie(""); setSelected(t.id);
      qc.invalidateQueries({ queryKey: ["turmas"] });
      toast.success("Turma criada");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Turmas e alunos</h1>
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-semibold mb-3">Nova turma</h2>
            <div className="space-y-2">
              <div><Label>Nome</Label><Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex: 8º ano A" /></div>
              <div><Label>Série</Label><Input value={novaSerie} onChange={(e) => setNovaSerie(e.target.value)} placeholder="Ex: 8º ano" /></div>
              <Button className="w-full" disabled={!novoNome || createTurma.isPending} onClick={() => createTurma.mutate()}>
                <Plus className="h-4 w-4 mr-2" />Adicionar
              </Button>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">Suas turmas</div>
            {turmas.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma turma ainda.</p>
            ) : turmas.map((t) => (
              <button key={t.id} onClick={() => setSelected(t.id)}
                className={`w-full text-left px-4 py-3 text-sm border-b border-border last:border-0 hover:bg-muted/50 ${active === t.id ? "bg-muted" : ""}`}>
                <div className="font-medium">{t.nome}</div>
                {t.serie && <div className="text-xs text-muted-foreground">{t.serie}</div>}
              </button>
            ))}
          </div>
        </div>

        <div>
          {active ? <AlunosPanel turmaId={active} /> : (
            <div className="rounded-lg border border-dashed border-border p-12 text-center text-muted-foreground">
              Crie uma turma para adicionar alunos.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AlunosPanel({ turmaId }: { turmaId: string }) {
  const qc = useQueryClient();
  const { data: alunos = [] } = useQuery({
    queryKey: ["alunos", turmaId],
    queryFn: () => listAlunosByTurma(turmaId),
  });
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [chamada, setChamada] = useState("");

  const addAluno = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("alunos").insert({
        nome, matricula: matricula || null,
        chamada: chamada ? Number(chamada) : null,
        turma_id: turmaId, owner_id: u.user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNome(""); setMatricula(""); setChamada("");
      qc.invalidateQueries({ queryKey: ["alunos", turmaId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const delAluno = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alunos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alunos", turmaId] }),
  });

  async function handleCsv(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (res) => {
        const { data: u } = await supabase.auth.getUser();
        const rows = res.data
          .map((r) => ({
            nome: r.nome || r.Nome || r.NOME,
            matricula: r.matricula || r.Matricula || null,
            chamada: r.chamada ? Number(r.chamada) : null,
            turma_id: turmaId,
            owner_id: u.user!.id,
          }))
          .filter((r) => r.nome);
        if (!rows.length) return toast.error("Nenhuma linha válida (coluna 'nome' obrigatória).");
        const { error } = await supabase.from("alunos").insert(rows);
        if (error) toast.error(error.message);
        else toast.success(`${rows.length} alunos importados`);
        qc.invalidateQueries({ queryKey: ["alunos", turmaId] });
      },
    });
    e.target.value = "";
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold">Alunos ({alunos.length})</h2>
        <label className="inline-flex">
          <input type="file" accept=".csv" className="hidden" onChange={handleCsv} />
          <span className="inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted cursor-pointer">
            <Upload className="h-4 w-4 mr-2" />Importar CSV
          </span>
        </label>
      </div>
      <div className="p-4 border-b border-border grid gap-2 md:grid-cols-[1fr_120px_80px_auto]">
        <Input placeholder="Nome do aluno" value={nome} onChange={(e) => setNome(e.target.value)} />
        <Input placeholder="Matrícula" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
        <Input placeholder="Nº" type="number" value={chamada} onChange={(e) => setChamada(e.target.value)} />
        <Button disabled={!nome || addAluno.isPending} onClick={() => addAluno.mutate()}>
          <Plus className="h-4 w-4 mr-1" />Adicionar
        </Button>
      </div>
      {alunos.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground text-center">Sem alunos ainda. Adicione um acima ou importe um CSV com a coluna <code>nome</code>.</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-4 py-2 font-medium w-16">Nº</th>
              <th className="px-4 py-2 font-medium">Nome</th>
              <th className="px-4 py-2 font-medium">Matrícula</th>
              <th className="px-4 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {alunos.map((a: Aluno) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-2">{a.chamada ?? "—"}</td>
                <td className="px-4 py-2">{a.nome}</td>
                <td className="px-4 py-2 text-muted-foreground">{a.matricula ?? "—"}</td>
                <td className="px-4 py-2">
                  <Button size="sm" variant="ghost" onClick={() => delAluno.mutate(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}