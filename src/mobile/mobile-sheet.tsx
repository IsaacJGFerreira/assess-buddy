import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Download,
  Eye,
  ExternalLink,
  FileCheck2,
  LayoutGrid,
  Loader2,
  RectangleHorizontal,
  RectangleVertical,
  Share2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { AnswerSheet } from "@/components/answer-sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  createOrGetAnswerSheet,
  getLatestAnswerSheetModel,
  listAlunosByTurma,
  listAnswerSheetModels,
  type Aluno,
  type Avaliacao,
  type IdentificacaoFolhaResposta,
  type ModeloFolhaResposta,
  type Questao,
} from "@/lib/domain";
import {
  clampIdentifierDigits,
  DEFAULT_IDENTIFIER_DIGITS,
  determineIdentifierDigits,
  isStudentEligibleForPrefilledSheet,
  MAX_IDENTIFIER_DIGITS,
  MIN_IDENTIFIER_DIGITS,
  type AnswerSheetIdentificationMode,
} from "@/lib/answer-sheet-identification";
import {
  DEFAULT_ANSWER_SHEET_LAYOUT,
  type AnswerSheetLayout,
  type AnswerSheetOrientation,
} from "@/lib/answer-sheet-layout";
import { restoreAnswerSheetModel } from "@/lib/answer-sheet-model";
import {
  renderAnswerSheetPdfBlob,
  safeFileName,
  triggerBlobDownload,
} from "@/lib/answer-sheet-export";

import { mobileQueryKeys } from "./mobile-query-keys";
import {
  isNativeMobileApp,
  openPdfOnDevice,
  savePdfOnDevice,
  sharePdfOnDevice,
} from "./native-device";
import {
  MobileCard,
  MobileCardHeader,
  MobileEmpty,
  MobileError,
  MobileField,
  MobileLoading,
  MobileNativeSelect,
  MobileStatusPill,
} from "./mobile-ui";

interface SheetPreview {
  assessment: Avaliacao;
  questions: Questao[];
  layout: AnswerSheetLayout;
  identificationMode: AnswerSheetIdentificationMode;
  identifierDigits: number;
  student: Aluno | null;
  identification: IdentificacaoFolhaResposta | null;
  versionLabel: string;
}

export function MobileSheet({
  assessment,
  questions,
  connected,
}: {
  assessment: Avaliacao;
  questions: Questao[];
  connected: boolean;
}) {
  const queryClient = useQueryClient();
  const [orientation, setOrientation] = useState<AnswerSheetOrientation>(
    DEFAULT_ANSWER_SHEET_LAYOUT.orientation,
  );
  const [columns, setColumns] = useState(DEFAULT_ANSWER_SHEET_LAYOUT.columns);
  const [rowsPerColumn, setRowsPerColumn] = useState(DEFAULT_ANSWER_SHEET_LAYOUT.rowsPerColumn);
  const [identificationMode, setIdentificationMode] =
    useState<AnswerSheetIdentificationMode>("none");
  const [identifierDigitsOverride, setIdentifierDigitsOverride] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [preview, setPreview] = useState<SheetPreview | null>(null);
  const hydratedModelId = useRef<string | null>(null);

  const studentsQuery = useQuery({
    queryKey: mobileQueryKeys.students(assessment.turma_id ?? ""),
    queryFn: () =>
      assessment.turma_id ? listAlunosByTurma(assessment.turma_id) : Promise.resolve([]),
    enabled: connected && Boolean(assessment.turma_id),
  });
  const latestModelQuery = useQuery({
    queryKey: mobileQueryKeys.latestSheetModel(assessment.id),
    queryFn: () => getLatestAnswerSheetModel(assessment.id),
    enabled: connected,
  });
  const modelsQuery = useQuery({
    queryKey: mobileQueryKeys.sheetModels(assessment.id),
    queryFn: () => listAnswerSheetModels(assessment.id),
    enabled: connected,
  });

  useEffect(() => {
    const model = latestModelQuery.data;
    if (!model || hydratedModelId.current === model.id) return;
    try {
      const restored = restoreAnswerSheetModel(model, assessment);
      setOrientation(restored.layout.orientation);
      setColumns(restored.layout.columns);
      setRowsPerColumn(restored.layout.rowsPerColumn);
      setIdentificationMode(restored.identification.mode);
      setIdentifierDigitsOverride(restored.identification.digits);
      hydratedModelId.current = model.id;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }, [assessment, latestModelQuery.data]);

  const students = useMemo(() => studentsQuery.data ?? [], [studentsQuery.data]);
  const derivedDigits = determineIdentifierDigits(students);
  const identifierDigits = clampIdentifierDigits(identifierDigitsOverride ?? derivedDigits);
  const eligibleStudents = students.filter((student) =>
    isStudentEligibleForPrefilledSheet(student, identifierDigits),
  );
  const effectiveStudentId = selectedStudentId || eligibleStudents[0]?.id || "";
  const selectedStudent =
    eligibleStudents.find((student) => student.id === effectiveStudentId) ?? null;
  const maxColumns = orientation === "portrait" ? 4 : 6;
  const maxRows = orientation === "portrait" ? 35 : 25;
  const layout: AnswerSheetLayout = {
    orientation,
    columns: Math.min(maxColumns, Math.max(1, columns)),
    rowsPerColumn: Math.min(maxRows, Math.max(5, rowsPerColumn)),
  };

  const generate = useMutation({
    mutationFn: () => {
      if (!questions.length)
        throw new Error("Cadastre ao menos uma questão antes de gerar a folha.");
      if (identificationMode === "prefilled" && !selectedStudent) {
        throw new Error("Selecione um aluno com matrícula numérica compatível.");
      }
      return createOrGetAnswerSheet({
        avaliacao: assessment,
        questoes: questions,
        alunoId: identificationMode === "prefilled" ? selectedStudent?.id : undefined,
        layout,
        identificationMode,
        identifierDigits,
      });
    },
    onSuccess: async (identification) => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: mobileQueryKeys.latestSheetModel(assessment.id),
        }),
        queryClient.invalidateQueries({ queryKey: mobileQueryKeys.sheetModels(assessment.id) }),
      ]);
      setPreview({
        assessment,
        questions,
        layout,
        identificationMode,
        identifierDigits,
        student: identificationMode === "prefilled" ? selectedStudent : null,
        identification,
        versionLabel: `Versão ${identification.versao}`,
      });
      toast.success(`Folha ${identification.codigo} · versão ${identification.versao}.`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  function previewModel(model: ModeloFolhaResposta) {
    try {
      const restored = restoreAnswerSheetModel(model, assessment);
      setPreview({
        assessment: restored.avaliacao,
        questions: restored.questoes,
        layout: restored.layout,
        identificationMode: restored.identification.mode,
        identifierDigits: restored.identification.digits,
        student: null,
        identification: null,
        versionLabel: `Versão ${model.versao}`,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  if (preview) {
    return <MobileSheetPreview preview={preview} onBack={() => setPreview(null)} />;
  }

  return (
    <div className="mobile-stack">
      <MobileCard>
        <MobileCardHeader
          title="Configuração da folha"
          description="A prévia é rolável para preservar as dimensões reais de impressão."
          action={
            latestModelQuery.data ? (
              <MobileStatusPill tone="success">
                Versão {latestModelQuery.data.versao}
              </MobileStatusPill>
            ) : null
          }
        />

        <div className="mobile-form">
          <fieldset className="mobile-field">
            <legend className="text-sm font-medium">Identificação pela matrícula</legend>
            <div className="mobile-choice-cards">
              {(
                [
                  ["none", "Sem identificação", "Somente as questões e bolhas."],
                  ["blank", "Matrícula em branco", "O aluno preenche os dígitos e as bolhas."],
                  ["prefilled", "Pré-preenchida", "Nome e matrícula de cada aluno."],
                ] as const
              ).map(([value, label, description]) => (
                <button
                  type="button"
                  key={value}
                  className={identificationMode === value ? "is-selected" : ""}
                  aria-pressed={identificationMode === value}
                  onClick={() => setIdentificationMode(value)}
                >
                  <strong>{label}</strong>
                  <span>{description}</span>
                </button>
              ))}
            </div>
          </fieldset>

          {identificationMode !== "none" && (
            <MobileField
              label="Quantidade de dígitos"
              htmlFor={`mobile-sheet-digits-${assessment.id}`}
              hint={`Entre ${MIN_IDENTIFIER_DIGITS} e ${MAX_IDENTIFIER_DIGITS} dígitos.`}
            >
              <Input
                id={`mobile-sheet-digits-${assessment.id}`}
                type="number"
                min={MIN_IDENTIFIER_DIGITS}
                max={MAX_IDENTIFIER_DIGITS}
                inputMode="numeric"
                value={identifierDigits}
                onChange={(event) =>
                  setIdentifierDigitsOverride(clampIdentifierDigits(Number(event.target.value)))
                }
              />
            </MobileField>
          )}

          {identificationMode === "prefilled" && (
            <MobileNativeSelect
              label="Aluno exibido na prévia"
              value={effectiveStudentId}
              disabled={studentsQuery.isPending}
              onChange={setSelectedStudentId}
            >
              <option value="">Selecione um aluno</option>
              {eligibleStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.nome} · {student.matricula}
                </option>
              ))}
            </MobileNativeSelect>
          )}

          <fieldset className="mobile-field">
            <legend className="text-sm font-medium">Orientação</legend>
            <div className="mobile-orientation-picker">
              <button
                type="button"
                className={orientation === "portrait" ? "is-selected" : ""}
                onClick={() => {
                  setOrientation("portrait");
                  setColumns((value) => Math.min(value, 4));
                }}
              >
                <RectangleVertical /> Vertical
              </button>
              <button
                type="button"
                className={orientation === "landscape" ? "is-selected" : ""}
                onClick={() => {
                  setOrientation("landscape");
                  setRowsPerColumn((value) => Math.min(value, 25));
                }}
              >
                <RectangleHorizontal /> Horizontal
              </button>
            </div>
          </fieldset>

          <div className="mobile-form-grid">
            <MobileNativeSelect
              label="Colunas"
              value={String(layout.columns)}
              onChange={(value) => setColumns(Number(value))}
            >
              {Array.from({ length: maxColumns }, (_, index) => index + 1).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </MobileNativeSelect>
            <MobileField label="Itens por coluna" htmlFor={`mobile-sheet-rows-${assessment.id}`}>
              <Input
                id={`mobile-sheet-rows-${assessment.id}`}
                type="number"
                min={5}
                max={maxRows}
                inputMode="numeric"
                value={layout.rowsPerColumn}
                onChange={(event) =>
                  setRowsPerColumn(Math.min(maxRows, Math.max(5, Number(event.target.value) || 5)))
                }
              />
            </MobileField>
          </div>

          <div className="mobile-sheet-live-preview">
            <div className="mobile-sheet-live-preview-header">
              <LayoutGrid />
              <span>
                {layout.columns} × {layout.rowsPerColumn} · até{" "}
                {layout.columns * layout.rowsPerColumn} itens por página
              </span>
            </div>
            {questions.length ? (
              <div className="mobile-answer-sheet-viewport is-compact-preview">
                <AnswerSheet
                  avaliacao={assessment}
                  questoes={questions}
                  aluno={identificationMode === "prefilled" ? selectedStudent : null}
                  layout={layout}
                  identificationMode={identificationMode}
                  identifierDigits={identifierDigits}
                />
              </div>
            ) : (
              <MobileEmpty>Cadastre questões para visualizar a folha.</MobileEmpty>
            )}
          </div>

          <Button
            type="button"
            disabled={
              !connected ||
              generate.isPending ||
              !questions.length ||
              (identificationMode === "prefilled" && !selectedStudent)
            }
            onClick={() => generate.mutate()}
          >
            {generate.isPending ? <Loader2 className="animate-spin" /> : <FileCheck2 />}
            Salvar modelo e abrir folha
          </Button>
        </div>
      </MobileCard>

      <MobileCard>
        <MobileCardHeader
          title="Modelos e versões"
          description="Cada configuração salva permanece disponível para conferência."
        />
        {!connected && modelsQuery.data === undefined ? (
          <MobileError error="Reconecte-se para carregar os modelos salvos." />
        ) : modelsQuery.isPending ? (
          <MobileLoading label="Carregando versões…" />
        ) : modelsQuery.isError ? (
          <MobileError error={modelsQuery.error} onRetry={() => void modelsQuery.refetch()} />
        ) : modelsQuery.data?.length ? (
          <div className="mobile-card-list">
            {modelsQuery.data.map((model) => (
              <button
                type="button"
                key={model.id}
                className="mobile-model-card"
                onClick={() => previewModel(model)}
              >
                <div>
                  <strong>Versão {model.versao}</strong>
                  <span>
                    {model.orientacao === "portrait" ? "Vertical" : "Horizontal"} · {model.colunas}{" "}
                    × {model.linhas_por_coluna}
                  </span>
                </div>
                <Eye />
              </button>
            ))}
          </div>
        ) : (
          <MobileEmpty>Nenhum modelo salvo ainda.</MobileEmpty>
        )}
      </MobileCard>
    </div>
  );
}

function MobileSheetPreview({ preview, onBack }: { preview: SheetPreview; onBack: () => void }) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [pdfAction, setPdfAction] = useState<"open" | "save" | "share" | null>(null);
  const native = isNativeMobileApp();
  const fileName = `${safeFileName(preview.assessment.titulo)}-folha-de-respostas.pdf`;

  async function handlePdf(action: "open" | "save" | "share") {
    if (!sheetRef.current || pdfAction) return;
    setPdfAction(action);
    try {
      const pdf = await renderAnswerSheetPdfBlob(sheetRef.current);
      if (!native) {
        triggerBlobDownload(pdf, fileName);
      } else if (action === "open") {
        await openPdfOnDevice(pdf, fileName);
      } else if (action === "save") {
        await savePdfOnDevice(pdf, fileName);
        toast.success("PDF salvo na pasta Documentos/Folha.");
      } else {
        await sharePdfOnDevice(pdf, fileName, `Folha de respostas · ${preview.assessment.titulo}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setPdfAction(null);
    }
  }

  return (
    <MobileCard className="mobile-sheet-preview-card">
      <MobileCardHeader
        title={`Folha de respostas · ${preview.versionLabel}`}
        description={
          preview.identification
            ? `Código ${preview.identification.codigo}`
            : "Snapshot histórico do modelo"
        }
        action={
          <Button type="button" variant="outline" onClick={onBack}>
            <ArrowLeft /> Voltar
          </Button>
        }
      />
      <div className="mobile-scroll-hint">
        Arraste para os lados e para baixo para conferir a folha inteira.
      </div>
      <div className="flex flex-wrap gap-2">
        {native ? (
          <>
            <Button
              type="button"
              variant="outline"
              disabled={pdfAction !== null}
              onClick={() => void handlePdf("open")}
            >
              {pdfAction === "open" ? <Loader2 className="animate-spin" /> : <ExternalLink />}
              Abrir PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={pdfAction !== null}
              onClick={() => void handlePdf("save")}
            >
              {pdfAction === "save" ? <Loader2 className="animate-spin" /> : <Download />}
              Salvar PDF
            </Button>
            <Button
              type="button"
              disabled={pdfAction !== null}
              onClick={() => void handlePdf("share")}
            >
              {pdfAction === "share" ? <Loader2 className="animate-spin" /> : <Share2 />}
              Compartilhar
            </Button>
          </>
        ) : (
          <Button
            type="button"
            disabled={pdfAction !== null}
            onClick={() => void handlePdf("save")}
          >
            {pdfAction ? <Loader2 className="animate-spin" /> : <Download />}
            Baixar PDF
          </Button>
        )}
      </div>
      <div ref={sheetRef} className="mobile-answer-sheet-viewport">
        <AnswerSheet
          avaliacao={preview.assessment}
          questoes={preview.questions}
          aluno={preview.student}
          layout={preview.layout}
          identificationMode={preview.identificationMode}
          identifierDigits={preview.identifierDigits || DEFAULT_IDENTIFIER_DIGITS}
          identification={
            preview.identification
              ? {
                  code: preview.identification.codigo,
                  version: preview.identification.versao,
                  qrPayload: preview.identification.qrPayload,
                }
              : null
          }
        />
      </div>
    </MobileCard>
  );
}
