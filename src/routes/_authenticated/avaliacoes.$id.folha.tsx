import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { z } from "zod";
import { Download, FileImage, Loader2, Printer } from "lucide-react";
import { toast } from "sonner";

import { AnswerSheet } from "@/components/answer-sheet";
import { Button } from "@/components/ui/button";
import { exportAnswerSheetAsPdf, exportAnswerSheetAsPng } from "@/lib/answer-sheet-export";
import type { AnswerSheetLayout, AnswerSheetOrientation } from "@/lib/answer-sheet-layout";
import { getAvaliacao, listAlunosByTurma, listQuestoes } from "@/lib/domain";

const search = z.object({
  aluno: z.string().optional(),
  colunas: z.coerce.number().int().min(1).max(6).catch(2),
  linhas: z.coerce.number().int().min(5).max(35).catch(35),
  orientacao: z.enum(["portrait", "landscape"]).catch("portrait"),
});

export const Route = createFileRoute("/_authenticated/avaliacoes/$id/folha")({
  validateSearch: (value) => search.parse(value),
  component: AnswerSheetPreview,
});

function AnswerSheetPreview() {
  const { id } = Route.useParams();
  const { aluno: alunoId, colunas, linhas, orientacao } = Route.useSearch();
  const exportRootRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);
  const avaliacao = useQuery({
    queryKey: ["avaliacao", id],
    queryFn: () => getAvaliacao(id),
  });
  const questoes = useQuery({
    queryKey: ["questoes", id],
    queryFn: () => listQuestoes(id),
  });
  const alunos = useQuery({
    queryKey: ["alunos", avaliacao.data?.turma_id ?? ""],
    queryFn: () =>
      avaliacao.data?.turma_id ? listAlunosByTurma(avaliacao.data.turma_id) : Promise.resolve([]),
    enabled: !!avaliacao.data?.turma_id,
  });
  const aluno = alunoId ? alunos.data?.find((item) => item.id === alunoId) : null;
  const layout: AnswerSheetLayout = {
    columns: orientacao === "portrait" ? Math.min(colunas, 4) : colunas,
    rowsPerColumn: linhas,
    orientation: orientacao as AnswerSheetOrientation,
  };

  async function exportFile(format: "pdf" | "png") {
    if (!exportRootRef.current || !avaliacao.data) return;
    setExporting(format);
    try {
      if (format === "pdf") {
        await exportAnswerSheetAsPdf(exportRootRef.current, avaliacao.data.titulo);
      } else {
        await exportAnswerSheetAsPng(exportRootRef.current, avaliacao.data.titulo);
      }
      toast.success(
        format === "pdf" ? "PDF gerado com sucesso." : "Imagem PNG gerada com sucesso.",
      );
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o arquivo. Tente novamente.");
    } finally {
      setExporting(null);
    }
  }

  if (avaliacao.isLoading || questoes.isLoading) {
    return <div className="p-8">Carregando folha de respostas…</div>;
  }
  if (!avaliacao.data) return <div className="p-8">Avaliação não encontrada.</div>;

  return (
    <div className="answer-sheet-preview min-h-screen bg-muted/30">
      <style>{`@media print { @page { size: auto; margin: 0; } }`}</style>

      <div className="no-print sticky top-0 z-20 border-b border-border bg-background px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              to="/avaliacoes/$id"
              params={{ id }}
              className="text-xs text-muted-foreground hover:underline"
            >
              ← Voltar para a avaliação
            </Link>
            <div className="mt-0.5 font-medium">Pré-visualização da folha</div>
            <div className="text-xs text-muted-foreground">
              {layout.columns} coluna{layout.columns > 1 ? "s" : ""} · até {layout.rowsPerColumn}{" "}
              itens por coluna · formato compacto
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={() => exportFile("png")}
              disabled={exporting !== null}
            >
              {exporting === "png" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileImage className="mr-2 h-4 w-4" />
              )}
              Baixar PNG
            </Button>
            <Button
              variant="outline"
              onClick={() => exportFile("pdf")}
              disabled={exporting !== null}
            >
              {exporting === "pdf" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Baixar PDF
            </Button>
            <Button onClick={() => window.print()} disabled={exporting !== null}>
              <Printer className="mr-2 h-4 w-4" />
              Imprimir
            </Button>
          </div>
        </div>
      </div>

      {(questoes.data?.length ?? 0) === 0 ? (
        <div className="mx-auto max-w-xl p-8 text-center text-muted-foreground">
          Cadastre ao menos uma questão antes de gerar a folha.
        </div>
      ) : (
        <div ref={exportRootRef} className="answer-sheet-export-root">
          <AnswerSheet
            avaliacao={avaliacao.data}
            questoes={questoes.data ?? []}
            aluno={aluno}
            layout={layout}
          />
        </div>
      )}
    </div>
  );
}
