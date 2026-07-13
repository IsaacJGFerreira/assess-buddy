import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  Eye,
  FileScan,
  Loader2,
  Save,
  ScanLine,
  WandSparkles,
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
import type { Json } from "@/integrations/supabase/types";
import { restoreAnswerSheetModel } from "@/lib/answer-sheet-model";
import { buildAnswerSheetPages } from "@/lib/answer-sheet-pages";
import {
  analyzeAnswerSheetMarks,
  collectAnswerSheetOmrGeometry,
  OmrAnalysisError,
  type AnswerSheetOmrAnalysis,
  type OmrQuestionReading,
  type OmrRasterImage,
  type OmrReviewReason,
} from "@/lib/answer-sheet-omr";
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
  type Questao,
} from "@/lib/domain";

const NO_STUDENT_VALUE = "__sem_aluno__";

export function AnswerSheetMarkReader({
  scan,
  avaliacao,
  alunos,
  onBack,
  onCompleted,
}: {
  scan: DigitalizacaoFolha;
  avaliacao: Avaliacao;
  alunos: Aluno[];
  onBack: () => void;
  onCompleted: () => void;
}) {
  const queryClient = useQueryClient();
  const referenceRef = useRef<HTMLDivElement>(null);
  const reviewRevisionRef = useRef(0);
  const [modelOverride, setModelOverride] = useState<string | null>(scan.modelo_id);
  const [studentId, setStudentId] = useState(scan.aluno_id ?? "");
  const [pageNumber, setPageNumber] = useState(scan.pagina_modelo ?? 1);
  const [readings, setReadings] = useState<OmrQuestionReading[]>(() =>
    restoreSavedReadings(scan.resultado_leitura),
  );
  const [analysisMeta, setAnalysisMeta] = useState<{
    threshold: number;
    markerConfidence: number;
    averageConfidence: number;
  } | null>(() => restoreSavedMeta(scan.resultado_leitura));
  const [overlay, setOverlay] = useState<string | null>(null);
  const [hasUnsavedReview, setHasUnsavedReview] = useState(false);

  const models = useQuery({
    queryKey: ["answer-sheet-models", avaliacao.id],
    queryFn: () => listAnswerSheetModels(avaliacao.id),
    retry: false,
  });
  const selectedModelId = modelOverride ?? models.data?.[0]?.id ?? "";
  const selectedModel = models.data?.find((model) => model.id === selectedModelId) ?? null;
  const restored = useMemo(() => {
    if (!selectedModel) return null;
    try {
      return restoreAnswerSheetModel(selectedModel, avaliacao);
    } catch (error) {
      return error instanceof Error
        ? error
        : new Error("Não foi possível abrir o modelo da folha.");
    }
  }, [selectedModel, avaliacao]);
  const pages =
    restored && !(restored instanceof Error)
      ? buildAnswerSheetPages(restored.questoes, restored.layout)
      : [];

  useEffect(() => {
    if (pages.length > 0 && pageNumber > pages.length) setPageNumber(1);
  }, [pageNumber, pages.length]);

  const analyze = useMutation({
    mutationFn: async () => {
      if (!selectedModel || !restored || restored instanceof Error) {
        throw restored instanceof Error ? restored : new Error("Selecione uma versão da folha.");
      }
      const pageElement = referenceRef.current?.querySelector<HTMLElement>(
        `.answer-sheet-page[data-page="${pageNumber}"]`,
      );
      if (!pageElement) throw new Error("A página de referência ainda não está pronta.");

      const geometry = collectAnswerSheetOmrGeometry(pageElement);
      const blob = await downloadAnswerSheetScan(scan);
      const { raster, image } = await decodeScan(blob);
      let result: AnswerSheetOmrAnalysis;
      let nextOverlay: string;
      try {
        result = analyzeAnswerSheetMarks(raster, geometry);
        nextOverlay = createAnalysisOverlay(image, result);
      } finally {
        image.close();
      }
      const payload = buildReadingPayload(result.readings, {
        modeloId: selectedModel.id,
        pagina: pageNumber,
        threshold: result.threshold,
        markerConfidence: result.markerConfidence,
        averageConfidence: result.averageConfidence,
      });
      await saveAnswerSheetScanReading({
        scanId: scan.id,
        alunoId: studentId || null,
        modeloId: selectedModel.id,
        pagina: pageNumber,
        resultado: payload,
        confianca: result.averageConfidence,
      });
      return { result, overlay: nextOverlay };
    },
    onSuccess: async ({ result, overlay: nextOverlay }) => {
      setReadings(result.readings);
      setAnalysisMeta({
        threshold: result.threshold,
        markerConfidence: result.markerConfidence,
        averageConfidence: result.averageConfidence,
      });
      setOverlay(nextOverlay);
      setHasUnsavedReview(false);
      reviewRevisionRef.current = 0;
      await queryClient.invalidateQueries({ queryKey: ["answer-sheet-scans", avaliacao.id] });
      const reviewCount = result.readings.filter((reading) => reading.requiresReview).length;
      if (reviewCount > 0) {
        toast.warning(
          `${reviewCount} resposta${reviewCount > 1 ? "s precisam" : " precisa"} de revisão.`,
        );
      } else {
        toast.success("Todas as marcações foram lidas com boa confiança.");
      }
    },
    onError: (error) => {
      const message = isAnswerSheetPersistenceUnavailable(error)
        ? "A migration da leitura automática ainda não foi aplicada ao banco."
        : getErrorMessage(error, "Não foi possível analisar a folha.");
      toast.error(message);
    },
  });

  const unresolved = readings.filter((reading) => reading.requiresReview);
  const saveReview = useMutation({
    mutationFn: async ({
      reviewedReadings,
    }: {
      reviewedReadings: OmrQuestionReading[];
      revision: number;
    }) => {
      if (!selectedModel || !analysisMeta) {
        throw new Error("A leitura precisa estar completa antes de salvar a conferência.");
      }
      const payload = buildReadingPayload(reviewedReadings, {
        modeloId: selectedModel.id,
        pagina: pageNumber,
        threshold: analysisMeta.threshold,
        markerConfidence: analysisMeta.markerConfidence,
        averageConfidence: average(reviewedReadings.map((reading) => reading.confidence)),
      });
      await saveAnswerSheetScanReading({
        scanId: scan.id,
        alunoId: studentId || null,
        modeloId: selectedModel.id,
        pagina: pageNumber,
        resultado: payload,
        confianca: average(reviewedReadings.map((reading) => reading.confidence)),
      });
    },
    onSuccess: async (_data, variables) => {
      const savedLatestRevision = reviewRevisionRef.current === variables.revision;
      if (savedLatestRevision) setHasUnsavedReview(false);
      await queryClient.invalidateQueries({ queryKey: ["answer-sheet-scans", avaliacao.id] });
      if (savedLatestRevision) {
        toast.success("Conferência salva. Você pode continuar depois.");
      } else {
        toast.info("Uma alteração mais recente ainda precisa ser salva.");
      }
    },
    onError: (error) => {
      const message = isAnswerSheetPersistenceUnavailable(error)
        ? "A migration da leitura automática ainda não foi aplicada ao banco."
        : getErrorMessage(error, "Não foi possível salvar a conferência.");
      toast.error(message);
    },
  });
  const confirm = useMutation({
    mutationFn: async () => {
      if (!studentId || !selectedModel || !analysisMeta || readings.length === 0) {
        throw new Error("Faça a leitura automática antes de confirmar as respostas.");
      }
      if (unresolved.length > 0) {
        throw new Error("Revise todas as respostas destacadas antes de confirmar.");
      }
      const payload = buildReadingPayload(readings, {
        modeloId: selectedModel.id,
        pagina: pageNumber,
        threshold: analysisMeta.threshold,
        markerConfidence: analysisMeta.markerConfidence,
        averageConfidence: average(readings.map((reading) => reading.confidence)),
      });
      await confirmAnswerSheetScanReading({
        scanId: scan.id,
        alunoId: studentId,
        modeloId: selectedModel.id,
        pagina: pageNumber,
        resultado: payload,
      });
    },
    onSuccess: async () => {
      toast.success("Respostas confirmadas e lançadas para o aluno.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["answer-sheet-scans", avaliacao.id] }),
        queryClient.invalidateQueries({ queryKey: ["respostas", avaliacao.id] }),
      ]);
      onCompleted();
    },
    onError: (error) => {
      const message = isAnswerSheetPersistenceUnavailable(error)
        ? "A migration da leitura automática ainda não foi aplicada ao banco."
        : getErrorMessage(error, "Não foi possível confirmar a leitura.");
      toast.error(message);
    },
  });

  function changeModel(value: string) {
    setModelOverride(value);
    setPageNumber(1);
    clearAnalysis();
  }

  function changePage(value: string) {
    setPageNumber(Number(value));
    clearAnalysis();
  }

  function clearAnalysis() {
    setReadings([]);
    setAnalysisMeta(null);
    setOverlay(null);
    setHasUnsavedReview(false);
    reviewRevisionRef.current = 0;
  }

  function reviewReading(questionId: string, value: string | null, resolved = true) {
    setReadings((current) =>
      current.map((reading) =>
        reading.questionId === questionId
          ? {
              ...reading,
              value,
              status: resolved ? "reviewed" : "ambiguous",
              confidence: resolved ? 1 : reading.confidence,
              requiresReview: !resolved,
            }
          : reading,
      ),
    );
    reviewRevisionRef.current += 1;
    setHasUnsavedReview(true);
  }

  function handleBack() {
    if (
      hasUnsavedReview &&
      !window.confirm("Existem alterações de conferência não salvas. Deseja sair mesmo assim?")
    ) {
      return;
    }
    onBack();
  }

  if (models.isLoading) {
    return <ReaderLoading onBack={onBack} label="Carregando modelos da folha…" />;
  }
  if (models.isError) {
    return (
      <ReaderMessage onBack={onBack}>
        Não foi possível carregar as versões da folha de respostas.
      </ReaderMessage>
    );
  }
  if (!models.data?.length) {
    return (
      <ReaderMessage onBack={onBack}>
        Gere e salve uma folha na aba “Folha” antes de executar a leitura automática.
      </ReaderMessage>
    );
  }
  if (restored instanceof Error) {
    return <ReaderMessage onBack={onBack}>{restored.message}</ReaderMessage>;
  }

  const questionsById = new Map(restored?.questoes.map((question) => [question.id, question]));
  const confidentCount = readings.filter((reading) => reading.status === "confident").length;
  const blankCount = readings.filter((reading) => reading.status === "blank").length;
  const reviewedCount = readings.filter((reading) => reading.status === "reviewed").length;

  return (
    <section className="space-y-5 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-3 mb-1"
            onClick={handleBack}
          >
            <ArrowLeft className="mr-1 h-4 w-4" /> Voltar às digitalizações
          </Button>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <ScanLine className="h-5 w-5" /> Leitura automática das marcações
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {scan.arquivo_original} · selecione a versão e a página. O aluno pode ser vinculado
            depois da leitura.
          </p>
        </div>
        {analysisMeta && (
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800">
            Confiança média {formatPercent(analysisMeta.averageConfidence)}
          </span>
        )}
      </div>

      <div className="grid gap-4 rounded-lg border border-border bg-muted/20 p-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Aluno (opcional para leitura)</Label>
          <Select
            value={studentId || NO_STUDENT_VALUE}
            onValueChange={(value) => setStudentId(value === NO_STUDENT_VALUE ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_STUDENT_VALUE}>Sem aluno vinculado</SelectItem>
              {alunos.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.chamada ? `${student.chamada}. ` : ""}
                  {student.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Versão da folha</Label>
          <Select value={selectedModelId} onValueChange={changeModel}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione a versão" />
            </SelectTrigger>
            <SelectContent>
              {models.data.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  Versão {model.versao} · {model.colunas} × {model.linhas_por_coluna}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Página da folha</Label>
          <Select value={String(pageNumber)} onValueChange={changePage}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pages.map((page, index) => (
                <SelectItem key={`${page.kind}-${index}`} value={String(index + 1)}>
                  Página {index + 1} · {page.kind === "main" ? "objetiva" : "numérica"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!alunos.length && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Cadastre alunos na turma da avaliação antes de lançar as respostas lidas.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => analyze.mutate()}
          disabled={!selectedModelId || analyze.isPending || pages.length === 0}
        >
          {analyze.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <WandSparkles className="mr-2 h-4 w-4" />
          )}
          {readings.length ? "Analisar novamente" : "Ler marcações"}
        </Button>
        <span className="text-xs text-muted-foreground">
          A imagem é processada localmente e nenhuma resposta é lançada sem confirmação.
        </span>
      </div>

      {readings.length > 0 && (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <ReadingStat label="Confiantes" value={confidentCount} tone="green" />
            <ReadingStat label="Em branco" value={blankCount} tone="gray" />
            <ReadingStat label="Revisadas" value={reviewedCount} tone="blue" />
            <ReadingStat label="Precisam de revisão" value={unresolved.length} tone="amber" />
          </div>

          {overlay && (
            <div className="rounded-lg border border-border bg-slate-950 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-200">
                <span className="flex items-center gap-2">
                  <Eye className="h-4 w-4" /> Conferência visual dos pontos analisados
                </span>
                <span className="flex flex-wrap items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-blue-500" />
                    Resposta lida
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-amber-500" />
                    Precisa revisar
                  </span>
                  <span>Sem ponto = em branco</span>
                </span>
              </div>
              <img
                src={overlay}
                alt="Folha digitalizada com marcações da leitura automática"
                className="mx-auto max-h-[620px] max-w-full"
              />
            </div>
          )}

          <details className="group overflow-hidden rounded-lg border border-border bg-card">
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3 px-4 py-3 marker:content-none">
              <span>
                <span className="font-medium">Correção manual · todas as respostas</span>
                <span className="ml-2 text-xs text-muted-foreground">({readings.length})</span>
              </span>
              {unresolved.length > 0 ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-950">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  {unresolved.length} inconsistência{unresolved.length > 1 ? "s" : ""}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Sem inconsistências
                </span>
              )}
            </summary>
            <div className="space-y-3 border-t border-border p-3">
              {unresolved.length > 0 && (
                <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-950">
                  <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                  Os pontos laranja indicam leituras fracas, duplas ou incompletas. Ajuste apenas o
                  que precisar.
                </p>
              )}
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  disabled={!hasUnsavedReview || saveReview.isPending}
                  onClick={() =>
                    saveReview.mutate({
                      reviewedReadings: readings,
                      revision: reviewRevisionRef.current,
                    })
                  }
                >
                  {saveReview.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  {hasUnsavedReview ? "Salvar conferência" : "Conferência salva"}
                </Button>
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
                {readings.map((reading) => {
                  const question = questionsById.get(reading.questionId);
                  if (!question) return null;
                  return (
                    <ReadingReviewRow
                      key={reading.questionId}
                      question={question}
                      reading={reading}
                      onChange={(value, resolved) =>
                        reviewReading(reading.questionId, value, resolved)
                      }
                    />
                  );
                })}
              </div>
            </div>
          </details>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4">
            <div>
              <div className="font-medium">Confirmar lançamento</div>
              <p className="text-xs text-muted-foreground">
                {studentId
                  ? "As respostas desta página substituirão os valores atuais do aluno selecionado."
                  : "A leitura já está salva. Selecione um aluno apenas quando quiser lançar as respostas."}
              </p>
            </div>
            <Button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    "Confirmar e lançar as respostas desta página para o aluno selecionado?",
                  )
                ) {
                  confirm.mutate();
                }
              }}
              disabled={
                !studentId || unresolved.length > 0 || saveReview.isPending || confirm.isPending
              }
            >
              {confirm.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              Confirmar respostas
            </Button>
          </div>
        </>
      )}

      {restored && selectedModel && (
        <div
          ref={referenceRef}
          aria-hidden="true"
          className="pointer-events-none fixed left-[-20000px] top-0 opacity-0"
        >
          <div className="answer-sheet-export-root">
            <AnswerSheet
              avaliacao={restored.avaliacao}
              questoes={restored.questoes}
              layout={restored.layout}
              identification={{
                code: "REFERENCIA-OMR",
                version: selectedModel.versao,
                qrPayload: "AB1|REFERENCIA-OMR",
              }}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function ReadingReviewRow({
  question,
  reading,
  onChange,
}: {
  question: Questao;
  reading: OmrQuestionReading;
  onChange: (value: string | null, resolved?: boolean) => void;
}) {
  const needsReview = reading.requiresReview;
  const statusText =
    reading.status === "confident"
      ? "Leitura confiante"
      : reading.status === "blank"
        ? "Em branco"
        : reading.status === "reviewed"
          ? "Revisada"
          : "Revisar";
  return (
    <div
      className={`grid gap-3 px-4 py-3 sm:grid-cols-[70px_1fr_150px] sm:items-center ${needsReview ? "bg-amber-50" : "bg-card"}`}
    >
      <div>
        <div className="flex items-center gap-2 font-semibold">
          {needsReview && (
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500"
              title="Leitura com inconsistência"
            />
          )}
          Questão {question.numero}
        </div>
        <div className="text-[11px] text-muted-foreground">{formatPercent(reading.confidence)}</div>
      </div>
      <ReadingAnswerControl question={question} reading={reading} onChange={onChange} />
      <span
        className={`justify-self-start rounded-full px-2 py-1 text-xs font-medium sm:justify-self-end ${needsReview ? "bg-amber-200 text-amber-950" : reading.status === "reviewed" ? "bg-sky-100 text-sky-800" : "bg-emerald-50 text-emerald-800"}`}
      >
        {statusText}
      </span>
    </div>
  );
}

function ReadingAnswerControl({
  question,
  reading,
  onChange,
  spacious = false,
}: {
  question: Questao;
  reading: OmrQuestionReading;
  onChange: (value: string | null, resolved?: boolean) => void;
  spacious?: boolean;
}) {
  const needsReview = reading.requiresReview;
  if (question.tipo === "num") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Input
          className={`${spacious ? "h-11 w-40 text-lg" : "h-9 w-32"} font-mono`}
          value={reading.value ?? ""}
          maxLength={question.num_digitos ?? 3}
          inputMode="numeric"
          placeholder={"0".repeat(question.num_digitos ?? 3)}
          onChange={(event) => {
            const expectedDigits = question.num_digitos ?? 3;
            const digits = event.target.value.replace(/\D/g, "").slice(0, expectedDigits);
            onChange(digits || null, digits.length === expectedDigits);
          }}
        />
        <Button
          type="button"
          size={spacious ? "default" : "sm"}
          variant={reading.value === null && !needsReview ? "secondary" : "outline"}
          onClick={() => onChange(null)}
        >
          Em branco
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      {alternativas(question).map((option) => (
        <button
          key={option}
          type="button"
          className={`${spacious ? "h-12 w-12 text-base" : "h-9 w-9 text-sm"} rounded-full border font-semibold transition ${reading.value === option ? (needsReview ? "border-amber-600 bg-amber-100 text-amber-950" : "border-primary bg-primary text-primary-foreground") : "border-input bg-background hover:bg-muted"}`}
          onClick={() => onChange(option, true)}
        >
          {option}
        </button>
      ))}
      <Button
        type="button"
        size={spacious ? "default" : "sm"}
        variant={reading.value === null && !needsReview ? "secondary" : "outline"}
        onClick={() => onChange(null)}
      >
        Em branco
      </Button>
    </div>
  );
}

function ReadingStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "green" | "gray" | "blue" | "amber";
}) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-900",
    gray: "border-slate-200 bg-slate-50 text-slate-900",
    blue: "border-sky-200 bg-sky-50 text-sky-900",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
  };
  return (
    <div className={`rounded-lg border p-3 ${tones[tone]}`}>
      <div className="text-xs">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

function ReaderLoading({ onBack, label }: { onBack: () => void; label: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <Button type="button" variant="ghost" size="sm" className="-ml-3 mb-3" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Button>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {label}
      </div>
    </section>
  );
}

function ReaderMessage({ onBack, children }: { onBack: () => void; children: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <Button type="button" variant="ghost" size="sm" className="-ml-3 mb-3" onClick={onBack}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Voltar
      </Button>
      <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <FileScan className="h-4 w-4 shrink-0" /> {children}
      </div>
    </section>
  );
}

async function decodeScan(blob: Blob): Promise<{ raster: OmrRasterImage; image: ImageBitmap }> {
  const image = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) {
    image.close();
    throw new Error("O navegador não conseguiu preparar a imagem para leitura.");
  }
  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(0, 0, image.width, image.height);
  return {
    image,
    raster: { data: imageData.data, width: image.width, height: image.height },
  };
}

function createAnalysisOverlay(image: ImageBitmap, analysis: AnswerSheetOmrAnalysis): string {
  const maximumSide = 1600;
  const scale = Math.min(1, maximumSide / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) return "";
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.lineWidth = Math.max(1.5, 2 * scale);

  for (const marker of Object.values(analysis.markers)) {
    context.strokeStyle = "#06b6d4";
    context.strokeRect(marker.x * scale - 8, marker.y * scale - 8, 16, 16);
  }
  for (const reading of analysis.readings) {
    for (const sample of reading.samples) {
      const radius = Math.max(3, sample.imageRadius * scale);
      context.beginPath();
      context.arc(sample.imageX * scale, sample.imageY * scale, radius, 0, Math.PI * 2);
      context.strokeStyle = reading.requiresReview ? "#f59e0b" : "rgba(37, 99, 235, 0.72)";
      context.stroke();
      if (isReadSample(reading, sample, analysis.threshold)) {
        drawReadPoint(
          context,
          sample.imageX * scale,
          sample.imageY * scale,
          radius,
          reading.requiresReview ? "#f59e0b" : "#2563eb",
        );
      }
    }
  }
  return canvas.toDataURL("image/jpeg", 0.84);
}

function isReadSample(
  reading: OmrQuestionReading,
  sample: OmrQuestionReading["samples"][number],
  threshold: number,
): boolean {
  if (reading.value !== null) {
    return reading.kind === "numeric"
      ? sample.digitIndex !== null && reading.value[sample.digitIndex] === sample.value
      : reading.value === sample.value;
  }
  return reading.requiresReview && sample.score >= threshold;
}

function drawReadPoint(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  bubbleRadius: number,
  color: string,
) {
  const pointRadius = Math.max(2.5, Math.min(5.5, bubbleRadius * 0.3));
  context.beginPath();
  context.arc(x, y, pointRadius + 1.5, 0, Math.PI * 2);
  context.fillStyle = "rgba(255, 255, 255, 0.94)";
  context.fill();
  context.beginPath();
  context.arc(x, y, pointRadius, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}

function buildReadingPayload(
  readings: OmrQuestionReading[],
  meta: {
    modeloId: string;
    pagina: number;
    threshold: number;
    markerConfidence: number;
    averageConfidence: number;
  },
): Json {
  return {
    schemaVersion: 1,
    modeloId: meta.modeloId,
    pagina: meta.pagina,
    limiar: round(meta.threshold),
    confiancaMarcadores: round(meta.markerConfidence),
    confiancaMedia: round(meta.averageConfidence),
    respostas: readings.map((reading) => ({
      questaoId: reading.questionId,
      numero: reading.questionNumber,
      tipo: reading.kind,
      valor: reading.value,
      status: reading.status,
      motivoRevisao: reading.reviewReason,
      valoresDetectados: reading.detectedValues,
      confianca: round(reading.confidence),
      requerRevisao: reading.requiresReview,
      escores: reading.samples.map((sample) => ({
        valor: sample.value,
        ordem: sample.digitIndex,
        escore: round(sample.score),
        x: Math.round(sample.imageX),
        y: Math.round(sample.imageY),
        raio: Math.round(sample.imageRadius),
      })),
    })),
  };
}

function restoreSavedReadings(value: Json | null): OmrQuestionReading[] {
  const payload = asRecord(value);
  const threshold = Number(payload?.limiar) || 0.28;
  const answers = Array.isArray(payload?.respostas) ? payload.respostas : [];
  return answers.flatMap((answer): OmrQuestionReading[] => {
    const record = asRecord(answer);
    if (!record || typeof record.questaoId !== "string" || !Number.isFinite(Number(record.numero)))
      return [];
    const kind =
      record.tipo === "numeric" ? "numeric" : record.tipo === "objective" ? "objective" : null;
    const status = isReadingStatus(record.status) ? record.status : "ambiguous";
    if (!kind) return [];
    const scores = Array.isArray(record.escores) ? record.escores : [];
    const samples: OmrQuestionReading["samples"] = scores.flatMap((score) => {
      const item = asRecord(score);
      if (!item || typeof item.valor !== "string") return [];
      return [
        {
          questionId: record.questaoId as string,
          questionNumber: Number(record.numero),
          kind,
          value: item.valor,
          digitIndex: item.ordem === null || item.ordem === undefined ? null : Number(item.ordem),
          x: 0,
          y: 0,
          radiusX: 0,
          radiusY: 0,
          imageX: Number.isFinite(Number(item.x)) ? Number(item.x) : 0,
          imageY: Number.isFinite(Number(item.y)) ? Number(item.y) : 0,
          imageRadius: Number.isFinite(Number(item.raio)) ? Number(item.raio) : 0,
          score: Number.isFinite(Number(item.escore)) ? Number(item.escore) : 0,
        },
      ];
    });
    const reviewReason = isReviewReason(record.motivoRevisao)
      ? record.motivoRevisao
      : inferSavedReviewReason(status, kind, samples, threshold);
    const detectedValues = Array.isArray(record.valoresDetectados)
      ? record.valoresDetectados.filter((item): item is string => typeof item === "string")
      : samples.filter((sample) => sample.score >= threshold).map((sample) => sample.value);
    return [
      {
        questionId: record.questaoId,
        questionNumber: Number(record.numero),
        kind,
        value: typeof record.valor === "string" ? record.valor : null,
        status,
        reviewReason,
        detectedValues,
        confidence: Number.isFinite(Number(record.confianca)) ? Number(record.confianca) : 0,
        requiresReview: record.requerRevisao === true,
        samples,
      },
    ];
  });
}

function inferSavedReviewReason(
  status: OmrQuestionReading["status"],
  kind: OmrQuestionReading["kind"],
  samples: OmrQuestionReading["samples"],
  threshold: number,
): OmrReviewReason | null {
  if (status !== "ambiguous") return null;
  const marked = samples.filter((sample) => sample.score >= threshold);
  if (kind === "objective") return marked.length > 1 ? "multiple" : "weak";
  const byDigit = new Map<number, number>();
  for (const sample of marked) {
    if (sample.digitIndex === null) continue;
    byDigit.set(sample.digitIndex, (byDigit.get(sample.digitIndex) ?? 0) + 1);
  }
  if ([...byDigit.values()].some((count) => count > 1)) return "multiple";
  const expectedDigits = new Set(
    samples.flatMap((sample) => (sample.digitIndex === null ? [] : [sample.digitIndex])),
  ).size;
  return byDigit.size < expectedDigits ? "incomplete" : "weak";
}

function restoreSavedMeta(value: Json | null) {
  const payload = asRecord(value);
  if (!payload) return null;
  return {
    threshold: Number(payload.limiar) || 0,
    markerConfidence: Number(payload.confiancaMarcadores) || 0,
    averageConfidence: Number(payload.confiancaMedia) || 0,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function isReadingStatus(value: unknown): value is OmrQuestionReading["status"] {
  return (
    value === "confident" || value === "blank" || value === "ambiguous" || value === "reviewed"
  );
}

function isReviewReason(value: unknown): value is OmrReviewReason {
  return value === "multiple" || value === "weak" || value === "incomplete";
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof OmrAnalysisError || error instanceof Error) return error.message;
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string")
    return error.message;
  return fallback;
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "percent", maximumFractionDigits: 0 }).format(
    value,
  );
}

function round(value: number) {
  return Math.round(value * 10_000) / 10_000;
}

function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}
