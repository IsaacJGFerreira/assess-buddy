import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Download, Link2, Loader2, Mail, Save, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  calculateFeedbackScore,
  generateFeedbackPdf,
  type FeedbackAssessment,
  type FeedbackQuestion,
  type FeedbackResponse,
  type FeedbackStudent,
} from "@/lib/devolutiva-pdf";
import {
  connectGmail,
  disconnectGmail,
  isGmailConnectionValid,
  sendPdfWithGmail,
  type GmailConnection,
} from "@/lib/gmail-sender";

type DiscursiveDraft = { score: string; feedback: string };
type SendState = "sending" | "sent" | "missing" | "error";
type SendStatus = { state: SendState; message?: string };

export function ClassFeedbackPanel({ turmaId }: { turmaId: string }) {
  const qc = useQueryClient();
  const [assessmentId, setAssessmentId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [generalComment, setGeneralComment] = useState("");
  const [orientations, setOrientations] = useState<Record<string, string>>({});
  const [discursive, setDiscursive] = useState<Record<string, DiscursiveDraft>>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [gmail, setGmail] = useState<GmailConnection | null>(null);
  const [statuses, setStatuses] = useState<Record<string, SendStatus>>({});

  const userQuery = useQuery({
    queryKey: ["feedback-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      if (!data.user) throw new Error("Sua sessão expirou. Entre novamente.");
      return data.user;
    },
  });

  const assessmentsQuery = useQuery({
    queryKey: ["feedback-assessments", turmaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("avaliacoes")
        .select("*")
        .eq("turma_id", turmaId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackAssessment[];
    },
  });

  const studentsQuery = useQuery({
    queryKey: ["feedback-students", turmaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("alunos").select("*").eq("turma_id", turmaId).order("nome");
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackStudent[];
    },
  });

  const questionsQuery = useQuery({
    queryKey: ["feedback-questions", assessmentId],
    enabled: Boolean(assessmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questoes")
        .select("*")
        .eq("avaliacao_id", assessmentId)
        .order("numero");
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackQuestion[];
    },
  });

  const responsesQuery = useQuery({
    queryKey: ["feedback-responses", assessmentId],
    enabled: Boolean(assessmentId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("respostas_alunos")
        .select("*")
        .eq("avaliacao_id", assessmentId);
      if (error) throw error;
      return (data ?? []) as unknown as FeedbackResponse[];
    },
  });

  const assessment = assessmentsQuery.data?.find((item) => item.id === assessmentId) ?? null;
  const student = studentsQuery.data?.find((item) => item.id === studentId) ?? null;
  const questions = useMemo(() => questionsQuery.data ?? [], [questionsQuery.data]);
  const responses = useMemo(() => responsesQuery.data ?? [], [responsesQuery.data]);
  const discursiveQuestions = useMemo(() => questions.filter((question) => question.tipo === "disc"), [questions]);
  const studentResponses = useMemo(
    () => responses.filter((response) => response.aluno_id === studentId),
    [responses, studentId],
  );
  const score = useMemo(
    () => calculateFeedbackScore(questions, mergeDrafts(studentResponses, studentId, discursive)),
    [questions, studentResponses, studentId, discursive],
  );

  useEffect(() => {
    const first = assessmentsQuery.data?.[0]?.id ?? "";
    if (!assessmentId || !assessmentsQuery.data?.some((item) => item.id === assessmentId)) setAssessmentId(first);
  }, [assessmentId, assessmentsQuery.data]);

  useEffect(() => {
    const first = studentsQuery.data?.[0]?.id ?? "";
    if (!studentId || !studentsQuery.data?.some((item) => item.id === studentId)) setStudentId(first);
  }, [studentId, studentsQuery.data]);

  useEffect(() => {
    setGeneralComment(assessment?.comentario_devolutiva ?? "");
    setOrientations(Object.fromEntries(questions.map((question) => [question.id, question.orientacao_correcao ?? ""])));
    setDirty(false);
  }, [assessment?.id, assessment?.comentario_devolutiva, questions]);

  useEffect(() => {
    const byQuestion = new Map(studentResponses.map((response) => [response.questao_id, response]));
    setDiscursive(
      Object.fromEntries(
        discursiveQuestions.map((question) => {
          const response = byQuestion.get(question.id);
          return [
            question.id,
            {
              score: response?.nota_manual == null ? "" : String(response.nota_manual),
              feedback: response?.feedback ?? "",
            },
          ];
        }),
      ),
    );
    setDirty(false);
  }, [studentId, studentResponses, discursiveQuestions]);

  async function save(showToast = true) {
    if (!assessment || !userQuery.data) return;
    setSaving(true);
    try {
      const { error: assessmentError } = await supabase
        .from("avaliacoes")
        .update({ comentario_devolutiva: generalComment.trim() || null } as never)
        .eq("id", assessment.id);
      if (assessmentError) throw assessmentError;

      for (const question of questions) {
        const { error } = await supabase
          .from("questoes")
          .update({ orientacao_correcao: orientations[question.id]?.trim() || null } as never)
          .eq("id", question.id);
        if (error) throw error;
      }

      if (student && discursiveQuestions.length) {
        const existing = new Map(studentResponses.map((response) => [response.questao_id, response]));
        const rows = discursiveQuestions.map((question) => {
          const draft = discursive[question.id] ?? { score: "", feedback: "" };
          const value = draft.score.trim() === "" ? null : Number(draft.score.replace(",", "."));
          if (value != null && (!Number.isFinite(value) || value < 0 || value > Number(question.valor))) {
            throw new Error(`A nota da questão ${question.numero} deve ficar entre 0 e ${formatNumber(question.valor)}.`);
          }
          return {
            avaliacao_id: assessment.id,
            aluno_id: student.id,
            questao_id: question.id,
            resposta: existing.get(question.id)?.resposta ?? null,
            nota_manual: value,
            feedback: draft.feedback.trim() || null,
            owner_id: userQuery.data.id,
          };
        });
        const { error } = await supabase
          .from("respostas_alunos")
          .upsert(rows as never, { onConflict: "aluno_id,questao_id" });
        if (error) throw error;
      }

      await Promise.all([
        qc.invalidateQueries({ queryKey: ["feedback-assessments", turmaId] }),
        qc.invalidateQueries({ queryKey: ["feedback-questions", assessment.id] }),
        qc.invalidateQueries({ queryKey: ["feedback-responses", assessment.id] }),
        qc.invalidateQueries({ queryKey: ["respostas", assessment.id] }),
      ]);
      setDirty(false);
      if (showToast) toast.success("Comentários e correções salvos.");
    } finally {
      setSaving(false);
    }
  }

  async function connect() {
    const expectedEmail = userQuery.data?.email;
    if (!expectedEmail) return toast.error("A conta do sistema não possui um e-mail válido.");
    try {
      const clientId = (import.meta.env as { VITE_GOOGLE_GMAIL_CLIENT_ID?: string }).VITE_GOOGLE_GMAIL_CLIENT_ID ?? "";
      const connection = await connectGmail({ clientId, expectedEmail });
      setGmail(connection);
      toast.success(`Gmail conectado: ${connection.email}`);
    } catch (error) {
      toast.error(message(error));
    }
  }

  function disconnect() {
    disconnectGmail(gmail);
    setGmail(null);
  }

  async function download() {
    if (!assessment || !student || !userQuery.data?.email) return;
    try {
      if (dirty) await save(false);
      const fresh = await responsesQuery.refetch();
      const pdf = generateFeedbackPdf({
        assessment: { ...assessment, comentario_devolutiva: generalComment.trim() || null },
        student,
        questions: applyOrientations(questions, orientations),
        responses: fresh.data ?? responses,
        teacherEmail: userQuery.data.email,
      });
      downloadBlob(pdf, `devolutiva-${student.nome}.pdf`);
    } catch (error) {
      toast.error(message(error));
    }
  }

  async function send(targets: FeedbackStudent[]) {
    if (!assessment || !userQuery.data?.email) return;
    if (!isGmailConnectionValid(gmail)) {
      setGmail(null);
      return toast.error("Conecte o Gmail do mesmo e-mail usado no sistema.");
    }

    setSending(true);
    try {
      if (dirty) await save(false);
      const fresh = await responsesQuery.refetch();
      const allResponses = fresh.data ?? responses;
      const finalAssessment = { ...assessment, comentario_devolutiva: generalComment.trim() || null };
      const finalQuestions = applyOrientations(questions, orientations);
      let sent = 0;
      let failed = 0;
      let missing = 0;

      for (const target of targets) {
        if (!target.email?.trim()) {
          missing += 1;
          setStatuses((current) => ({ ...current, [target.id]: { state: "missing" } }));
          continue;
        }
        setStatuses((current) => ({ ...current, [target.id]: { state: "sending" } }));
        try {
          const pdf = generateFeedbackPdf({
            assessment: finalAssessment,
            student: target,
            questions: finalQuestions,
            responses: allResponses.filter((response) => response.aluno_id === target.id),
            teacherEmail: userQuery.data.email,
          });
          await sendPdfWithGmail(gmail, {
            to: target.email,
            subject: `Devolutiva — ${assessment.titulo}`,
            text: emailText(target.nome, assessment.titulo, userQuery.data.email),
            pdf,
            filename: `devolutiva-${target.nome}.pdf`,
          });
          sent += 1;
          setStatuses((current) => ({ ...current, [target.id]: { state: "sent" } }));
        } catch (error) {
          failed += 1;
          setStatuses((current) => ({ ...current, [target.id]: { state: "error", message: message(error) } }));
        }
      }

      if (sent) toast.success(`${sent} devolutiva${sent === 1 ? " enviada" : "s enviadas"}.`);
      if (missing) toast.warning(`${missing} aluno${missing === 1 ? " está" : "s estão"} sem e-mail.`);
      if (failed) toast.error(`${failed} envio${failed === 1 ? " falhou" : "s falharam"}.`);
    } catch (error) {
      toast.error(message(error));
    } finally {
      setSending(false);
    }
  }

  if (assessmentsQuery.isLoading || studentsQuery.isLoading) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">Carregando devolutivas…</div>;
  }

  if (!assessmentsQuery.data?.length) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center">
        <Mail className="mx-auto h-8 w-8 text-muted-foreground" />
        <h2 className="mt-3 font-semibold">Devolutivas por e-mail</h2>
        <p className="mt-1 text-sm text-muted-foreground">Crie uma avaliação vinculada a esta turma para enviar os PDFs.</p>
      </div>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-card">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <h2 className="flex items-center gap-2 font-semibold"><Mail className="h-5 w-5 text-primary" />Devolutivas por e-mail</h2>
          <p className="mt-1 text-sm text-muted-foreground">O Gmail conectado deve ser o mesmo e-mail da conta usada no sistema.</p>
        </div>
        {isGmailConnectionValid(gmail) ? (
          <div className="flex gap-2">
            <span className="inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <CheckCircle2 className="mr-2 h-4 w-4" />{gmail.email}
            </span>
            <Button type="button" variant="outline" onClick={disconnect}>Desconectar</Button>
          </div>
        ) : (
          <Button type="button" variant="outline" onClick={() => void connect()}>
            <Link2 className="mr-2 h-4 w-4" />Conectar Gmail
          </Button>
        )}
      </header>

      <div className="space-y-6 p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Avaliação">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)}>
              {assessmentsQuery.data.map((item) => <option key={item.id} value={item.id}>{item.titulo}</option>)}
            </select>
          </Field>
          <Field label="Aluno em edição">
            <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={studentId} onChange={(event) => setStudentId(event.target.value)}>
              {(studentsQuery.data ?? []).map((item) => <option key={item.id} value={item.id}>{item.nome}{item.email ? ` · ${item.email}` : " · sem e-mail"}</option>)}
            </select>
          </Field>
        </div>

        {!studentsQuery.data?.length ? (
          <p className="rounded-md border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Cadastre alunos e seus e-mails antes de enviar.</p>
        ) : (
          <>
            <Field label="Comentário geral da avaliação">
              <textarea rows={4} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={generalComment} onChange={(event) => { setGeneralComment(event.target.value); setDirty(true); }} placeholder="Pontos positivos, conteúdos a revisar e próximos passos." />
            </Field>

            <div className="space-y-2">
              <div><h3 className="font-medium">Orientação de correção por questão</h3><p className="text-xs text-muted-foreground">Nas discursivas, descreva o raciocínio esperado.</p></div>
              <div className="divide-y divide-border rounded-md border border-border">
                {questions.map((question) => (
                  <div key={question.id} className="grid gap-2 p-3 md:grid-cols-[120px_1fr]">
                    <div className="text-sm"><strong>Questão {question.numero}</strong><div className="text-xs text-muted-foreground">{question.tipo === "disc" ? "Discursiva" : question.conteudo || "Objetiva"}</div></div>
                    <textarea rows={2} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={orientations[question.id] ?? ""} onChange={(event) => { setOrientations((current) => ({ ...current, [question.id]: event.target.value })); setDirty(true); }} placeholder={question.tipo === "disc" ? "Conceitos, etapas e justificativas esperados." : "Conteúdo que deve ser revisado."} />
                  </div>
                ))}
              </div>
            </div>

            {student && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div><h3 className="font-medium">Correção individual de {student.nome}</h3><p className="text-xs text-muted-foreground">Nota atual: {formatNumber(score)} de {formatNumber(Number(assessment?.valor_total ?? 0))}</p></div>
                  {!student.email && <span className="inline-flex items-center text-xs text-amber-700"><AlertCircle className="mr-1 h-4 w-4" />Cadastre o e-mail acima.</span>}
                </div>
                {discursiveQuestions.length ? discursiveQuestions.map((question) => {
                  const draft = discursive[question.id] ?? { score: "", feedback: "" };
                  return (
                    <div key={question.id} className="rounded-md border border-border p-3">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <strong>Questão {question.numero}</strong>
                        <div className="flex items-center gap-2 text-sm"><Label htmlFor={`score-${question.id}`}>Nota</Label><Input id={`score-${question.id}`} className="w-24" inputMode="decimal" value={draft.score} onChange={(event) => { setDiscursive((current) => ({ ...current, [question.id]: { ...draft, score: event.target.value } })); setDirty(true); }} /><span className="text-muted-foreground">/ {formatNumber(question.valor)}</span></div>
                      </div>
                      <Label htmlFor={`feedback-${question.id}`}>Comentário para este aluno</Label>
                      <textarea id={`feedback-${question.id}`} rows={3} className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={draft.feedback} onChange={(event) => { setDiscursive((current) => ({ ...current, [question.id]: { ...draft, feedback: event.target.value } })); setDirty(true); }} placeholder="O que foi bem desenvolvido e o que precisa ser corrigido." />
                    </div>
                  );
                }) : <p className="rounded-md bg-muted/40 p-3 text-sm text-muted-foreground">A avaliação não possui questões discursivas.</p>}
              </div>
            )}

            <div className="flex flex-wrap justify-between gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={!student || saving || sending} onClick={() => void download()}><Download className="mr-2 h-4 w-4" />Baixar PDF</Button>
                <Button type="button" variant="outline" disabled={!dirty || saving || sending} onClick={() => void save().catch((error) => toast.error(message(error)))}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={!student || sending || !isGmailConnectionValid(gmail)} onClick={() => student && void send([student])}><Send className="mr-2 h-4 w-4" />Enviar ao aluno</Button>
                <Button type="button" disabled={sending || !isGmailConnectionValid(gmail)} onClick={() => void send(studentsQuery.data ?? [])}>{sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}Enviar para a turma</Button>
              </div>
            </div>

            {Object.keys(statuses).length > 0 && (
              <div className="divide-y divide-border rounded-md border border-border">
                {(studentsQuery.data ?? []).filter((item) => statuses[item.id]).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div><strong>{item.nome}</strong><div className="text-xs text-muted-foreground">{item.email || "Sem e-mail"}</div></div>
                    <Status status={statuses[item.id]} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function Status({ status }: { status: SendStatus }) {
  if (status.state === "sending") return <span className="inline-flex items-center text-xs text-muted-foreground"><Loader2 className="mr-1 h-4 w-4 animate-spin" />Enviando</span>;
  if (status.state === "sent") return <span className="inline-flex items-center text-xs text-emerald-700"><CheckCircle2 className="mr-1 h-4 w-4" />Enviado</span>;
  if (status.state === "missing") return <span className="inline-flex items-center text-xs text-amber-700"><AlertCircle className="mr-1 h-4 w-4" />Sem e-mail</span>;
  return <span className="inline-flex max-w-xs items-center text-right text-xs text-red-700" title={status.message}><AlertCircle className="mr-1 h-4 w-4 shrink-0" />{status.message || "Erro"}</span>;
}

function mergeDrafts(responses: FeedbackResponse[], studentId: string, drafts: Record<string, DiscursiveDraft>): FeedbackResponse[] {
  const byQuestion = new Map(responses.map((response) => [response.questao_id, response]));
  for (const [questionId, draft] of Object.entries(drafts)) {
    const existing = byQuestion.get(questionId);
    byQuestion.set(questionId, {
      aluno_id: studentId,
      questao_id: questionId,
      resposta: existing?.resposta ?? null,
      nota_manual: draft.score.trim() === "" ? null : Number(draft.score.replace(",", ".")),
      feedback: draft.feedback || null,
    });
  }
  return [...byQuestion.values()];
}

function applyOrientations(questions: FeedbackQuestion[], values: Record<string, string>): FeedbackQuestion[] {
  return questions.map((question) => ({ ...question, orientacao_correcao: values[question.id]?.trim() || null }));
}

function emailText(studentName: string, assessmentTitle: string, teacherEmail: string): string {
  return `Olá, ${studentName}.\n\nSegue em anexo a devolutiva da avaliação “${assessmentTitle}”. No PDF estão sua nota, os comentários do professor e as orientações de correção.\n\nAtenciosamente,\n${teacherEmail}`;
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

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
