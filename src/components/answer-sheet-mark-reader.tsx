import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Eye,
  FileScan,
  Loader2,
  Save,
  ScanLine,
  WandSparkles,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

import { AnswerSheet } from "@/components/answer-sheet";
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
import { restoreAnswerSheetModel } from "@/lib/answer-sheet-model";
import { buildAnswerSheetPages } from "@/lib/answer-sheet-pages";
import {
  analyzeAnswerSheetMarks,
  collectAnswerSheetOmrGeometry,
  OmrAnalysisError,
  type AnswerSheetOmrAnalysis,
  type OmrIdentifierReading,
  type OmrQuestionReading,
  type OmrRasterImage,
  type OmrReviewReason,
} from "@/lib/answer-sheet-omr";
import {
  resolveMatriculaReading,
  type MatriculaResolution,
} from "@/lib/answer-sheet-identification";
import {
  alternativas,
  confirmAnswerSheetScanReading,
  downloadAnswerSheetScan,
  isAnswerSheetPersistenceUnavailable,
  listAnswerSheetModels,
  saveAnswerSheetScanReading,
  type Aluno,
  type Avaliacao,
  type DigitalizacaoFolha,
  type Json,
  type Questao,
} from "@/lib/domain";

export function AnswerSheetMarkReader({
  avaliacao,
  alunos,
  scan,
  onBack,
}: {
  avaliacao: Avaliacao;
  alunos: Aluno[];
  scan: DigitalizacaoFolha;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedPage, setSelectedPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState(scan.aluno_id ?? "");
  const [analysis, setAnalysis] = useState<AnswerSheetOmrAnalysis | null>(null);
  const [matriculaResolution, setMatriculaResolution] = useState<MatriculaResolution | null>(null);
  const [questionReview, setQuestionReview] = useState<Record<string, string | null>>({});
  const [identifierReview, setIdentifierReview] = useState<Record<number, number | null>>({});
  const [zoom, setZoom] = useState(1);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const modelQuery = useQuery({
    queryKey: ["modelos-folha", avaliacao.id],
    queryFn: () => listAnswerSheetModels(avaliacao.id),
  });
  const scanBlobQuery = useQuery({
    queryKey: ["digitalizacao-blob", scan.id],
    queryFn: () => downloadAnswerSheetScan(scan),
  });
  const selectedModel = modelQuery.data?.find((model) => model.id === selectedModelId) ?? null;
  const restoredModel = selectedModel ? restoreAnswerSheetModel(selectedModel) : null;
  const pages = restoredModel ? buildAnswerSheetPages(restoredModel.questoes, restoredModel.layout) : [];
  const effectivePage = Math.min(Math.max(1, selectedPage), Math.max(1, pages.length));
  const currentPage = pages[effectivePage - 1] ?? null;
  const imageUrl = useMemo(
    () => (scanBlobQuery.data ? URL.createObjectURL(scanBlobQuery.data) : null),
    [scanBlobQuery.data],
  );

  useEffect(() => {
    if (!selectedModelId && modelQuery.data?.[0]) {
      setSelectedModelId(modelQuery.data[0].id);
    }
  }, [modelQuery.data, selectedModelId]);

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl);
    };
  }, [imageUrl]);

  useEffect(() => {
    setAnalysis(null);
    setMatriculaResolution(null);
    setQuestionReview({});
    setIdentifierReview({});
  }, [selectedModelId, selectedPage]);

  const analyze = useMutation({
    mutationFn: async () => {
      if (!imageRef.current || !overlayRef.current || !restoredModel || !currentPage) {
        throw new Error("A imagem e o modelo precisam estar prontos para a leitura.");
      }
      const geometry = collectAnswerSheetOmrGeometry(overlayRef.current);
      const raster = await loadRasterImage(imageRef.current);
      const result = analyzeAnswerSheetMarks({
        raster,
        geometry,
        questoes: currentPage.questoes,
        identificationMode: restoredModel.identificationMode,
        identifierDigits: restoredModel.identifierDigits,
      });
      const resolution = resolveMatriculaReading(result.identifier, alunos);
      return { result, resolution };
    },
    onSuccess: ({ result, resolution }) => {
      setAnalysis(result);
      setMatriculaResolution(resolution);
      setSelectedStudentId((current) => current || resolution.aluno?.id || "");
      setQuestionReview(
        Object.fromEntries(result.questions.map((item) => [item.questaoId, item.value])),
      );
      setIdentifierReview(
        Object.fromEntries(result.identifier.digits.map((item) => [item.position, item.value])),
      );
      toast.success("Leitura automática concluída. Revise as marcações duvidosas.");
    },
    onError: (error: Error) => {
      toast.error(
        error instanceof OmrAnalysisError
          ? error.message
          : "Não foi possível analisar automaticamente esta folha.",
      );
    },
  });

  const saveReview = useMutation({
    mutationFn: async ({ confirm }: { confirm: boolean }) => {
      if (!analysis || !selectedModel || !currentPage) {
        throw new Error("Faça a leitura automática antes de salvar.");
      }
      const result = buildReviewedResult({
        analysis,
        questionReview,
        identifierReview,
      });
      if (confirm) {
        await confirmAnswerSheetScanReading({
          scanId: scan.id,
          alunoId: selectedStudentId || null,
          modeloId: selectedModel.id,
          pagina: effectivePage,
          resultado: result,
        });
      } else {
        await saveAnswerSheetScanReading({
          scanId: scan.id,
          alunoId: selectedStudentId || null,
          modeloId: selectedModel.id,
          pagina: effectivePage,
          resultado: result,
          confianca: analysis.averageConfidence,
        });
      }
    },
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["digitalizacoes", avaliacao.id] });
      toast.success(
        variables.confirm
          ? "Leitura confirmada e respostas registradas."
          : "Revisão salva para continuar depois.",
      );
    },
    onError: (error: Error) => {
      if (isAnswerSheetPersistenceUnavailable(error)) {
        toast.warning("A atualização do banco ainda precisa ser aplicada.");
      } else {
        toast.error(error.message);
      }
    },
  });

  if (modelQuery.isLoading || scanBlobQuery.isLoading) {
    return <div className="p-6 text-sm text-muted-foreground">Carregando leitor…</div>;
  }

  if (!modelQuery.data?.length) {
    return (
      <div className="space-y-3 rounded-lg border border-border bg-card p-6">
        <p className="text-sm text-muted-foreground">
          Salve uma versão da folha antes de iniciar a leitura automática.
        </p>
        <Button type="button" variant="outline" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Voltar às digitalizações
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedModelId} onValueChange={setSelectedModelId}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Versão da folha" />
            </SelectTrigger>
            <SelectContent>
              {modelQuery.data.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  Versão {model.versao} · {model.colunas} col.
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {pages.length > 1 && (
            <div className="flex items-center gap-1">
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={effectivePage <= 1}
                onClick={() => setSelectedPage((page) => Math.max(1, page - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-sm">
                Página {effectivePage}/{pages.length}
              </span>
              <Button
                type="button"
                size="icon"
                variant="outline"
                disabled={effectivePage >= pages.length}
                onClick={() => setSelectedPage((page) => Math.min(pages.length, page + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-lg border border-border bg-muted/30">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
            <div>
              <h3 className="flex items-center gap-2 font-semibold">
                <FileScan className="h-4 w-4" /> Alinhamento e leitura
              </h3>
              <p className="text-xs text-muted-foreground">
                Encaixe os quatro quadrados pretos nas janelas azuis antes de analisar.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
              <Input
                className="h-8 w-20"
                type="number"
                min={0.5}
                max={2.5}
                step={0.1}
                value={zoom}
                onChange={(event) => setZoom(Math.min(2.5, Math.max(0.5, Number(event.target.value) || 1)))}
              />
            </div>
          </div>
          <div className="max-h-[78vh] overflow-auto p-4">
            <div
              className="relative mx-auto origin-top-left"
              style={{
                width: scan.largura_px,
                height: scan.altura_px,
                transform: `scale(${zoom})`,
                marginBottom: scan.altura_px * (zoom - 1),
                marginRight: scan.largura_px * (zoom - 1),
              }}
            >
              {imageUrl && (
                <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Folha digitalizada"
                  className="absolute inset-0 h-full w-full object-fill"
                />
              )}
              <div ref={overlayRef} className="absolute inset-0 pointer-events-none">
                {restoredModel && currentPage && (
                  <AnswerSheet
                    avaliacao={avaliacao}
                    questoes={currentPage.questoes}
                    aluno={null}
                    layout={restoredModel.layout}
                    identificationMode={restoredModel.identificationMode}
                    identifierDigits={restoredModel.identifierDigits}
                    omrOverlay
                  />
                )}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <h3 className="font-semibold">Leitura automática</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              O ponto azul indica a bolha lida. Marcações duplas ou pouco confiáveis ficam para revisão.
            </p>
            <Button
              type="button"
              className="mt-4 w-full"
              disabled={analyze.isPending || !imageUrl || !currentPage}
              onClick={() => analyze.mutate()}
            >
              {analyze.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <WandSparkles className="mr-2 h-4 w-4" />
              )}
              Analisar folha
            </Button>
          </div>

          {analysis && (
            <>
              <div className="rounded-lg border border-border bg-card p-4">
                <h3 className="font-semibold">Aluno</h3>
                <Select value={selectedStudentId || "unassigned"} onValueChange={(value) => setSelectedStudentId(value === "unassigned" ? "" : value)}>
                  <SelectTrigger className="mt-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Sem aluno vinculado</SelectItem>
                    {alunos.map((aluno) => (
                      <SelectItem key={aluno.id} value={aluno.id}>
                        {aluno.nome} · {aluno.matricula ?? "sem matrícula"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="mt-3 text-xs text-muted-foreground">
                  Matrícula lida: {buildIdentifierValue(identifierReview, analysis.identifier)}
                </div>
                {matriculaResolution?.status === "inconsistente" && (
                  <div className="mt-2 flex gap-2 text-xs text-amber-700">
                    <CircleAlert className="h-4 w-4 shrink-0" />
                    A matrícula lida não corresponde a um aluno desta turma.
                  </div>
                )}
              </div>

              <ReviewPanel
                analysis={analysis}
                questions={currentPage?.questoes ?? []}
                questionReview={questionReview}
                identifierReview={identifierReview}
                onQuestionChange={(questaoId, value) =>
                  setQuestionReview((current) => ({ ...current, [questaoId]: value }))
                }
                onIdentifierChange={(position, value) =>
                  setIdentifierReview((current) => ({ ...current, [position]: value }))
                }
              />

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="grid gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saveReview.isPending}
                    onClick={() => saveReview.mutate({ confirm: false })}
                  >
                    <Save className="mr-2 h-4 w-4" /> Salvar revisão
                  </Button>
                  <Button
                    type="button"
                    disabled={saveReview.isPending}
                    onClick={() => saveReview.mutate({ confirm: true })}
                  >
                    {saveReview.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Confirmar leitura
                  </Button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function ReviewPanel({
  analysis,
  questions,
  questionReview,
  identifierReview,
  onQuestionChange,
  onIdentifierChange,
}: {
  analysis: AnswerSheetOmrAnalysis;
  questions: Questao[];
  questionReview: Record<string, string | null>;
  identifierReview: Record<number, number | null>;
  onQuestionChange: (questaoId: string, value: string | null) => void;
  onIdentifierChange: (position: number, value: number | null) => void;
}) {
  const flaggedQuestions = analysis.questions.filter((item) => item.requiresReview);
  const flaggedDigits = analysis.identifier.digits.filter((item) => item.requiresReview);

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-semibold">Conferência</h3>
      {flaggedQuestions.length === 0 && flaggedDigits.length === 0 ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" /> Nenhuma marcação duvidosa.
        </div>
      ) : (
        <div className="mt-3 space-y-4">
          {flaggedDigits.map((digit) => (
            <div key={`digit-${digit.position}`}>
              <Label>Dígito {digit.position + 1} da matrícula</Label>
              <Select
                value={identifierReview[digit.position] == null ? "blank" : String(identifierReview[digit.position])}
                onValueChange={(value) => onIdentifierChange(digit.position, value === "blank" ? null : Number(value))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Em branco</SelectItem>
                  {Array.from({ length: 10 }, (_, value) => (
                    <SelectItem key={value} value={String(value)}>{value}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ReviewReason reasons={digit.reasons} />
            </div>
          ))}
          {flaggedQuestions.map((reading) => {
            const question = questions.find((item) => item.id === reading.questaoId);
            if (!question) return null;
            return (
              <div key={reading.questaoId}>
                <Label>Questão {question.numero}</Label>
                {question.tipo === "num" ? (
                  <Input
                    className="mt-1"
                    value={questionReview[question.id] ?? ""}
                    maxLength={question.num_digitos ?? 3}
                    onChange={(event) => onQuestionChange(question.id, event.target.value.replace(/\D/g, ""))}
                  />
                ) : (
                  <Select
                    value={questionReview[question.id] ?? "blank"}
                    onValueChange={(value) => onQuestionChange(question.id, value === "blank" ? null : value)}
                  >
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="blank">Em branco</SelectItem>
                      {alternativas(question).map((option) => (
                        <SelectItem key={option} value={option}>{option}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <ReviewReason reasons={reading.reasons} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ReviewReason({ reasons }: { reasons: OmrReviewReason[] }) {
  if (!reasons.length) return null;
  const labels: Record<OmrReviewReason, string> = {
    blank: "Sem marcação detectada",
    multiple: "Mais de uma marcação",
    low_confidence: "Confiança baixa",
  };
  return (
    <div className="mt-1 flex items-start gap-1 text-xs text-amber-700">
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {reasons.map((reason) => labels[reason]).join(" · ")}
    </div>
  );
}

async function loadRasterImage(image: HTMLImageElement): Promise<OmrRasterImage> {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("Não foi possível preparar a imagem para leitura.");
  context.drawImage(image, 0, 0);
  const data = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width: data.width, height: data.height, data: data.data };
}

function buildReviewedResult({
  analysis,
  questionReview,
  identifierReview,
}: {
  analysis: AnswerSheetOmrAnalysis;
  questionReview: Record<string, string | null>;
  identifierReview: Record<number, number | null>;
}): Json {
  return {
    schemaVersion: 1,
    identificacao: {
      valor: buildIdentifierValue(identifierReview, analysis.identifier),
      digitos: analysis.identifier.digits.map((item) => ({
        posicao: item.position,
        valor: identifierReview[item.position] ?? null,
        confianca: item.confidence,
        motivos: item.reasons,
      })),
    },
    respostas: analysis.questions.map((item) => ({
      questaoId: item.questaoId,
      valor: questionReview[item.questaoId] ?? null,
      confianca: item.confidence,
      motivos: item.reasons,
    })),
    confiancaMedia: analysis.averageConfidence,
  };
}

function buildIdentifierValue(
  review: Record<number, number | null>,
  identifier: OmrIdentifierReading,
): string | null {
  if (!identifier.digits.length) return null;
  const digits = identifier.digits.map((item) => review[item.position]);
  if (digits.some((digit) => digit == null)) return null;
  return digits.join("");
}