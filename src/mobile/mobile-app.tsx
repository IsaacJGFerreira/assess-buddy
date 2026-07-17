import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleAlert,
  Cloud,
  CloudOff,
  Database,
  Loader2,
  LogOut,
  Plus,
  RefreshCw,
  Server,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  criarTurmaFirebase,
  listarTurmasFirebase,
  type CriarTurmaInput,
  type FirebaseTurma,
} from "@/integrations/firebase/academic-data";
import {
  authErrorMessage,
  observeAuthState,
  signInWithEmail,
  signOut,
  signUpWithEmail,
  type User,
} from "@/integrations/firebase/auth";
import { getFirebaseServiceIdentity } from "@/integrations/firebase/client";
import { createAndVerifyServerRecord } from "@/lib/sync-verification";

import { useConnectionStatus } from "./use-connection-status";

type SessionState =
  { status: "loading" } | { status: "anonymous" } | { status: "authenticated"; user: User };

export function MobileApp() {
  const queryClient = useQueryClient();
  const connection = useConnectionStatus();
  const [session, setSession] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    return observeAuthState((user) => {
      if (user) {
        setSession({ status: "authenticated", user });
      } else {
        queryClient.clear();
        setSession({ status: "anonymous" });
      }
    });
  }, [queryClient]);

  if (session.status === "loading") {
    return <CenteredLoading message="Restaurando sua sessão…" />;
  }

  if (session.status === "anonymous") {
    return <AuthenticationScreen connected={connection.connected} />;
  }

  return (
    <AuthenticatedApp
      user={session.user}
      connected={connection.connected}
      connectionKind={connection.kind}
    />
  );
}

function AuthenticationScreen({ connected }: { connected: boolean }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connected) {
      setError("Conecte-se à internet para entrar ou criar uma conta.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      if (mode === "signup") {
        await signUpWithEmail(email, password, name);
        toast.success("Conta criada e conectada ao Firebase.");
      } else {
        await signInWithEmail(email, password);
      }
    } catch (nextError) {
      setError(authErrorMessage(nextError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mobile-safe-area min-h-dvh bg-background">
      {!connected && <OfflineBanner />}
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="mb-6 flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-lg font-bold text-primary-foreground shadow-sm">
            F
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Folha</h1>
            <p className="text-sm text-muted-foreground">Aplicativo Android</p>
          </div>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signin"}
              className={`h-9 rounded-md text-sm font-medium transition-colors ${
                mode === "signin"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
            >
              Entrar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === "signup"}
              className={`h-9 rounded-md text-sm font-medium transition-colors ${
                mode === "signup"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
            >
              Criar conta
            </button>
          </div>

          <form className="mt-5 space-y-4" onSubmit={submit}>
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="mobile-name">Seu nome</Label>
                <Input
                  id="mobile-name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  enterKeyHint="next"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="mobile-email">E-mail</Label>
              <Input
                id="mobile-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                inputMode="email"
                enterKeyHint="next"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mobile-password">Senha</Label>
              <Input
                id="mobile-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={mode === "signup" ? 8 : undefined}
                enterKeyHint="done"
                required
              />
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground">Use pelo menos 8 caracteres.</p>
              )}
            </div>

            {error && <InlineError message={error} />}

            <Button className="h-11 w-full" disabled={submitting || !connected}>
              {submitting && <Loader2 className="animate-spin" />}
              {submitting
                ? mode === "signup"
                  ? "Criando conta…"
                  : "Entrando…"
                : mode === "signup"
                  ? "Criar conta"
                  : "Entrar"}
            </Button>
          </form>

          <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              O login usa o mesmo Firebase Authentication da versão web. A sessão fica salva neste
              aparelho até você sair.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function AuthenticatedApp({
  user,
  connected,
  connectionKind,
}: {
  user: User;
  connected: boolean;
  connectionKind: string;
}) {
  const queryClient = useQueryClient();
  const [signingOut, setSigningOut] = useState(false);

  async function leave() {
    setSigningOut(true);
    try {
      await signOut();
      queryClient.clear();
    } catch (error) {
      toast.error(errorMessage(error));
      setSigningOut(false);
    }
  }

  return (
    <main className="mobile-safe-area min-h-dvh bg-background">
      {!connected && <OfflineBanner />}

      <header className="mobile-sticky-header sticky z-10 border-b border-border/80 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">
              F
            </div>
            <div className="min-w-0">
              <p className="font-semibold leading-tight">Folha</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Sair da conta"
            disabled={signingOut}
            onClick={() => void leave()}
          >
            {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-5">
        <ConnectionCard connected={connected} connectionKind={connectionKind} />
        <ClassSynchronization userId={user.uid} connected={connected} />
      </div>
    </main>
  );
}

function ConnectionCard({
  connected,
  connectionKind,
}: {
  connected: boolean;
  connectionKind: string;
}) {
  const firebase = getFirebaseServiceIdentity();

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">Base Android conectada</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Bundle local do aplicativo, sem carregar uma página web remota.
          </p>
        </div>
        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
            connected ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
          }`}
        >
          {connected ? <Cloud className="h-3.5 w-3.5" /> : <CloudOff className="h-3.5 w-3.5" />}
          {connected ? connectionLabel(connectionKind) : "Offline"}
        </span>
      </div>

      <div className="grid gap-px border-t border-border bg-border sm:grid-cols-2">
        <ServiceIdentity
          icon={<Database className="h-4 w-4" />}
          label="Firebase / Data Connect"
          value={firebase.projectId}
        />
        <ServiceIdentity
          icon={<Server className="h-4 w-4" />}
          label="Firebase Storage"
          value={firebase.storageBucket}
        />
      </div>
    </section>
  );
}

function ServiceIdentity({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 bg-card p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-1 truncate text-xs text-foreground" title={value}>
        {value}
      </p>
    </div>
  );
}

function ClassSynchronization({ userId, connected }: { userId: string; connected: boolean }) {
  const queryClient = useQueryClient();
  const queryKey = ["mobile", "turmas", userId] as const;
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [verified, setVerified] = useState<{
    turma: FirebaseTurma;
    verifiedAt: Date;
  } | null>(null);

  const classesQuery = useQuery({
    queryKey,
    queryFn: listarTurmasFirebase,
    enabled: connected,
  });

  const createClass = useMutation({
    mutationFn: async (input: CriarTurmaInput) =>
      createAndVerifyServerRecord(input, {
        create: criarTurmaFirebase,
        listFromServer: listarTurmasFirebase,
      }),
    onSuccess: ({ created, serverRecords }) => {
      queryClient.setQueryData(queryKey, serverRecords);
      setVerified({ turma: created, verifiedAt: new Date() });
      setName("");
      setGrade("");
      toast.success("Turma criada e relida do mesmo Data Connect.");
    },
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!connected) return;

    const numericYear = year.trim() ? Number(year) : null;
    if (numericYear !== null && (!Number.isInteger(numericYear) || numericYear < 2000)) {
      toast.error("Informe um ano válido.");
      return;
    }

    createClass.mutate({
      nome: name,
      serie: grade || null,
      ano: numericYear,
    });
  }

  const classes = classesQuery.data ?? [];

  return (
    <>
      <section className="rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
            <Plus className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold">Prova real de sincronização</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crie uma turma aqui. O aplicativo grava e relê o registro do servidor antes de
              confirmar; a versão web mostrará a mesma turma para esta conta.
            </p>
          </div>
        </div>

        <form className="mt-4 space-y-3" onSubmit={submit}>
          <div className="space-y-1.5">
            <Label htmlFor="class-name">Nome da turma</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ex.: 2ª série A"
              enterKeyHint="next"
              required
            />
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="class-grade">Série</Label>
              <Input
                id="class-grade"
                value={grade}
                onChange={(event) => setGrade(event.target.value)}
                placeholder="Ensino Médio"
                enterKeyHint="next"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="class-year">Ano</Label>
              <Input
                id="class-year"
                type="number"
                value={year}
                onChange={(event) => setYear(event.target.value)}
                min="2000"
                max="2100"
                inputMode="numeric"
                enterKeyHint="done"
              />
            </div>
          </div>

          {createClass.error && <InlineError message={errorMessage(createClass.error)} />}

          <Button className="h-11 w-full" disabled={!connected || createClass.isPending}>
            {createClass.isPending ? <Loader2 className="animate-spin" /> : <Cloud />}
            {createClass.isPending ? "Gravando e conferindo…" : "Criar no mesmo Firebase"}
          </Button>
        </form>
      </section>

      {verified && (
        <section
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-950"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div className="min-w-0">
              <h2 className="font-semibold">Sincronização confirmada</h2>
              <p className="mt-1 text-sm">
                “{verified.turma.nome}” foi relida do Data Connect às{" "}
                {formatTime(verified.verifiedAt)}. Abra a página Turmas na web usando esta mesma
                conta. O ID abaixo fica como referência técnica da verificação.
              </p>
              <p className="mt-2 break-all rounded-md bg-white/70 px-2 py-1 font-mono text-xs">
                ID: {verified.turma.id}
              </p>
            </div>
          </div>
        </section>
      )}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-semibold">Turmas deste usuário</h2>
            <p className="text-xs text-muted-foreground">Fonte: Firebase Data Connect</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Atualizar turmas"
            disabled={!connected || classesQuery.isFetching}
            onClick={() => void classesQuery.refetch()}
          >
            <RefreshCw className={classesQuery.isFetching ? "animate-spin" : ""} />
          </Button>
        </div>

        {classesQuery.isPending && connected ? (
          <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando do servidor…
          </div>
        ) : classesQuery.error ? (
          <div className="p-4">
            <InlineError message={errorMessage(classesQuery.error)} />
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              disabled={!connected}
              onClick={() => void classesQuery.refetch()}
            >
              Tentar novamente
            </Button>
          </div>
        ) : classes.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {connected
              ? "Nenhuma turma cadastrada. Crie a primeira acima."
              : "Sem conexão para carregar as turmas."}
          </p>
        ) : (
          <div className="divide-y divide-border">
            {classes.map((turma) => (
              <article key={turma.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-medium">{turma.nome}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {[turma.serie, turma.ano].filter(Boolean).join(" · ") || "Sem série e ano"}
                    </p>
                  </div>
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                </div>
                <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
                  {turma.id}
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function OfflineBanner() {
  return (
    <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-950">
      <CloudOff className="mr-1 inline h-3.5 w-3.5" /> Sem conexão. Nenhuma alteração será enviada.
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div
      className="flex items-start gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive"
      role="alert"
    >
      <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <p>{message}</p>
    </div>
  );
}

function CenteredLoading({ message }: { message: string }) {
  return (
    <div className="mobile-safe-area grid place-items-center bg-background px-6">
      <div className="text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-primary" />
        {message}
      </div>
    </div>
  );
}

function connectionLabel(kind: string): string {
  if (kind === "wifi") return "Wi-Fi";
  if (kind === "cellular") return "Dados móveis";
  if (kind === "ethernet") return "Ethernet";
  return "Online";
}

function formatTime(value: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
