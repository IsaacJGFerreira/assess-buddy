import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  authErrorMessage,
  signInWithEmail,
  signUpWithEmail,
  waitForCompatibleAuth,
} from "@/integrations/firebase/auth";
import { lovable } from "@/integrations/lovable";
import {
  clearGmailSetupAfterGoogleLogin,
  markGmailSetupAfterGoogleLogin,
} from "@/lib/gmail-sender";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void waitForCompatibleAuth()
      .then((user) => {
        if (!cancelled && user) {
          navigate({ to: "/painel", replace: true });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      await signInWithEmail(email, password);
      navigate({ to: "/painel", replace: true });
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    try {
      await signUpWithEmail(email, password, nome);
      toast.success("Conta criada com Firebase.");
      navigate({ to: "/painel", replace: true });
    } catch (error) {
      toast.error(authErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    markGmailSetupAfterGoogleLogin();

    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/painel`,
      });

      if (result.error) {
        throw result.error;
      }

      if (result.redirected) {
        return;
      }

      const user = await waitForCompatibleAuth();

      if (!user) {
        throw new Error("O Google autorizou o acesso, mas a sessão não pôde ser carregada.");
      }

      navigate({ to: "/painel", replace: true });
    } catch (error) {
      clearGmailSetupAfterGoogleLogin();
      toast.error(authErrorMessage(error));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">
            F
          </div>
          <span className="font-semibold tracking-tight">Folha</span>
        </Link>

        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={() => void handleGoogle()}
          >
            {loading ? "Conectando…" : "Continuar com Google"}
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Durante a migração, o Google usa a autorização segura do Lovable e sincroniza a conta com o Firebase quando o token estiver disponível.
          </p>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> acesso alternativo
            <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button className="w-full" disabled={loading}>
                  {loading ? "Entrando…" : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1.5">
                  <Label>Seu nome</Label>
                  <Input
                    value={nome}
                    onChange={(event) => setNome(event.target.value)}
                    required
                    autoComplete="name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Senha</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <Button className="w-full" disabled={loading}>
                  {loading ? "Criando…" : "Criar conta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
