import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Cropper, { type Area, type MediaSize, type Point, type Size } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";
import {
  CheckCircle2,
  Camera,
  ChevronLeft,
  ChevronRight,
  CloudOff,
  Crop,
  FileImage,
  FileText,
  FolderOpen,
  Images,
  Loader2,
  RotateCcw,
  RotateCw,
  ScanLine,
  Trash2,
  Upload,
  X,
  ZoomIn,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { AnswerSheetMarkReader } from "@/components/answer-sheet-mark-reader";
import {
  ANSWER_SHEET_SCAN_ACCEPT,
  ANSWER_SHEET_SCAN_MAX_BYTES,
  createPreparedAnswerSheetImage,
  loadAnswerSheetPdf,
  renderAnswerSheetPdfPage,
  type AnswerSheetScanMime,
  type LoadedAnswerSheetPdf,
  validateAnswerSheetScanFile,
} from "@/lib/answer-sheet-scan";
import {
  deleteAnswerSheetScan,
  isAnswerSheetPersistenceUnavailable,
  listAnswerSheetScans,
  uploadAnswerSheetScan,
  type Aluno,
  type Avaliacao,
  type DigitalizacaoFolha,
} from "@/lib/domain";
import { assertOnline } from "@/lib/mobile-native-runtime";
import {
  acquireNativeAnswerSheetImage,
  clearPendingNativeScan,
  isNativeMobileApp,
  observeRestoredNativeScan,
  openFileOnDevice,
  persistPendingNativeScan,
  restorePendingNativeScan,
} from "@/mobile/native-device";

type CropFormat = "original" | "a4-portrait" | "a4-landscape";

const A4_ASPECT = 210 / 297;
const STATUS_LABEL: Record<DigitalizacaoFolha["status"], string> = {
  preparada: "Pronta para identificação",
  identificada: "Identificada",
  revisao: "Aguardando revisão",
  processada: "Processada",
  erro: "Com erro",
};

export function AnswerSheetUploadPanel({
  avaliacao,
  alunos,
  connected = true,
}: {
  avaliacao: Avaliacao;
  alunos: Aluno[];
  connected?: boolean;
}) {
  const avaliacaoId = avaliacao.id;
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const imageObjectUrlRef = useRef<string | null>(null);
  const pdfDocumentRef = useRef<LoadedAnswerSheetPdf | null>(null);
  const pageRequestRef = useRef(0);
  const native = isNativeMobileApp();

  const [file, setFile] = useState<File | null>(null);
  const [mime, setMime] = useState<AnswerSheetScanMime | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [loadingSource, setLoadingSource] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [cropPixels, setCropPixels] = useState<Area | null>(null);
  const [cropSize, setCropSize] = useState<Size | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [cropFormat, setCropFormat] = useState<CropFormat>("original");
  const [sourceAspect, setSourceAspect] = useState(A4_ASPECT);
  const [activeScan, setActiveScan] = useState<DigitalizacaoFolha | null>(null);
  const [nativeAction, setNativeAction] = useState<"camera" | "gallery" | null>(null);

  const scans = useQuery({
    queryKey: ["answer-sheet-scans", avaliacaoId],
    queryFn: () => listAnswerSheetScans(avaliacaoId),
    enabled: connected,
    retry: false,
  });

  const releaseSources = useCallback(() => {
    if (imageObjectUrlRef.current) {
      URL.revokeObjectURL(imageObjectUrlRef.current);
      imageObjectUrlRef.current = null;
    }
    if (pdfDocumentRef.current) {
      void pdfDocumentRef.current.destroy();
      pdfDocumentRef.current = null;
    }
  }, []);

  const resetEditor = useCallback(
    (clearPending = true) => {
      pageRequestRef.current += 1;
      releaseSources();
      setFile(null);
      setMime(null);
      setSource(null);
      setPageNumber(1);
      setPageCount(1);
      setLoadingSource(false);
      setCrop({ x: 0, y: 0 });
      setCropPixels(null);
      setCropSize(null);
      setZoom(1);
      setRotation(0);
      setCropFormat("original");
      setSourceAspect(A4_ASPECT);
      if (clearPending) void clearPendingNativeScan(avaliacaoId);
    },
    [avaliacaoId, releaseSources],
  );

  useEffect(() => () => releaseSources(), [releaseSources]);

  const resetPosition = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setCropPixels(null);
    setCropSize(null);
    setZoom(1);
    setRotation(0);
  }, []);

  const selectFile = useCallback(
    async (selectedFile: File, persistForRecovery = true) => {
      releaseSources();
      pageRequestRef.current += 1;
      setSource(null);
      setLoadingSource(true);
      resetPosition();
      setCropFormat("original");

      try {
        const selectedMime = validateAnswerSheetScanFile(selectedFile);
        if (native && persistForRecovery) {
          await persistPendingNativeScan(avaliacaoId, selectedFile).catch((error) => {
            console.warn("Não foi possível guardar o arquivo para recuperação.", error);
          });
        }
        setFile(selectedFile);
        setMime(selectedMime);

        if (selectedMime === "application/pdf") {
          const document = await loadAnswerSheetPdf(selectedFile);
          pdfDocumentRef.current = document;
          const renderedPage = await renderAnswerSheetPdfPage(document.document, 1);
          setPageNumber(1);
          setPageCount(document.numPages);
          setSource(renderedPage);
        } else {
          const objectUrl = URL.createObjectURL(selectedFile);
          imageObjectUrlRef.current = objectUrl;
          setPageNumber(1);
          setPageCount(1);
          setSource(objectUrl);
        }
      } catch (error) {
        releaseSources();
        setFile(null);
        setMime(null);
        setSource(null);
        toast.error(getErrorMessage(error, "Não foi possível abrir o arquivo."));
      } finally {
        setLoadingSource(false);
      }
    },
    [avaliacaoId, native, releaseSources, resetPosition],
  );

  useEffect(() => {
    if (!native) return;

    let disposed = false;
    const restore = async () => {
      const restored = await restorePendingNativeScan(avaliacaoId);
      if (!disposed && restored) await selectFile(restored, false);
    };

    void restore().catch((error) => {
      console.warn("Não foi possível restaurar a folha pendente.", error);
    });

    const stopObserving = observeRestoredNativeScan(avaliacaoId, () => {
      void restore().catch((error) => {
        toast.error(getErrorMessage(error, "Não foi possível recuperar a imagem da câmera."));
      });
    });

    return () => {
      disposed = true;
      stopObserving();
    };
  }, [avaliacaoId, native, selectFile]);

  const acquireNativeImage = useCallback(
    async (sourceType: "camera" | "gallery") => {
      if (!connected) {
        toast.info("Você pode preparar a folha offline; conecte-se antes de enviar.");
      }
      setNativeAction(sourceType);
      try {
        const selectedFile = await acquireNativeAnswerSheetImage(avaliacaoId, sourceType);
        if (selectedFile) await selectFile(selectedFile, false);
      } catch (error) {
        toast.error(getErrorMessage(error, "O Android não conseguiu abrir a imagem."));
      } finally {
        setNativeAction(null);
      }
    },
    [avaliacaoId, connected, selectFile],
  );

  const changePdfPage = useCallback(
    async (nextPage: number) => {
      const document = pdfDocumentRef.current;
      if (!document || nextPage < 1 || nextPage > document.numPages) return;

      const request = pageRequestRef.current + 1;
      pageRequestRef.current = request;
      setLoadingSource(true);
      resetPosition();
      try {
        const renderedPage = await renderAnswerSheetPdfPage(document.document, nextPage);
        if (request !== pageRequestRef.current) return;
        setSource(renderedPage);
        setPageNumber(nextPage);
      } catch (error) {
        toast.error(getErrorMessage(error, "Não foi possível abrir essa página do PDF."));
      } finally {
        if (request === pageRequestRef.current) setLoadingSource(false);
      }
    },
    [resetPosition],
  );

  const upload = useMutation({
    mutationFn: async () => {
      if (!file || !mime || !source || !cropPixels) {
        throw new Error("Ajuste o recorte da folha antes de salvar.");
      }
      assertOnline(connected, "enviar a folha");
      const prepared = await createPreparedAnswerSheetImage(source, cropPixels, rotation);
      return uploadAnswerSheetScan({
        avaliacaoId,
        arquivoOriginal: file.name,
        mimeOriginal: mime,
        paginaOrigem: pageNumber,
        rotacao: rotation,
        recorte: {
          x: cropPixels.x,
          y: cropPixels.y,
          width: cropPixels.width,
          height: cropPixels.height,
          zoom,
          format: cropFormat,
        },
        imagem: prepared.blob,
        larguraPx: prepared.width,
        alturaPx: prepared.height,
      });
    },
    onSuccess: async () => {
      toast.success("Folha preparada e salva para correção.");
      resetEditor(true);
      await queryClient.invalidateQueries({ queryKey: ["answer-sheet-scans", avaliacaoId] });
    },
    onError: (error) => {
      const message = isAnswerSheetPersistenceUnavailable(error)
        ? "O banco de dados ainda não recebeu a estrutura de upload deste PR."
        : getErrorMessage(error, "Não foi possível salvar a folha.");
      toast.error(message);
    },
  });

  const remove = useMutation({
    mutationFn: (scan: DigitalizacaoFolha) => {
      assertOnline(connected, "remover a folha");
      return deleteAnswerSheetScan(scan);
    },
    onSuccess: async () => {
      toast.success("Folha removida.");
      await queryClient.invalidateQueries({ queryKey: ["answer-sheet-scans", avaliacaoId] });
    },
    onError: (error) => toast.error(getErrorMessage(error, "Não foi possível remover a folha.")),
  });

  const sourceCropAspect = rotation === 90 || rotation === 270 ? 1 / sourceAspect : sourceAspect;
  const cropAspect =
    cropFormat === "a4-portrait"
      ? A4_ASPECT
      : cropFormat === "a4-landscape"
        ? 1 / A4_ASPECT
        : sourceCropAspect;
  const migrationPending = Boolean(scans.error && isAnswerSheetPersistenceUnavailable(scans.error));

  if (activeScan) {
    return (
      <AnswerSheetMarkReader
        scan={activeScan}
        avaliacao={avaliacao}
        alunos={alunos}
        onBack={() => setActiveScan(null)}
        onCompleted={() => setActiveScan(null)}
      />
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Upload className="h-5 w-5" />
            Enviar folhas respondidas
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Envie JPG, PNG ou PDF, escolha a página e ajuste a folha antes da correção.
          </p>
        </div>
        {file && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => resetEditor()}
            disabled={upload.isPending}
          >
            <X className="mr-1 h-4 w-4" /> Trocar arquivo
          </Button>
        )}
      </div>

      {migrationPending && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          O banco conectado ainda não recebeu a migration de digitalizações. O enquadramento pode
          ser testado, mas o arquivo só será salvo após aplicar as migrations de upload e leitura.
        </div>
      )}

      {!connected && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Sem internet. Você pode capturar e ajustar a folha; o arquivo fica guardado no aparelho
            até a conexão voltar.
          </span>
        </div>
      )}

      {!file ? (
        <div className="space-y-3">
          {native && (
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                className="h-12"
                onClick={() => void acquireNativeImage("camera")}
                disabled={nativeAction !== null}
              >
                {nativeAction === "camera" ? <Loader2 className="animate-spin" /> : <Camera />}
                Câmera
              </Button>
              <Button
                type="button"
                className="h-12"
                variant="outline"
                onClick={() => void acquireNativeImage("gallery")}
                disabled={nativeAction !== null}
              >
                {nativeAction === "gallery" ? <Loader2 className="animate-spin" /> : <Images />}
                Galeria
              </Button>
            </div>
          )}
          <button
            type="button"
            className={`flex min-h-44 w-full flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/60 hover:bg-muted/30"}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              const droppedFile = event.dataTransfer.files[0];
              if (droppedFile) void selectFile(droppedFile);
            }}
          >
            <span className="mb-3 rounded-full bg-primary/10 p-3 text-primary">
              <Upload className="h-6 w-6" />
            </span>
            <span className="font-medium">
              {native ? "Selecionar imagem ou PDF" : "Clique ou arraste a folha até aqui"}
            </span>
            <span className="mt-1 text-sm text-muted-foreground">
              JPG, PNG ou PDF de até {formatBytes(ANSWER_SHEET_SCAN_MAX_BYTES)}
            </span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-muted/25 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2 text-sm">
              {mime === "application/pdf" ? (
                <FileText className="h-4 w-4 shrink-0 text-red-600" />
              ) : (
                <FileImage className="h-4 w-4 shrink-0 text-sky-600" />
              )}
              <span className="max-w-72 truncate font-medium" title={file.name}>
                {file.name}
              </span>
              <span className="text-muted-foreground">· {formatBytes(file.size)}</span>
            </div>
            {(native || mime === "application/pdf") && (
              <div className="flex flex-wrap items-center gap-1">
                {native && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void openFileOnDevice(file).catch((error) =>
                        toast.error(getErrorMessage(error, "Não foi possível abrir o arquivo.")),
                      )
                    }
                  >
                    <FolderOpen className="mr-1 h-4 w-4" /> Abrir arquivo
                  </Button>
                )}
                {mime === "application/pdf" && (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void changePdfPage(pageNumber - 1)}
                      disabled={pageNumber <= 1 || loadingSource}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="min-w-28 text-center text-sm">
                      Página {pageNumber} de {pageCount}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => void changePdfPage(pageNumber + 1)}
                      disabled={pageNumber >= pageCount || loadingSource}
                      aria-label="Próxima página"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {source && !loadingSource && (
            <div className="rounded-md border border-cyan-200 bg-cyan-50 px-3 py-2 text-center text-sm font-medium text-cyan-950">
              Encaixe cada quadrado preto dentro da janela azul correspondente
            </div>
          )}

          <div className="relative h-[min(62vh,620px)] min-h-96 overflow-hidden rounded-lg bg-slate-950">
            {source && !loadingSource && (
              <Cropper
                image={source}
                crop={crop}
                zoom={zoom}
                rotation={rotation}
                aspect={cropAspect}
                onCropChange={setCrop}
                onCropComplete={(_area, pixels) => setCropPixels(pixels)}
                onCropSizeChange={setCropSize}
                onZoomChange={setZoom}
                onMediaLoaded={(media: MediaSize) => {
                  const aspect = media.naturalWidth / media.naturalHeight;
                  setSourceAspect(aspect);
                  setCropFormat("original");
                }}
                objectFit="contain"
                showGrid={false}
                classes={{ cropAreaClassName: "answer-sheet-alignment-crop" }}
                zoomWithScroll
                minZoom={1}
                maxZoom={3}
                restrictPosition
              />
            )}
            {source && !loadingSource && cropSize && <AlignmentMarkerGuides cropSize={cropSize} />}
            {loadingSource && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="h-7 w-7 animate-spin" />
                <span className="text-sm">Preparando visualização…</span>
              </div>
            )}
          </div>

          <div className="grid gap-4 rounded-lg border border-border p-4 lg:grid-cols-[1fr_auto]">
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-[100px_1fr_48px] sm:items-center">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ZoomIn className="h-4 w-4" /> Zoom
                </div>
                <Slider
                  value={[zoom]}
                  min={1}
                  max={3}
                  step={0.01}
                  onValueChange={([value]) => setZoom(value)}
                  disabled={loadingSource}
                />
                <span className="text-right text-xs tabular-nums text-muted-foreground">
                  {zoom.toFixed(1)}×
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 flex items-center gap-2 text-sm font-medium">
                  <Crop className="h-4 w-4" /> Quadro de leitura
                </span>
                <CropFormatButton
                  active={cropFormat === "original"}
                  onClick={() => setCropFormat("original")}
                >
                  Original / compacto
                </CropFormatButton>
                <CropFormatButton
                  active={cropFormat === "a4-portrait"}
                  onClick={() => setCropFormat("a4-portrait")}
                >
                  A4 retrato
                </CropFormatButton>
                <CropFormatButton
                  active={cropFormat === "a4-landscape"}
                  onClick={() => setCropFormat("a4-landscape")}
                >
                  A4 paisagem
                </CropFormatButton>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRotation((value) => (value + 270) % 360)}
                  disabled={loadingSource}
                >
                  <RotateCcw className="mr-2 h-4 w-4" /> Girar à esquerda
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setRotation((value) => (value + 90) % 360)}
                  disabled={loadingSource}
                >
                  <RotateCw className="mr-2 h-4 w-4" /> Girar à direita
                </Button>
                <span className="text-xs text-muted-foreground">Rotação: {rotation}°</span>
              </div>
            </div>
            <div className="flex items-end">
              <Button
                type="button"
                className="w-full lg:w-auto"
                onClick={() => {
                  if (migrationPending) {
                    toast.error(
                      "Aplique as migrations de digitalizações no Supabase antes de salvar.",
                    );
                    return;
                  }
                  upload.mutate();
                }}
                disabled={!connected || !source || !cropPixels || loadingSource || upload.isPending}
              >
                {upload.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Salvar folha preparada
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            O quadro inicial acompanha a proporção do arquivo, inclusive folhas compactas. Arraste e
            use o zoom apenas se algum dos quatro marcadores ficar fora dele. A imagem é comprimida
            com segurança e guardada de forma privada nesta avaliação.
          </p>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ANSWER_SHEET_SCAN_ACCEPT}
        onChange={(event) => {
          const selectedFile = event.target.files?.[0];
          event.target.value = "";
          if (selectedFile) void selectFile(selectedFile);
        }}
      />

      {!migrationPending && (
        <div className="border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Folhas preparadas</h3>
          {scans.isLoading ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </div>
          ) : scans.isError ? (
            <p className="mt-2 text-sm text-destructive">
              Não foi possível carregar as folhas preparadas.
            </p>
          ) : scans.data?.length ? (
            <div className="mt-3 divide-y divide-border overflow-hidden rounded-md border border-border">
              {scans.data.map((scan) => {
                const linkedStudent = alunos.find((student) => student.id === scan.aluno_id);
                const displayName = linkedStudent?.nome ?? "Sem aluno vinculado";
                return (
                  <div
                    key={scan.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-3 py-3"
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="rounded-md bg-emerald-50 p-2 text-emerald-700">
                        <FileImage className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="max-w-96 truncate text-sm font-medium" title={displayName}>
                          {displayName}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          <span title={scan.arquivo_original}>{scan.arquivo_original}</span> ·{" "}
                          {scan.mime_original === "application/pdf"
                            ? `Página ${scan.pagina_origem} · `
                            : ""}
                          {scan.largura_px} × {scan.altura_px} px ·{" "}
                          {formatBytes(scan.tamanho_bytes)} · {formatDate(scan.created_at)}
                        </div>
                        <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                          {STATUS_LABEL[scan.status]}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setActiveScan(scan)}
                        disabled={!connected}
                      >
                        <ScanLine className="mr-2 h-4 w-4" />
                        {scan.status === "revisao"
                          ? "Revisar leitura"
                          : scan.status === "processada"
                            ? "Ver leitura"
                            : "Ler marcações"}
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        disabled={!connected || remove.isPending}
                        onClick={() => {
                          if (window.confirm("Remover esta folha preparada?")) remove.mutate(scan);
                        }}
                        aria-label={`Remover ${scan.arquivo_original}`}
                      >
                        {remove.isPending && remove.variables?.id === scan.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              Nenhuma folha foi preparada nesta avaliação.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function AlignmentMarkerGuides({ cropSize }: { cropSize: Size }) {
  const guideSize = Math.max(34, Math.min(68, Math.min(cropSize.width, cropSize.height) * 0.105));
  const inset = Math.max(5, guideSize * 0.1);
  const positions = [
    { key: "top-left", top: inset, left: inset },
    { key: "top-right", top: inset, right: inset },
    { key: "bottom-left", bottom: inset, left: inset },
    { key: "bottom-right", bottom: inset, right: inset },
  ];

  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-[5] -translate-x-1/2 -translate-y-1/2"
      style={{ width: cropSize.width, height: cropSize.height }}
      aria-hidden="true"
    >
      {positions.map(({ key, ...position }) => (
        <span
          key={key}
          className="absolute rounded-sm border-2 border-cyan-300 bg-cyan-300/10 shadow-[0_0_0_1px_rgba(8,47,73,0.9),0_0_14px_rgba(34,211,238,0.45)]"
          style={{ width: guideSize, height: guideSize, ...position }}
        />
      ))}
    </div>
  );
}

function CropFormatButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${active ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background hover:bg-muted"}`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }
  return fallback;
}
