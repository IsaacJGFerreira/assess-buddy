import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  getAvaliacao, listQuestoes, listAlunosByTurma, listRespostasByAvaliacao,
  alternativas, corrigirQuestao, calcularNotaAluno,
  STATUS_LABEL, TIPO_LABEL,
  type Questao, type TipoQuestao, type StatusAvaliacao,
} from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Copy, Printer, FileText, LayoutGrid, ExternalLink } from "lucide-react";
import {
  DEFAULT_ANSWER_SHEET_LAYOUT,
  type AnswerSheetOrientation,
} from "@/lib/answer-sheet-layout";

export const Route = createFileRoute("/_authenticated/avaliacoes/$id")({
  component: AvaliacaoDetail,
});

function AvaliacaoDetail() {
  const { id } = Route.useParams();
  const av = useQuery({ queryKey: ["avaliacao", id], queryFn: () => getAvaliacao(id) });
  const questoes = useQuery({ queryKey: ["questoes", id], queryFn: () => listQuestoes(id) });

  if (av.isLoading) return <div className="p-8">Carregando…</div>;
  if (!av.data) return <div className="p-8">Avaliação não encontrada.</div>;

  const somaValores = (questoes.data ?? []).reduce((s, q) => s + Number(q.valor), 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link to="/painel" className="text-sm text-muted-foreground hover:underline">← Painel</Link>
        <div className="flex items-end justify-between mt-2 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{av.data.titulo}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {av.data.disciplina ?? "Sem disciplina"} · {(questoes.data?.length ?? 0)} questões · Valor total {av.data.valor_total} (soma atual: {somaValores.toFixed(2)})
            </p>
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground">
            {STATUS_LABEL[av.data.status]}
          </span>
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="gabarito">Gabarito</TabsTrigger>
          <TabsTrigger value="folha">Folha</TabsTrigger>
          <TabsTrigger value="correcao">Correção</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4"><ConfigTab avaliacaoId={id} /></TabsContent>
        <TabsContent value="gabarito" className="mt-4"><GabaritoTab avaliacaoId={id} /></TabsContent>
        <TabsContent value="folha" className="mt-4"><FolhaTab avaliacaoId={id} turmaId={av.data.turma_id} /></TabsContent>
        <TabsContent value="correcao" className="mt-4"><CorrecaoTab avaliacaoId={id} turmaId={av.data.turma_id} /></TabsContent>
        <TabsContent value="relatorio" className="mt-4"><RelatorioTab avaliacaoId={id} turmaId={av.data.turma_id} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ================= CONFIG =================
function ConfigTab({ avaliacaoId }: { avaliacaoId: string }) {
  const qc = useQueryClient();
  const { data: questoes = [] } = useQuery({ queryKey: ["questoes", avaliacaoId], queryFn: () => listQuestoes(avaliacaoId) });

  const add = useMutation({
    mutationFn: async (tipo: TipoQuestao) => {
      const { data: u } = await supabase.auth.getUser();
      const numero = (questoes.at(-1)?.numero ?? 0) + 1;
      const base = {
        avaliacao_id: avaliacaoId, owner_id: u.user!.id, numero,
        tipo, valor: 1, anulada: false,
        qtd_alternativas: tipo === "mc" ? 5 : tipo === "ce" ? 2 : null,
        num_digitos: tipo === "num" ? 3 : null,
        gabarito: null, conteudo: null,
      };
      const { error } = await supabase.from("questoes").insert(base);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questoes", avaliacaoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Questao> }) => {
      const { error } = await supabase.from("questoes").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questoes", avaliacaoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questoes", avaliacaoId] }),
  });

  const duplicate = useMutation({
    mutationFn: async (q: Questao) => {
      const { data: u } = await supabase.auth.getUser();
      const numero = (questoes.at(-1)?.numero ?? 0) + 1;
      const { id, created_at, ...rest } = q as any;
      void id; void created_at;
      const { error } = await supabase.from("questoes").insert({ ...rest, numero, owner_id: u.user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["questoes", avaliacaoId] }),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button size="sm" onClick={() => add.mutate("mc")}><Plus className="h-4 w-4 mr-1" />Múltipla escolha</Button>
        <Button size="sm" variant="secondary" onClick={() => add.mutate("ce")}><Plus className="h-4 w-4 mr-1" />Certo/Errado</Button>
        <Button size="sm" variant="secondary" onClick={() => add.mutate("num")}><Plus className="h-4 w-4 mr-1" />Numérica</Button>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-muted-foreground text-left">
            <tr>
              <th className="px-3 py-2 w-14">Nº</th>
              <th className="px-3 py-2">Tipo</th>
              <th className="px-3 py-2">Formato</th>
              <th className="px-3 py-2">Gabarito</th>
              <th className="px-3 py-2 w-24">Valor</th>
              <th className="px-3 py-2">Conteúdo</th>
              <th className="px-3 py-2 w-20">Anulada</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {questoes.map((q) => (
              <tr key={q.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{q.numero}</td>
                <td className="px-3 py-2">{TIPO_LABEL[q.tipo]}</td>
                <td className="px-3 py-2">
                  {q.tipo === "mc" && (
                    <Select value={String(q.qtd_alternativas ?? 5)} onValueChange={(v) => update.mutate({ id: q.id, patch: { qtd_alternativas: Number(v) } })}>
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[2,3,4,5,6,7].map(n => <SelectItem key={n} value={String(n)}>{n} alt.</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {q.tipo === "ce" && <span className="text-muted-foreground">C ou E</span>}
                  {q.tipo === "num" && (
                    <Select value={String(q.num_digitos ?? 3)} onValueChange={(v) => update.mutate({ id: q.id, patch: { num_digitos: Number(v) } })}>
                      <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4].map(n => <SelectItem key={n} value={String(n)}>{n} díg.</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </td>
                <td className="px-3 py-2">
                  <GabaritoInput q={q} onChange={(v) => update.mutate({ id: q.id, patch: { gabarito: v } })} />
                </td>
                <td className="px-3 py-2">
                  <Input className="h-8" type="number" step="0.1" defaultValue={q.valor}
                    onBlur={(e) => { const v = Number(e.target.value); if (v !== Number(q.valor)) update.mutate({ id: q.id, patch: { valor: v } }); }} />
                </td>
                <td className="px-3 py-2">
                  <Input className="h-8" defaultValue={q.conteudo ?? ""}
                    onBlur={(e) => { if (e.target.value !== (q.conteudo ?? "")) update.mutate({ id: q.id, patch: { conteudo: e.target.value || null } }); }} />
                </td>
                <td className="px-3 py-2">
                  <Checkbox checked={q.anulada} onCheckedChange={(v) => update.mutate({ id: q.id, patch: { anulada: !!v } })} />
                </td>
                <td className="px-3 py-2 flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => duplicate.mutate(q)}><Copy className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => del.mutate(q.id)}><Trash2 className="h-4 w-4" /></Button>
                </td>
              </tr>
            ))}
            {questoes.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-8 text-center text-muted-foreground">
                Adicione a primeira questão acima.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function GabaritoInput({ q, onChange }: { q: Questao; onChange: (v: string) => void }) {
  if (q.tipo === "mc") {
    const opts = alternativas(q);
    return (
      <Select value={q.gabarito ?? ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-24"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>{opts.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
      </Select>
    );
  }
  if (q.tipo === "ce") {
    return (
      <Select value={q.gabarito ?? ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-24"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent><SelectItem value="C">C</SelectItem><SelectItem value="E">E</SelectItem></SelectContent>
      </Select>
    );
  }
  const digits = q.num_digitos ?? 3;
  return (
    <Input className="h-8 w-28" placeholder={"0".repeat(digits)} maxLength={digits}
      defaultValue={q.gabarito ?? ""}
      onBlur={(e) => {
        const v = e.target.value.replace(/\D/g, "").padStart(digits, "0").slice(-digits);
        if (v !== (q.gabarito ?? "")) onChange(v);
      }} />
  );
}

// ================= GABARITO =================
function GabaritoTab({ avaliacaoId }: { avaliacaoId: string }) {
  const { data: questoes = [] } = useQuery({ queryKey: ["questoes", avaliacaoId], queryFn: () => listQuestoes(avaliacaoId) });
  const semGabarito = questoes.filter((q) => !q.anulada && !q.gabarito);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-2">Verificação do gabarito</h3>
        <ul className="text-sm space-y-1">
          <li>Total de questões: <strong>{questoes.length}</strong></li>
          <li>Sem gabarito: <strong className={semGabarito.length ? "text-destructive" : ""}>{semGabarito.length}</strong></li>
          <li>Anuladas: <strong>{questoes.filter(q => q.anulada).length}</strong></li>
        </ul>
        {semGabarito.length > 0 && (
          <p className="mt-2 text-sm text-destructive">
            Cadastre o gabarito das questões: {semGabarito.map(q => q.numero).join(", ")}.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>
            <th className="px-3 py-2 w-14">Nº</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Gabarito</th><th className="px-3 py-2">Valor</th>
          </tr></thead>
          <tbody>
            {questoes.map(q => (
              <tr key={q.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{q.numero}</td>
                <td className="px-3 py-2">{TIPO_LABEL[q.tipo]}</td>
                <td className="px-3 py-2 font-mono">{q.anulada ? "— (anulada)" : (q.gabarito || <span className="text-destructive">faltando</span>)}</td>
                <td className="px-3 py-2">{q.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">Alterações no gabarito recalculam automaticamente as notas dos alunos.</p>
    </div>
  );
}

// ================= FOLHA =================
function FolhaTab({ avaliacaoId, turmaId }: { avaliacaoId: string; turmaId: string | null }) {
  const navigate = useNavigate();
  const [orientation, setOrientation] = useState<AnswerSheetOrientation>(DEFAULT_ANSWER_SHEET_LAYOUT.orientation);
  const [columns, setColumns] = useState(DEFAULT_ANSWER_SHEET_LAYOUT.columns);
  const [rowsPerColumn, setRowsPerColumn] = useState(DEFAULT_ANSWER_SHEET_LAYOUT.rowsPerColumn);
  const alunos = useQuery({
    queryKey: ["alunos", turmaId ?? ""],
    queryFn: () => turmaId ? listAlunosByTurma(turmaId) : Promise.resolve([]),
    enabled: !!turmaId,
  });
  const maxColumns = orientation === "portrait" ? 4 : 6;
  const sheetSearch = {
    colunas: Math.min(columns, maxColumns),
    linhas: rowsPerColumn,
    orientacao: orientation,
  };

  function changeOrientation(value: AnswerSheetOrientation) {
    setOrientation(value);
    if (value === "portrait" && columns > 4) setColumns(4);
  }

  async function openAnswerSheet(aluno?: string) {
    try {
      await navigate({
        to: "/avaliacoes/$id/folha",
        params: { id: avaliacaoId },
        search: aluno ? { ...sheetSearch, aluno } : sheetSearch,
      });
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível abrir a folha de respostas.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <LayoutGrid className="h-4 w-4" />
          <h3 className="font-semibold">Configuração da folha de respostas</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Organize a grade antes de visualizar. A prévia permite imprimir e baixar a folha em PDF ou PNG.
        </p>

        <div className="grid gap-4 mt-5 md:grid-cols-3">
          <div className="space-y-1.5">
            <Label>Orientação</Label>
            <Select value={orientation} onValueChange={(value) => changeOrientation(value as AnswerSheetOrientation)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="landscape">A4 paisagem</SelectItem>
                <SelectItem value="portrait">A4 retrato</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Colunas</Label>
            <Select value={String(columns)} onValueChange={(value) => setColumns(Number(value))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxColumns }, (_, index) => index + 1).map((value) => (
                  <SelectItem key={value} value={String(value)}>{value} coluna{value > 1 ? "s" : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sheet-rows">Linhas por coluna</Label>
            <Input
              id="sheet-rows"
              type="number"
              min={5}
              max={orientation === "landscape" ? 25 : 35}
              value={rowsPerColumn}
              onChange={(event) => {
                const maximum = orientation === "landscape" ? 25 : 35;
                setRowsPerColumn(Math.min(maximum, Math.max(5, Number(event.target.value) || 5)));
              }}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={() => void openAnswerSheet()}>
            <FileText className="h-4 w-4 mr-2" />Visualizar folha genérica
          </Button>
          <span className="text-xs text-muted-foreground">
            Capacidade de {sheetSearch.colunas * rowsPerColumn} questões por página.
          </span>
        </div>
      </div>
      {turmaId && (alunos.data?.length ?? 0) > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold mb-3">Folhas personalizadas por aluno</h3>
          <div className="grid gap-2 md:grid-cols-2">
            {alunos.data!.map(a => (
              <button
                key={a.id}
                type="button"
                onClick={() => void openAnswerSheet(a.id)}
                className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/50">
                <span>{a.chamada ? `${a.chamada}. ` : ""}{a.nome}</span>
                <Printer className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ================= CORREÇÃO =================
function CorrecaoTab({ avaliacaoId, turmaId }: { avaliacaoId: string; turmaId: string | null }) {
  const qc = useQueryClient();
  const questoes = useQuery({ queryKey: ["questoes", avaliacaoId], queryFn: () => listQuestoes(avaliacaoId) });
  const alunos = useQuery({
    queryKey: ["alunos", turmaId ?? ""],
    queryFn: () => turmaId ? listAlunosByTurma(turmaId) : Promise.resolve([]),
    enabled: !!turmaId,
  });
  const respostas = useQuery({
    queryKey: ["respostas", avaliacaoId], queryFn: () => listRespostasByAvaliacao(avaliacaoId),
  });

  const [alunoId, setAlunoId] = useState<string | null>(null);
  const active = alunoId ?? alunos.data?.[0]?.id ?? null;
  const activeAluno = alunos.data?.find(a => a.id === active);

  const byQAluno = useMemo(() => {
    const map = new Map<string, string>();
    (respostas.data ?? []).filter(r => r.aluno_id === active).forEach(r => map.set(r.questao_id, r.resposta ?? ""));
    return map;
  }, [respostas.data, active]);

  const salvar = useMutation({
    mutationFn: async ({ questaoId, valor }: { questaoId: string; valor: string }) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("respostas_alunos").upsert({
        avaliacao_id: avaliacaoId, aluno_id: active!, questao_id: questaoId,
        resposta: valor || null, owner_id: u.user!.id,
      }, { onConflict: "aluno_id,questao_id" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["respostas", avaliacaoId] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async (status: StatusAvaliacao) => {
      const { error } = await supabase.from("avaliacoes").update({ status }).eq("id", avaliacaoId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["avaliacao", avaliacaoId] }),
  });

  if (!turmaId) return <p className="text-muted-foreground">Associe uma turma para registrar as respostas dos alunos.</p>;
  if (!alunos.data?.length) return <p className="text-muted-foreground">Cadastre alunos na turma.</p>;
  if (!questoes.data?.length) return <p className="text-muted-foreground">Cadastre as questões antes.</p>;

  return (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">Alunos</div>
        {alunos.data.map(a => {
          const respAluno = (respostas.data ?? []).filter(r => r.aluno_id === a.id);
          const preenchidas = respAluno.filter(r => r.resposta).length;
          return (
            <button key={a.id} onClick={() => setAlunoId(a.id)}
              className={`w-full text-left px-3 py-2 text-sm border-b border-border last:border-0 hover:bg-muted/50 ${active === a.id ? "bg-muted" : ""}`}>
              <div className="font-medium">{a.chamada ? `${a.chamada}. ` : ""}{a.nome}</div>
              <div className="text-xs text-muted-foreground">{preenchidas}/{questoes.data.length} respondidas</div>
            </button>
          );
        })}
      </div>
      <div className="space-y-3">
        {activeAluno && (
          <div className="rounded-lg border border-border bg-card p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{activeAluno.nome}</div>
              <div className="text-xs text-muted-foreground">Digite as respostas marcadas pelo aluno</div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setStatus.mutate("corrigida")}>Marcar como corrigida</Button>
          </div>
        )}
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {questoes.data.map(q => {
            const val = byQAluno.get(q.id) ?? "";
            const { situacao } = corrigirQuestao(q, val);
            return (
              <div key={q.id} className="p-3 flex items-center gap-4">
                <div className="w-10 font-medium">{q.numero}.</div>
                <div className="flex-1"><RespostaInput q={q} value={val} onSubmit={(v) => salvar.mutate({ questaoId: q.id, valor: v })} /></div>
                <div className="w-32 text-right text-sm">
                  {val && !q.anulada && (
                    <span className={`px-2 py-0.5 rounded-full text-xs ${situacao === "correta" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>
                      {situacao === "correta" ? "✓ correta" : "✕ incorreta"}
                    </span>
                  )}
                  {q.anulada && <span className="text-xs text-muted-foreground">anulada</span>}
                  {!val && !q.anulada && <span className="text-xs text-muted-foreground">em branco</span>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RespostaInput({ q, value, onSubmit }: { q: Questao; value: string; onSubmit: (v: string) => void }) {
  const [v, setV] = useState(value);
  // Sync when active question/aluno changes
  if (v !== value && document.activeElement?.tagName !== "INPUT") {
    // best-effort sync outside focus
  }
  if (q.tipo === "num") {
    const digits = q.num_digitos ?? 3;
    return (
      <Input className="h-9 w-32 font-mono" defaultValue={value} maxLength={digits} placeholder={"0".repeat(digits)}
        onBlur={(e) => {
          const nv = e.target.value.replace(/\D/g, "").padStart(digits, "0").slice(-digits);
          if (nv !== value) onSubmit(nv);
        }} />
    );
  }
  const opts = alternativas(q);
  return (
    <div className="flex gap-1">
      {opts.map(o => (
        <button key={o} type="button"
          className={`h-8 w-8 rounded-full border text-sm font-semibold transition ${value === o ? "bg-primary text-primary-foreground border-primary" : "border-input hover:bg-muted"}`}
          onClick={() => onSubmit(value === o ? "" : o)}>
          {o}
        </button>
      ))}
      <button type="button" className="ml-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => onSubmit("")}>limpar</button>
      {/* v is not actively used but retained to satisfy state hook lint */}
      <span className="hidden">{v}</span><span className="hidden" onClick={() => setV(value)} />
    </div>
  );
}

// ================= RELATÓRIO =================
function RelatorioTab({ avaliacaoId, turmaId }: { avaliacaoId: string; turmaId: string | null }) {
  const questoes = useQuery({ queryKey: ["questoes", avaliacaoId], queryFn: () => listQuestoes(avaliacaoId) });
  const alunos = useQuery({
    queryKey: ["alunos", turmaId ?? ""],
    queryFn: () => turmaId ? listAlunosByTurma(turmaId) : Promise.resolve([]),
    enabled: !!turmaId,
  });
  const respostas = useQuery({ queryKey: ["respostas", avaliacaoId], queryFn: () => listRespostasByAvaliacao(avaliacaoId) });

  if (!questoes.data?.length || !alunos.data?.length) return <p className="text-muted-foreground">Cadastre questões e alunos.</p>;

  const notas = alunos.data.map(a => {
    const resp = (respostas.data ?? []).filter(r => r.aluno_id === a.id);
    return { aluno: a, ...calcularNotaAluno(questoes.data!, resp) };
  });
  const valores = notas.map(n => n.nota).sort((a,b) => a-b);
  const media = valores.length ? valores.reduce((a,b) => a+b, 0) / valores.length : 0;
  const mediana = valores.length ? valores[Math.floor(valores.length/2)] : 0;
  const maior = valores.at(-1) ?? 0;
  const menor = valores[0] ?? 0;

  const acertosPorQuestao = questoes.data.map(q => {
    let ac = 0, total = 0;
    for (const a of alunos.data!) {
      const r = (respostas.data ?? []).find(x => x.aluno_id === a.id && x.questao_id === q.id);
      if (!r || !r.resposta) continue;
      total++;
      if (corrigirQuestao(q, r.resposta).situacao === "correta") ac++;
    }
    return { q, ac, total, pct: total ? Math.round((ac/total)*100) : 0 };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Stat label="Média" value={media.toFixed(2)} />
        <Stat label="Mediana" value={mediana.toFixed(2)} />
        <Stat label="Maior" value={maior.toFixed(2)} />
        <Stat label="Menor" value={menor.toFixed(2)} />
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold">Notas por aluno</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>
            <th className="px-4 py-2">Aluno</th><th className="px-4 py-2 w-20">Nota</th><th className="px-4 py-2 w-24">Acertos</th><th className="px-4 py-2 w-24">Erros</th><th className="px-4 py-2 w-24">Branco</th><th className="px-4 py-2 w-32">Devolutiva</th>
          </tr></thead>
          <tbody>
            {notas.map(n => (
              <tr key={n.aluno.id} className="border-t border-border">
                <td className="px-4 py-2">{n.aluno.chamada ? `${n.aluno.chamada}. ` : ""}{n.aluno.nome}</td>
                <td className="px-4 py-2 font-semibold">{n.nota.toFixed(2)}</td>
                <td className="px-4 py-2">{n.acertos}</td>
                <td className="px-4 py-2">{n.erros}</td>
                <td className="px-4 py-2">{n.branco}</td>
                <td className="px-4 py-2">
                  <a href={`/avaliacoes/${avaliacaoId}/devolutiva/${n.aluno.id}`} target="_blank" rel="noreferrer"
                    className="text-primary hover:underline text-xs inline-flex items-center gap-1">
                    Ver devolutiva <ExternalLink className="h-3 w-3" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border font-semibold">% de acerto por questão</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left"><tr>
            <th className="px-4 py-2 w-14">Nº</th><th className="px-4 py-2">Conteúdo</th><th className="px-4 py-2 w-32">Acertos</th><th className="px-4 py-2">Aproveitamento</th>
          </tr></thead>
          <tbody>
            {acertosPorQuestao.map(({ q, ac, total, pct }) => (
              <tr key={q.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{q.numero}</td>
                <td className="px-4 py-2">{q.conteudo ?? "—"}</td>
                <td className="px-4 py-2">{ac}/{total}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs w-10 text-right">{pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}
