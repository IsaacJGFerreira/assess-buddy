import { useQueryClient } from "@tanstack/react-query";
import { CircleAlert, CloudOff, Loader2, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  authErrorMessage,
  observeAuthState,
  signInWithEmail,
  signInWithGoogle,
  signOut,
  signUpWithEmail,
  type User,
} from "@/integrations/firebase/auth";

import { MobileAssessmentDetail } from "./mobile-assessment-detail";
import { MobileAssessmentsScreen, MobileNewAssessmentScreen } from "./mobile-assessments";
import { MobileClassesScreen } from "./mobile-classes";
import { MobileDashboard } from "./mobile-dashboard";
import { useMobileNavigation } from "./mobile-navigation";
import { useMobileLayoutProfile } from "./mobile-responsive";
import { MobileShell } from "./mobile-shell";
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

  async function enterWithGoogle() {
    if (!connected) {
      setError("Conecte-se à internet para entrar com Google.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await signInWithGoogle();
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

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            className="h-11 w-full"
            variant="outline"
            disabled={submitting || !connected}
            onClick={() => void enterWithGoogle()}
          >
            {submitting ? <Loader2 className="animate-spin" /> : <GoogleMark />}
            Entrar com Google
          </Button>

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

function GoogleMark() {
  return (
    <span
      aria-hidden="true"
      className="grid h-5 w-5 place-items-center rounded-full border border-border bg-background text-xs font-bold text-foreground"
    >
      G
    </span>
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
  const { route, navigate } = useMobileNavigation();
  const layout = useMobileLayoutProfile();
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

  const content = (() => {
    if (route.kind === "dashboard") {
      return <MobileDashboard connected={connected} onNavigate={navigate} />;
    }
    if (route.kind === "classes") {
      return <MobileClassesScreen connected={connected} />;
    }
    if (route.kind === "assessments") {
      return <MobileAssessmentsScreen connected={connected} onNavigate={navigate} />;
    }
    if (route.kind === "new-assessment") {
      return <MobileNewAssessmentScreen connected={connected} onNavigate={navigate} />;
    }
    return (
      <MobileAssessmentDetail
        assessmentId={route.assessmentId}
        section={route.section}
        connected={connected}
        onNavigate={navigate}
      />
    );
  })();

  return (
    <MobileShell
      user={user}
      route={route}
      connected={connected}
      connectionKind={connectionKind}
      signingOut={signingOut}
      layout={layout}
      onNavigate={navigate}
      onBack={() => navigate({ kind: "assessments" })}
      onSignOut={() => void leave()}
    >
      {content}
    </MobileShell>
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

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
