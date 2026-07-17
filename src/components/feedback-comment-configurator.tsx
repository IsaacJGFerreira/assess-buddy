import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { RichCommentEditor } from "@/components/rich-comment-editor";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/integrations/firebase/auth";
import { getFirebaseStorage } from "@/integrations/firebase/client";
import { listQuestoes, updateQuestao, type Questao } from "@/lib/domain";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function FeedbackCommentConfigurator({
  assessmentId,
  selectedStudentCount,
  onBack,
}: {
  assessmentId: string;
  selectedStudentCount: number;
  onBack: () => void;
}) {
  const queryClient = useQueryClient();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [originals, setOriginals] = useState<Record<string, string>>({});
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);

  const questionsQuery = useQuery({
    queryKey: ["firebase-questoes", assessmentId],
    queryFn: () => listQuestoes(assessmentId),
  });
  const questions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data]);

  useEffect(() => {
    if (initialized || !questionsQuery.data) return;
    const values = Object.fromEntries(
      questionsQuery.data.map((question) => [question.id, question.orientacao_correcao ?? ""]),
    );
    setDrafts(values);
    setOriginals(values);
    setInitialized(true);
  }, [initialized, questionsQuery.data]);

  const dirty = questions.some(
    (question) => normalize(drafts[question.id]) !== normalize(originals[question.id]),
  );

  function goBack() {
    if (dirty && !window.confirm("Descartar as alterações que ainda não foram salvas?")) return;
    onBack();
  }

  async function uploadCommentImage(question: Questao, file: File): Promise<string> {
    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      throw new Error("Use uma imagem PNG, JPG ou WEBP.");
    }
    if (file.size > MAX_IMAGE_BYTES) {
      throw new Error("A imagem deve ter no máximo 5 MB.");
    }

    const user = getCurrentUser();
    if (!user) throw new Error("Sua sessão do Firebase expirou. Entre novamente.");
    await user.getIdToken();

    const filename = sanitizeFilename(file.name);
    const path =
      `usuarios/${user.uid}/comentarios-devolutiva/${assessmentId}/${question.id}/` +
      `${crypto.randomUUID()}-${filename}`;
    const storageReference = ref(getFirebaseStorage(), path);

    await uploadBytes(storageReference, file, {
      contentType: file.type,
      cacheControl: "private,max-age=3600",
      customMetadata: {
        avaliacaoId: assessmentId,
        questaoId: question.id,
      },
    });

    return getDownloadURL(storageReference);
  }

  async function save(returnToList = false) {
    const changedQuestions = questions.filter(
      (question) => normalize(drafts[question.id]) !== normalize(originals[question.id]),
    );
    if (changedQuestions.length === 0) return;

    setSaving(true);
    try {
      await Promise.all(
        changedQuestions.map((question) =>
          updateQuestao(question, {
            orientacao_correcao: normalize(drafts[question.id]) || null,
          }),
        ),
      );

      const saved = Object.fromEntries(
        questions.map((question) => [question.id, normalize(drafts[question.id])]),
      );
      setDrafts(saved);
      setOriginals(saved);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["firebase-questoes", assessmentId] }),
        queryClient.invalidateQueries({
          queryKey: ["firebase-feedback-questions", assessmentId],
        }),
      ]);
      toast.success("Folha de devolução configurada e salva.");
      if (returnToList) onBack();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  }

  if (questionsQuery.isPending) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando questões…
      </div>
    );
  }

  if (questionsQuery.isError) {
    return (
      <p className="rounded-lg border border-destructive/30 bg-card p-6 text-sm text-destructive">
        {questionsQuery.error instanceof Error
          ? questionsQuery.error.message
          : String(questionsQuery.error)}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <Button type="button" variant="ghost" size="sm" className="-ml-3 mb-2" onClick={goBack}>
            <ArrowLeft /> Voltar aos alunos
          </Button>
          <h2 className="text-xl font-semibold">Configurar folha de devolução</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Escreva uma resposta comentada para cada questão. O conteúdo é comum aos{" "}
            {selectedStudentCount} aluno{selectedStudentCount === 1 ? "" : "s"} selecionado
            {selectedStudentCount === 1 ? "" : "s"} e será incluído no PDF. Questões em branco
            serão omitidas.
          </p>
        </div>
        <Button type="button" disabled={!dirty || saving} onClick={() => void save()}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Salvar configuração
        </Button>
      </div>

      {questions.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Cadastre as questões antes de configurar a folha de devolução.
        </p>
      ) : (
        <div className="space-y-3">
          {questions.map((question, index) => {
            const value = drafts[question.id] ?? "";
            return (
              <details
                key={question.id}
                open={index === 0}
                className="group overflow-hidden rounded-lg border border-border bg-card"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 hover:bg-muted/40">
                  <div>
                    <span className="font-semibold">Questão {question.numero}</span>
                    <span className="ml-2 text-sm text-muted-foreground">
                      {questionTypeLabel(question.tipo)}
                    </span>
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                    {value.trim() ? "Comentário configurado" : "Sem comentário"}
                  </span>
                </summary>
                <div className="border-t border-border p-4">
                  <RichCommentEditor
                    value={value}
                    disabled={saving}
                    onChange={(next) =>
                      setDrafts((current) => ({ ...current, [question.id]: next }))
                    }
                    onUploadImage={(file) => uploadCommentImage(question, file)}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Use <code>$x^2$</code> para uma equação no texto ou{" "}
                    <code>$$\\frac{"{a}"}{"{b}"}$$</code> para uma equação destacada.
                  </p>
                </div>
              </details>
            );
          })}
        </div>
      )}

      <div className="flex flex-wrap justify-between gap-2 rounded-lg border border-border bg-card p-4">
        <Button type="button" variant="outline" onClick={goBack}>
          <ArrowLeft /> Voltar sem avançar
        </Button>
        <Button type="button" disabled={!dirty || saving} onClick={() => void save(true)}>
          {saving ? <Loader2 className="animate-spin" /> : <Save />}
          Salvar e voltar aos alunos
        </Button>
      </div>
    </div>
  );
}

function normalize(value: string | undefined): string {
  return value?.trim() ?? "";
}

function questionTypeLabel(type: Questao["tipo"]): string {
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
  return normalized || "comentario.jpg";
}
