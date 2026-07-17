import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Eye,
  ImagePlus,
  Loader2,
  Mail,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { obterAlunoFirebase } from "@/integrations/firebase/academic-data";
import { getCurrentUser } from "@/integrations/firebase/auth";
import { getFirebaseStorage } from "@/integrations/firebase/client";
import {
  calculateFeedbackScore,
  generateFeedbackPdf,
  type FeedbackAssessment,
  type FeedbackQuestion,
  type FeedbackResponse,
  type FeedbackStudent,
} from "@/lib/devolutiva-pdf";
import {
  getAvaliacao,
  listQuestoes,
  listRespostasByAvaliacao,
  updateQuestao,
  type Questao,
} from "@/lib/domain";
import {
  connectGmail,
  getSavedGmailConnection,
  isGmailConnectionValid,
  sendPdfWithGmail,
  type GmailConnection,
} from "@/lib/gmail-sender";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

type AssessmentRecord = FeedbackAssessment & { turma_id: string | null };
type DiscursiveDraft = {
  modelAnswer: string;
  imagePath: string | null;
  originalImagePath: string | null;
};

type ImageUrls = Record<string, string | null>;

export function ClassFeedbackPanel(_props: { turmaId: string }) {
  return null;
}

export function StudentFeedbackEditor({
  assessmentId,
  studentId,
  embedded = false,
  showStudentScores = true,
}: {
  assessmentId: string;
  studentId: string;
  embedded?: boolean;
  showStudentScores?: boolean;
}) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, DiscursiveDraft>>({});
  const [imageUrls, setImageUrls] = useState<ImageUrls>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingQuestionId, setUploadingQuestionId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [connectingGmail, setConnectingGmail] = useState(false);
  const [gmail, setGmail] = useState<GmailConnection | null>(() =>
    getSavedGmailConnection(),
  );

  const userQuery = useQuery({
    queryKey: ["firebase-feedback-user"],
    queryFn: async () => {
      const user = getCurrentUser();
      if (!user) throw new Error("Sua sessão do Firebase expirou. Entre novamente.");
      await user.getIdToken();
      return {
        id: user.uid,
        email: user.email?.trim().toLowerCase() ?? null,
      };
    },
  });

  const assessmentQuery = useQuery({
    queryKey: ["firebase-feedback-assessment", assessmentId],
    queryFn: async () => (await getAvaliacao(assessmentId)) as AssessmentRecord,
  });

  const studentQuery = useQuery({
    queryKey: ["firebase-feedback-student", studentId],
    queryFn: async (): Promise<FeedbackStudent> => {
      const student = await obterAlunoFirebase(studentId);
      if (!student) throw new Error("Aluno não encontrado.");
      return {
        id: student.id,
        nome: student.nome,
        matricula: student.matricula,
        email: student.email,
      };
    },
  });

  const questionsQuery = useQuery({
    queryKey: ["firebase-feedback-questions", assessmentId],
    queryFn: () => listQuestoes(assessmentId),
  });

  const responsesQuery = useQuery({
    queryKey: ["firebase-feedback-responses", assessmentId],
    queryFn: async (): Promise<FeedbackResponse[]> =>
      (await listRespostasByAvaliacao(assessmentId)).map((response) => ({
        aluno_id: response.aluno_id,
        questao_id: response.questao_id,
        resposta: response.resposta,
        nota_manual: response.nota_manual ?? null,
        feedback: response.feedback ?? null,
      })),
  });

  const assessment = assessmentQuery.data ?? null;
  const student = studentQuery.data ?? null;
  const questions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data]);
  const allResponses = useMemo(() => responsesQuery.data ?? [], [responsesQuery.data]);
  const responses = useMemo(
    () => allResponses.filter((response) => response.aluno_id === studentId),
    [allResponses, studentId],
  );
  const responsesByQuestion = useMemo(
    () => new Map(responses.map((response) => [response.questao_id, response])),
    [responses],
  );
  const discursiveQuestions = useMemo(
    () => questions.filter((question) => question.tipo === "disc"),
    [questions],
  );
  const score = useMemo(
    () => calculateFeedbackScore(questions as FeedbackQuestion[], responses),
    [questions, responses],
  );

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        discursiveQuestions.map((question) => {
          const imagePath = question.resposta_modelo_imagem_path ?? null;
          return [
            question.id,
            {
              modelAnswer: question.resposta_modelo ?? "",
              imagePath,
              originalImagePath: imagePath,
            },
          ];
        }),
      ),
    );
    setDirty(false);
  }, [discursiveQuestions]);

  useEffect(() => {
    let cancelled = false;

    async function loadImages() {
      const storage = getFirebaseStorage();
      const entries = await Promise.all(
        discursiveQuestions.map(async (question) => {
          const path = question.resposta_modelo_imagem_path;
          if (!path) return [question.id, null] as const;
          try {
            return [question.id, await getDownloadURL(ref(storage, path))] as const;
          } catch {
            return [question.id, null] as const;
          }
        }),
      );

      if (!cancelled) setImageUrls(Object.fromEntries(entries));
    }

    void loadImages();
    return () => {
      cancelled = true;
    };
  }, [discursiveQuestions]);

  async function save(showToast = true) {
    if (!assessment) {
      throw new Error("Não foi possível carregar a avaliação.");
    }

    setSaving(true);

    try {
      const obsoleteImages: string[] = [];

      for (const question of discursiveQuestions) {
        const draft = drafts[question.id] ?? emptyDraft();

        await updateQuestao(question, {
          resposta_modelo: draft.modelAnswer.trim() || null,
          resposta_modelo_imagem_path: draft.imagePath,
        });

        if (
          draft.originalImagePath &&
          draft.originalImagePath !== draft.imagePath &&
          !obsoleteImages.includes(draft.originalImagePath)
        ) {
          obsoleteImages.push(draft.originalImagePath);
        }
      }

      let imageCleanupFailed = false;
      for (const path of obsoleteImages) {
        try {
          await deleteObject(ref(getFirebaseStorage(), path));
        } catch (error) {
          if (!isObjectNotFound(error)) imageCleanupFailed = true;
        }
      }

      setDrafts((current) =>
        Object.fromEntries(
          Object.entries(current).map(([questionId, draft]) => [
            questionId,
            { ...draft, originalImagePath: draft.imagePath },
          ]),
        ),
      );

      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["firebase-feedback-questions", assessmentId],
        }),
        queryClient.invalidateQueries({ queryKey: ["firebase-questoes", assessmentId] }),
      ]);

      setDirty(false);

      if (imageCleanupFailed) {
        toast.warning("A devolutiva foi salva, mas uma imagem antiga não pôde ser removida.");
      } else if (showToast) {
        toast.success("Modelo de resposta salvo no Firebase.");
      }
    } finally {
      setSaving(false);
    }
  }

  async function uploadModelImage(questionId: string, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const user = getCurrentUser();
    if (!user) return toast.error("Sua sessão do Firebase expirou. Entre novamente.");
    if (!new Set(["image/png", "image/jpeg", "image/webp"]).has(file.type)) {
      return toast.error("Use uma imagem PNG, JPG ou WEBP.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return toast.error("A imagem deve ter no máximo 5 MB.");
    }

    setUploadingQuestionId(questionId);

    try {
      const filename = sanitizeFilename(file.name);
      const path =
        `usuarios/${user.uid}/imagens-modelo/${assessmentId}/${questionId}/` +
        `${crypto.randomUUID()}-${filename}`;
      const storageReference = ref(getFirebaseStorage(), path);

      await uploadBytes(storageReference, file, {
        contentType: file.type,
        cacheControl: "private,max-age=3600",
        customMetadata: {
          avaliacaoId: assessmentId,
          questaoId: questionId,
        },
      });

      const url = await getDownloadURL(storageReference);
      setDrafts((current) => ({
        ...current,
        [questionId]: {
          ...(current[questionId] ?? emptyDraft()),
          imagePath: path,
        },
      }));
      setImageUrls((current) => ({ ...current, [questionId]: url }));
      setDirty(true);
      toast.success("Imagem adicionada à resposta-modelo.");
    } catch (error) {
      toast.error(message(error));
    } finally {
      setUploadingQuestionId(null);
    }
  }

  function removeModelImage(questionId: string) {
    setDrafts((current) => ({
      ...current,
      [questionId]: {
        ...(current[questionId] ?? emptyDraft()),
        imagePath: null,
      },
    }));
    setImageUrls((current) => ({ ...current, [questionId]: null }));
    setDirty(true);
  }

  async function buildPdf() {
    if (!assessment || !student || !userQuery.data?.email) {
      throw new Error("Não foi possível carregar os dados da devolutiva.");
    }

    if (dirty) await save(false);

    const finalQuestions = questions.map((question) => {
      const draft = drafts[question.id];
      if (question.tipo !== "disc" || !draft) return question;
      return {
        ...question,
        resposta_modelo: draft.modelAnswer.trim() || null,
        resposta_modelo_imagem_path: draft.imagePath,
        resposta_modelo_imagem_url: imageUrls[question.id] ?? null,
      };
    });

    return generateFeedbackPdf({
      assessment,
      student,
      questions: finalQuestions as FeedbackQuestion[],
      responses,
      classResponses: allResponses,
      teacherEmail: userQuery.data.email,
    });
  }

  async function authorizeGmail(): Promise<GmailConnection> {
    const email = userQuery.data?.email;
    if (!email) throw new Error("A conta do professor não possui e-mail.");

    setConnectingGmail(true);
    try {
      const connection = await connectGmail({ expectedEmail: email });
      setGmail(connection);
      toast.success(`Gmail ${connection.email} autorizado para envio.`);
      return connection;
    } finally {
      setConnectingGmail(false);
    }
  }

  async function download() {
    try {
      const pdf = await buildPdf();
      downloadBlob(pdf, `devolutiva-${student?.nome ?? "aluno"}.pdf`);
    } catch (error) {
      toast.error(message(error));
    }
  }

  async function preview() {
    const previewWindow = window.open("", "_blank");
    if (!previewWindow) {
      return toast.error("Permita pop-ups para visualizar o PDF antes do download.");
    }
    previewWindow.document.title = "Preparando devolutiva…";
    previewWindow.document.body.innerHTML =
      '<p style="font-family:Arial,sans-serif;padding:24px">Preparando a visualização do PDF…</p>';
    setPreviewing(true);
    try {
      const pdf = await buildPdf();
      const url = URL.createObjectURL(pdf);
      previewWindow.location.href = url;
      window.setTimeout(() => URL.revokeObjectURL(url), 5 * 60 * 1_000);
    } catch (error) {
      previewWindow.close();
      toast.error(message(error));
    } finally {
      setPreviewing(false);
    }
  }

  async function send() {
    if (!student?.email?.trim()) {
      return toast.error("Cadastre o e-mail deste aluno em Turmas e alunos.");
    }
    if (!assessment || !userQuery.data?.email) return;

    setSending(true);

    try {
      const connection = isGmailConnectionValid(gmail) ? gmail : await authorizeGmail();
      const pdf = await buildPdf();
      await sendPdfWithGmail(connection, {
        to: student.email,
        subject: `Devolutiva — ${assessment.titulo}`,
        text: emailText(student.nome, assessment.titulo, userQuery.data.email),
        pdf,
        filename: `devolutiva-${student.nome}.pdf`,
      });
      toast.success(`Devolutiva enviada para ${student.email}.`);
    } catch (error) {
      toast.error(message(error));
    } finally {
      setSending(false);
    }
  }

  if (
    assessmentQuery.isLoading ||
    studentQuery.isLoading ||
    questionsQuery.isLoading ||
    responsesQuery.isLoading
  ) {
    return <div className="p-8 text-sm text-muted-foreground">Carregando devolutiva…</div>;
  }

  const loadingError =
    assessmentQuery.error ??
    studentQuery.error ??
    questionsQuery.error ??
    responsesQuery.error ??
    userQuery.error;

  if (loadingError) {
    return <div className="p-8 text-sm text-destructive">{message(loadingError)}</div>;
  }

  if (!assessment || !student) {
    return <div className="p-8 text-sm text-muted-foreground">Avaliação ou aluno não encontrado.</div>;
  }

  return (
    <div
      className={
        embedded ? "bg-muted/30 p-4 md:p-6" : "min-h-screen bg-muted/30 p-4 md:p-8"
      }
    >
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            {!embedded && (
              <a
                href={`/avaliacoes/${assessmentId}`}
                className="inline-flex items-center text-sm text-muted-foreground hover:underline"
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Voltar para a avaliação
              </a>
            )}
            <h1
              className={`${embedded ? "text-2xl" : "mt-2 text-3xl"} font-bold tracking-tight`}
            >
              Devolutiva de {student.nome}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {assessment.titulo}
              {assessment.disciplina ? ` · ${assessment.disciplina}` : ""}
              {showStudentScores && (
                <>
                  {" "}· Nota atual: {formatNumber(score)} de{" "}
                  {formatNumber(Number(assessment.valor_total))}
                </>
              )}
            </p>
          </div>

          {isGmailConnectionValid(gmail) ? (
            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <Mail className="mr-2 h-4 w-4" /> Envio pelo Gmail de {gmail.email}
            </span>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={connectingGmail || sending}
              onClick={() => void authorizeGmail().catch((error) => toast.error(message(error)))}
            >
              {connectingGmail ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              Autorizar Gmail
            </Button>
          )}
        </div>

        <section className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Gabarito original da prova</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              As respostas oficiais aparecem dentro do cartão de cada questão no PDF.
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 w-20">Questão</th>
                  <th className="px-4 py-2 w-44">Tipo</th>
                  <th className="px-4 py-2">Resposta oficial</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((question) => (
                  <tr key={question.id} className="border-t border-border">
                    <td className="px-4 py-2 font-medium">{question.numero}</td>
                    <td className="px-4 py-2">{questionTypeLabel(question.tipo)}</td>
                    <td className="px-4 py-2">
                      {question.anulada
                        ? "Anulada"
                        : question.tipo === "disc"
                          ? "Resposta-modelo configurada abaixo"
                          : question.gabarito || "Não informado"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="font-semibold">Modelo das questões discursivas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              A resposta-modelo é comum à turma e pode conter texto, imagem ou ambos. A nota é
              definida na aba Correção.
            </p>
          </div>

          {discursiveQuestions.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">
              Esta avaliação não possui questões discursivas.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {discursiveQuestions.map((question) => {
                const draft = drafts[question.id] ?? emptyDraft();
                const imageUrl = imageUrls[question.id];
                const manualScore = responsesByQuestion.get(question.id)?.nota_manual ?? null;

                return (
                  <div key={question.id} className="space-y-5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">Questão {question.numero}</h3>
                        <p className="text-xs text-muted-foreground">
                          Valor: {formatNumber(Number(question.valor))} ponto(s)
                        </p>
                      </div>
                      {showStudentScores && (
                        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                          <span className="text-muted-foreground">Nota do aluno: </span>
                          <span className="font-semibold">
                            {manualScore == null ? "Não informada" : formatNumber(manualScore)}
                          </span>{" "}
                          / {formatNumber(Number(question.valor))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`model-${question.id}`}>Resposta-modelo em texto</Label>
                      <textarea
                        id={`model-${question.id}`}
                        rows={4}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={draft.modelAnswer}
                        onChange={(event) =>
                          updateDraft(
                            question.id,
                            { modelAnswer: event.target.value },
                            setDrafts,
                            setDirty,
                          )
                        }
                        placeholder="Digite a resposta esperada, os conceitos e o raciocínio correto."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Imagem da resposta-modelo</Label>
                      <div className="flex flex-wrap items-start gap-3">
                        <label className="inline-flex cursor-pointer items-center rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted">
                          {uploadingQuestionId === question.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <ImagePlus className="mr-2 h-4 w-4" />
                          )}
                          {imageUrl ? "Trocar imagem" : "Adicionar imagem"}
                          <input
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            className="hidden"
                            disabled={uploadingQuestionId === question.id}
                            onChange={(event) => void uploadModelImage(question.id, event)}
                          />
                        </label>
                        {imageUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => removeModelImage(question.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Remover imagem
                          </Button>
                        )}
                      </div>
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={`Resposta-modelo da questão ${question.numero}`}
                          className="max-h-80 max-w-full rounded-md border border-border object-contain"
                        />
                      )}
                    </div>

                  </div>
                );
              })}
            </div>
          )}
        </section>

        {!student.email && (
          <div className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            Cadastre o e-mail de {student.nome} na área Turmas e alunos antes de enviar.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={!dirty || saving || sending}
              onClick={() => void save().catch((error) => toast.error(message(error)))}
            >
              {saving ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Salvar modelo de resposta
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || sending || previewing}
              onClick={() => void preview()}
            >
              {previewing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Eye className="mr-2 h-4 w-4" />
              )}
              Visualizar PDF
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || sending || previewing}
              onClick={() => void download()}
            >
              <Download className="mr-2 h-4 w-4" /> Baixar PDF
            </Button>
          </div>
          <Button
            type="button"
            disabled={saving || sending || connectingGmail || !student.email}
            onClick={() => void send()}
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Enviar devolutiva
          </Button>
        </div>
      </div>
    </div>
  );
}

function emptyDraft(): DiscursiveDraft {
  return {
    modelAnswer: "",
    imagePath: null,
    originalImagePath: null,
  };
}

function updateDraft(
  questionId: string,
  patch: Partial<DiscursiveDraft>,
  setDrafts: React.Dispatch<React.SetStateAction<Record<string, DiscursiveDraft>>>,
  setDirty: React.Dispatch<React.SetStateAction<boolean>>,
) {
  setDrafts((current) => ({
    ...current,
    [questionId]: { ...(current[questionId] ?? emptyDraft()), ...patch },
  }));
  setDirty(true);
}

function questionTypeLabel(type: FeedbackQuestion["tipo"]): string {
  if (type === "mc") return "Múltipla escolha";
  if (type === "ce") return "Certo/Errado";
  if (type === "num") return "Numérica";
  return "Discursiva";
}

function sanitizeFilename(value: string): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || "resposta-modelo.jpg";
}

function emailText(studentName: string, assessmentTitle: string, teacherEmail: string): string {
  return `Olá, ${studentName}.\n\nSegue em anexo a devolutiva da avaliação “${assessmentTitle}”. O PDF apresenta sua nota, o resumo do desempenho, a análise de cada questão, as estatísticas da turma e os comentários do professor.\n\nAtenciosamente,\n${teacherEmail}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(Number(value));
}

function isObjectNotFound(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "storage/object-not-found"
  );
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
