import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getAvaliacao, listQuestoes, corrigirQuestao, calcularNotaAluno, type Aluno, type Resposta } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

export const Route = createFileRoute("/_authenticated/avaliacoes/$id/devolutiva/$alunoId")({
  component: DevolutivaPrint,
});

function DevolutivaPrint() {
  const { id, alunoId } = Route.useParams();
  const av = useQuery({ queryKey: ["avaliacao", id], queryFn: () => getAvaliacao(id) });
  const questoes = useQuery({ queryKey: ["questoes", id], queryFn: () => listQuestoes(id) });
  const aluno = useQuery({
    queryKey: ["aluno", alunoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("alunos").select("*").eq("id", alunoId).single();
      if (error) throw error;
      return data as Aluno;
    },
  });
  const respostas = useQuery({
    queryKey: ["respostas-aluno", id, alunoId],
    queryFn: async () => {
      const { data, error } = await supabase.from("respostas_alunos").select("*").eq("avaliacao_id", id).eq("aluno_id", alunoId);
      if (error) throw error;
      return data as Resposta[];
    },
  });

  if (!av.data || !questoes.data || !aluno.data) return <div className="p-8">Carregando…</div>;
  const respMap = new Map((respostas.data ?? []).map(r => [r.questao_id, r.resposta]));
  const nota = calcularNotaAluno(questoes.data, respostas.data ?? []);
  const pct = av.data.valor_total ? Math.round((nota.nota / Number(av.data.valor_total)) * 100) : 0;

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="no-print sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Devolutiva do aluno</div>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
      </div>
      <div className="mx-auto max-w-[210mm] bg-white text-black p-10 my-6 shadow print-sheet">
        <div className="border-b-2 border-black pb-3 mb-4 flex justify-between items-end">
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-600">Correção da avaliação</div>
            <h1 className="text-xl font-bold mt-1">{av.data.titulo}</h1>
            <div className="text-sm mt-1">Aluno: <strong>{aluno.data.nome}</strong></div>
          </div>
          <div className="text-right">
            <div className="text-xs uppercase text-neutral-500">Nota</div>
            <div className="text-3xl font-bold">{nota.nota.toFixed(2)}</div>
            <div className="text-xs">de {av.data.valor_total} · {pct}%</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 text-xs mb-4">
          <Metric label="Acertos" value={nota.acertos} />
          <Metric label="Erros" value={nota.erros} />
          <Metric label="Em branco" value={nota.branco} />
          <Metric label="Anuladas" value={nota.anuladas} />
        </div>

        <table className="w-full text-sm border border-black/30">
          <thead className="bg-neutral-100 text-left">
            <tr>
              <th className="px-2 py-1 w-10">Nº</th>
              <th className="px-2 py-1">Sua resposta</th>
              <th className="px-2 py-1">Correta</th>
              <th className="px-2 py-1 w-16 text-center">Status</th>
              <th className="px-2 py-1">Conteúdo</th>
            </tr>
          </thead>
          <tbody>
            {questoes.data.map(q => {
              const r = respMap.get(q.id) ?? "";
              const { situacao } = corrigirQuestao(q, r);
              const sym = situacao === "correta" ? "✓" : situacao === "incorreta" ? "✕" : situacao === "anulada" ? "!" : "—";
              return (
                <tr key={q.id} className="border-t border-black/20">
                  <td className="px-2 py-1 font-medium">{q.numero}</td>
                  <td className="px-2 py-1 font-mono">{r || <span className="text-neutral-400">em branco</span>}</td>
                  <td className="px-2 py-1 font-mono">{q.gabarito ?? "—"}</td>
                  <td className="px-2 py-1 text-center font-bold">{sym}</td>
                  <td className="px-2 py-1 text-neutral-600">{q.conteudo ?? ""}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-6 border border-black/40 p-3">
          <div className="font-semibold text-sm mb-2">Correção do aluno</div>
          <div className="text-xs text-neutral-600 mb-3">Para cada questão errada: explique por que sua resposta estava incorreta, registre a resposta correta e indique o conteúdo a revisar.</div>
          <div className="space-y-6">
            {questoes.data.filter(q => corrigirQuestao(q, respMap.get(q.id) ?? "").situacao === "incorreta").map(q => (
              <div key={q.id} className="border-t border-neutral-300 pt-2">
                <div className="font-medium text-sm">Questão {q.numero} {q.conteudo && <span className="text-neutral-500 font-normal">— {q.conteudo}</span>}</div>
                <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
                  <div><div className="text-neutral-500">Por que errei</div><div className="border-b border-neutral-400 h-8" /></div>
                  <div><div className="text-neutral-500">Resposta correta e raciocínio</div><div className="border-b border-neutral-400 h-8" /></div>
                </div>
              </div>
            ))}
            {questoes.data.every(q => corrigirQuestao(q, respMap.get(q.id) ?? "").situacao !== "incorreta") && (
              <div className="text-sm text-neutral-500">Parabéns — nenhuma questão para corrigir.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-black/30 p-2 text-center">
      <div className="text-[10px] uppercase text-neutral-500">{label}</div>
      <div className="text-lg font-bold">{value}</div>
    </div>
  );
}
