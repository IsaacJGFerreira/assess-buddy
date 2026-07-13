import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { getAvaliacao, listQuestoes, listAlunosByTurma, alternativas } from "@/lib/domain";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

const search = z.object({ aluno: z.string().optional() });

export const Route = createFileRoute("/_authenticated/avaliacoes/$id/folha")({
  validateSearch: (s) => search.parse(s),
  component: FolhaPrint,
});

function FolhaPrint() {
  const { id } = Route.useParams();
  const { aluno: alunoId } = Route.useSearch();
  const av = useQuery({ queryKey: ["avaliacao", id], queryFn: () => getAvaliacao(id) });
  const questoes = useQuery({ queryKey: ["questoes", id], queryFn: () => listQuestoes(id) });
  const alunos = useQuery({
    queryKey: ["alunos", av.data?.turma_id ?? ""],
    queryFn: () => av.data?.turma_id ? listAlunosByTurma(av.data.turma_id) : Promise.resolve([]),
    enabled: !!av.data?.turma_id,
  });
  const aluno = alunoId ? alunos.data?.find(a => a.id === alunoId) : null;

  if (!av.data || !questoes.data) return <div className="p-8">Carregando…</div>;

  return (
    <div className="bg-muted/30 min-h-screen">
      <div className="no-print sticky top-0 z-10 bg-background border-b border-border px-6 py-3 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">Pré-visualização da folha</div>
        <Button onClick={() => window.print()}><Printer className="h-4 w-4 mr-2" />Imprimir</Button>
      </div>
      <div className="mx-auto max-w-[210mm] bg-white text-black p-10 my-6 shadow print-sheet">
        <div className="border-b-2 border-black pb-3 mb-4">
          <div className="text-xs uppercase tracking-widest text-neutral-600">Folha de respostas</div>
          <h1 className="text-xl font-bold mt-1">{av.data.titulo}</h1>
          <div className="text-sm mt-1">
            {av.data.disciplina && <>Disciplina: <strong>{av.data.disciplina}</strong> · </>}
            {av.data.data_aplicacao && <>Data: <strong>{av.data.data_aplicacao}</strong> · </>}
            Valor: <strong>{av.data.valor_total}</strong>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-xs mb-4">
          <Field label="Nome do aluno" value={aluno?.nome} wide />
          <Field label="Turma" />
          <Field label="Matrícula" value={aluno?.matricula ?? undefined} />
          <Field label="Nº chamada" value={aluno?.chamada?.toString()} />
          <Field label="Data" value={av.data.data_aplicacao ?? undefined} />
          <Field label="Assinatura" />
        </div>

        {av.data.instrucoes && (
          <div className="border border-black/30 p-3 text-xs mb-4">
            <div className="font-semibold mb-1">Instruções</div>
            <p className="whitespace-pre-wrap">{av.data.instrucoes}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-8 gap-y-3">
          {questoes.data.map(q => (
            <div key={q.id} className="text-sm">
              <div className="flex items-center gap-3">
                <span className="font-semibold w-8 text-right">{String(q.numero).padStart(2, "0")}.</span>
                {q.tipo === "mc" && (
                  <div className="flex gap-2">
                    {alternativas(q).map(o => <span key={o} className="bubble">{o}</span>)}
                  </div>
                )}
                {q.tipo === "ce" && (
                  <div className="flex gap-2">
                    <span className="bubble">C</span><span className="bubble">E</span>
                  </div>
                )}
                {q.tipo === "num" && <NumericField digits={q.num_digitos ?? 3} />}
                {q.anulada && <span className="ml-2 text-xs text-neutral-500">(anulada)</span>}
              </div>
              {q.conteudo && <div className="text-[10px] text-neutral-500 pl-11 mt-0.5">{q.conteudo}</div>}
            </div>
          ))}
        </div>

        <div className="mt-8 pt-4 border-t border-black/40 text-[10px] text-neutral-500 flex justify-between">
          <span>Folha gerada pelo sistema Folha · {questoes.data.length} questões</span>
          <span>{av.data.titulo}</span>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return (
    <div className={wide ? "col-span-2" : ""}>
      <div className="text-[10px] uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="border-b border-black h-6 text-sm px-1 pt-0.5">{value ?? ""}</div>
    </div>
  );
}

function NumericField({ digits }: { digits: number }) {
  const labels = digits === 3 ? ["C","D","U"] : digits === 2 ? ["D","U"] : Array.from({length: digits}, (_,i) => `d${i+1}`);
  return (
    <div className="flex gap-2">
      {Array.from({ length: digits }).map((_, col) => (
        <div key={col} className="flex flex-col items-center gap-0.5">
          <div className="text-[9px] text-neutral-500">{labels[col]}</div>
          <div className="flex flex-col gap-0.5">
            {Array.from({ length: 10 }).map((_, d) => (
              <span key={d} className="bubble bubble-sm">{d}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}