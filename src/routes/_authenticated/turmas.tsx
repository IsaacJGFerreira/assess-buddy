import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  atualizarAlunoFirebase,
  criarAlunoFirebase,
  criarAlunosFirebase,
  criarTurmaFirebase,
  excluirAlunoFirebase,
  excluirTurmaFirebase,
  listarAlunosFirebase,
  listarTurmasFirebase,
  type FirebaseAluno,
  type FirebaseTurma,
} from "@/integrations/firebase/academic-data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Plus, Upload, Trash2 } from "lucide-react";
import { isValidEmail, parseStudentCsvFile, validateStudentFields } from "@/lib/student-import";

export const Route = createFileRoute("/_authenticated/turmas")({
  component: TurmasPage,
});

const turmasQueryKey = ["firebase-turmas"] as const;

function alunosQueryKey(turmaId: string) {
  return ["firebase-alunos", turmaId] as const;
}

function TurmasPage() {
  const qc = useQueryClient();
  const turmasQuery = useQuery({
    queryKey: turmasQueryKey,
    queryFn: listarTurmasFirebase,
  });
  const turmas = turmasQuery.data ?? [];
  const [selected, setSelected] = useState<string | null>(null);
  const active = selected ?? turmas[0]?.id ?? null;

  const [novoNome, setNovoNome] = useState("");
  const [novaSerie, setNovaSerie] = useState("");

  const createTurma = useMutation({
    mutationFn: () =>
      criarTurmaFirebase({
        nome: novoNome,
        serie: novaSerie || null,
      }),
    onSuccess: async (turma) => {
      setNovoNome("");
      setNovaSerie("");
      setSelected(turma.id);
      await qc.invalidateQueries({ queryKey: turmasQueryKey });
      toast.success("Turma criada no Firebase.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const removeClass = useMutation({
    mutationFn: excluirTurmaFirebase,
    onSuccess: async (_data, turmaId) => {
      if (selected === turmaId) setSelected(null);
      qc.removeQueries({ queryKey: alunosQueryKey(turmaId) });
      await qc.invalidateQueries({ queryKey: turmasQueryKey });
      toast.success("Turma apagada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function confirmClassRemoval(turma: FirebaseTurma) {
    if (
      window.confirm(
        `Apagar a turma “${turma.nome}” e os alunos vinculados? Esta ação não pode ser desfeita.`,
      )
    ) {
      removeClass.mutate(turma.id);
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Turmas e alunos</h1>
      <div className="grid gap-6 md:grid-cols-[280px_1fr]">
        <div className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="font-semibold mb-3">Nova turma</h2>
            <div className="space-y-2">
              <div>
                <Label>Nome</Label>
                <Input
                  value={novoNome}
                  onChange={(event) => setNovoNome(event.target.value)}
                  placeholder="Ex: 8º ano A"
                />
              </div>
              <div>
                <Label>Série</Label>
                <Input
                  value={novaSerie}
                  onChange={(event) => setNovaSerie(event.target.value)}
                  placeholder="Ex: 8º ano"
                />
              </div>
              <Button
                className="w-full"
                disabled={!novoNome.trim() || createTurma.isPending}
                onClick={() => createTurma.mutate()}
              >
                {createTurma.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                Adicionar
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b border-border">
              Suas turmas
            </div>
            {turmasQuery.isPending ? (
              <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando turmas…
              </div>
            ) : turmasQuery.isError ? (
              <div className="space-y-3 p-4 text-sm">
                <p className="text-destructive">{message(turmasQuery.error)}</p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void turmasQuery.refetch()}
                >
                  Tentar novamente
                </Button>
              </div>
            ) : turmas.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">Nenhuma turma ainda.</p>
            ) : (
              turmas.map((turma) => (
                <div
                  key={turma.id}
                  className={`flex items-center border-b border-border last:border-0 ${
                    active === turma.id ? "bg-muted" : ""
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelected(turma.id)}
                    className="min-w-0 flex-1 px-4 py-3 text-left text-sm hover:bg-muted/50"
                  >
                    <div className="font-medium">{turma.nome}</div>
                    {turma.serie && (
                      <div className="text-xs text-muted-foreground">{turma.serie}</div>
                    )}
                  </button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="mr-2 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    aria-label={`Apagar a turma ${turma.nome}`}
                    title="Apagar turma"
                    disabled={removeClass.isPending}
                    onClick={() => confirmClassRemoval(turma)}
                  >
                    {removeClass.isPending && removeClass.variables === turma.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        <div>
          {active ? (
            <AlunosPanel turmaId={active} />
          ) : (
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
  const alunosQuery = useQuery({
    queryKey: alunosQueryKey(turmaId),
    queryFn: () => listarAlunosFirebase(turmaId),
  });
  const alunos = alunosQuery.data ?? [];
  const [nome, setNome] = useState("");
  const [matricula, setMatricula] = useState("");
  const [email, setEmail] = useState("");
  const [importing, setImporting] = useState(false);

  const refreshStudents = async () => {
    await qc.invalidateQueries({ queryKey: alunosQueryKey(turmaId) });
  };

  const addAluno = useMutation({
    mutationFn: async () => {
      validateStudentFields({ nome, matricula, email });
      return criarAlunoFirebase({
        turmaId,
        nome,
        matricula: matricula || null,
        email: email || null,
      });
    },
    onSuccess: async () => {
      setNome("");
      setMatricula("");
      setEmail("");
      await refreshStudents();
      toast.success("Aluno adicionado no Firebase.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const updateAlunoEmail = useMutation({
    mutationFn: async ({ aluno, value }: { aluno: FirebaseAluno; value: string }) => {
      const normalized = value.trim().toLowerCase();
      if (normalized && !isValidEmail(normalized)) {
        throw new Error("Informe um e-mail válido.");
      }

      return atualizarAlunoFirebase({
        id: aluno.id,
        turmaId: aluno.turmaId,
        nome: aluno.nome,
        matricula: aluno.matricula,
        chamada: aluno.chamada,
        email: normalized || null,
      });
    },
    onSuccess: async () => {
      await refreshStudents();
      toast.success("E-mail do aluno atualizado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const delAluno = useMutation({
    mutationFn: excluirAlunoFirebase,
    onSuccess: async () => {
      await refreshStudents();
      toast.success("Aluno apagado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  async function handleCsv(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);

    try {
      const rows = await parseStudentCsvFile(file, turmaId);

      await criarAlunosFirebase(rows);
      await refreshStudents();
      toast.success(`${rows.length} alunos importados para o Firebase.`);
    } catch (error) {
      toast.error(message(error));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-2">
        <h2 className="font-semibold">Alunos ({alunos.length})</h2>
        <label className="inline-flex">
          <input
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            disabled={importing}
            onChange={(event) => void handleCsv(event)}
          />
          <span
            className={`inline-flex items-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted ${
              importing ? "cursor-not-allowed opacity-60" : "cursor-pointer"
            }`}
          >
            {importing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-2" />
            )}
            {importing ? "Importando…" : "Importar CSV"}
          </span>
        </label>
      </div>

      <div className="p-4 border-b border-border grid gap-2 md:grid-cols-[1fr_150px_1fr_auto]">
        <Input
          placeholder="Nome do aluno"
          value={nome}
          onChange={(event) => setNome(event.target.value)}
        />
        <Input
          placeholder="Matrícula"
          inputMode="numeric"
          pattern="[0-9]*"
          value={matricula}
          onChange={(event) => setMatricula(event.target.value.replace(/\D/g, ""))}
        />
        <Input
          type="email"
          placeholder="E-mail do aluno"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <Button
          disabled={!nome.trim() || addAluno.isPending}
          onClick={() => addAluno.mutate()}
        >
          {addAluno.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Plus className="h-4 w-4 mr-1" />
          )}
          Adicionar
        </Button>
      </div>

      {alunosQuery.isPending ? (
        <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando alunos…
        </div>
      ) : alunosQuery.isError ? (
        <div className="space-y-3 p-6 text-center text-sm">
          <p className="text-destructive">{message(alunosQuery.error)}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void alunosQuery.refetch()}
          >
            Tentar novamente
          </Button>
        </div>
      ) : alunos.length === 0 ? (
        <p className="p-6 text-sm text-muted-foreground text-center">
          Sem alunos ainda. Adicione um acima ou importe um CSV com as colunas{" "}
          <code>nome</code>, <code>matricula</code> e <code>email</code>.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Nome</th>
                <th className="px-4 py-2 font-medium">Matrícula</th>
                <th className="px-4 py-2 font-medium min-w-64">E-mail</th>
                <th className="px-4 py-2 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => (
                <tr key={aluno.id} className="border-t border-border">
                  <td className="px-4 py-2">{aluno.nome}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {aluno.matricula ?? "—"}
                  </td>
                  <td className="px-4 py-2">
                    <Input
                      key={`${aluno.id}-${aluno.email ?? ""}`}
                      type="email"
                      defaultValue={aluno.email ?? ""}
                      placeholder="aluno@email.com"
                      aria-label={`E-mail de ${aluno.nome}`}
                      disabled={
                        updateAlunoEmail.isPending &&
                        updateAlunoEmail.variables?.aluno.id === aluno.id
                      }
                      onBlur={(event) => {
                        const value = event.currentTarget.value.trim();
                        if (value.toLowerCase() !== (aluno.email ?? "").toLowerCase()) {
                          updateAlunoEmail.mutate({ aluno, value });
                        }
                      }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-label={`Apagar ${aluno.nome}`}
                      disabled={delAluno.isPending}
                      onClick={() => delAluno.mutate(aluno.id)}
                    >
                      {delAluno.isPending && delAluno.variables === aluno.id ? (
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

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
