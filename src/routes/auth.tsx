import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { clearGmailSetupAfterGoogleLogin, markGmailSetupAfterGoogleLogin } from "@/lib/gmail-sender";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/painel" });
    });
  }, [navigate]);

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/painel" });
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { nome },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Você já pode entrar.");
    navigate({ to: "/painel" });
  }

  async function handleGoogle() {
    markGmailSetupAfterGoogleLogin();
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/painel`,
    });
    if (result.error) {
      clearGmailSetupAfterGoogleLogin();
      return toast.error(result.error.message ?? "Falha no login");
    }
    if (result.redirected) return;
    navigate({ to: "/painel" });
  }

  return (
    <div className="min-h-screen bg-background grid place-items-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center gap-2">
          <div className="h-8 w-8 rounded-md bg-primary text-primary-foreground grid place-items-center font-bold">F</div>
          <span className="font-semibold tracking-tight">Folha</span>
        </Link>
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <Button type="button" variant="outline" className="w-full" onClick={handleGoogle}>
            Continuar com Google
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            No primeiro acesso, o Google solicitará uma única autorização para enviar devolutivas pelo Gmail do professor.
          </p>

          <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> acesso alternativo <div className="h-px flex-1 bg-border" />
          </div>

          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Criar conta</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-4">
              <form onSubmit={handleSignIn} className="space-y-3">
                <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                <Button className="w-full" disabled={loading}>Entrar</Button>
              </form>
            </TabsContent>
            <TabsContent value="signup" className="mt-4">
              <form onSubmit={handleSignUp} className="space-y-3">
                <div className="space-y-1.5"><Label>Seu nome</Label><Input value={nome} onChange={(e) => setNome(e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>E-mail</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div className="space-y-1.5"><Label>Senha</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} /></div>
                <Button className="w-full" disabled={loading}>Criar conta</Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
