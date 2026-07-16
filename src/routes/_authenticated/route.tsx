import { createFileRoute, Outlet, redirect, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { signOut as firebaseSignOut, waitForAuthReady } from "@/integrations/firebase/auth";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Users, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  clearGmailSetupAfterGoogleLogin,
  connectGmail,
  shouldSetupGmailAfterGoogleLogin,
} from "@/lib/gmail-sender";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await waitForAuthReady();
    if (!user) throw redirect({ to: "/auth" });
    return { user };
  },
  component: AuthedShell,
});

const NAV = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/turmas", label: "Turmas e alunos", icon: Users },
  { to: "/avaliacoes/nova", label: "Nova avaliação", icon: FileText },
] as const;

function AuthedShell() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = Route.useRouteContext();
  const gmailSetupStarted = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const gmailResult = params.get("gmail");
    if (gmailResult === "connected") {
      clearGmailSetupAfterGoogleLogin();
      toast.success("Gmail do professor autorizado. As próximas devolutivas serão enviadas com um clique.");
      params.delete("gmail");
      params.delete("gmail_reason");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
      return;
    }
    if (gmailResult === "error") {
      clearGmailSetupAfterGoogleLogin();
      const reason = params.get("gmail_reason");
      toast.error(gmailErrorMessage(reason));
      params.delete("gmail");
      params.delete("gmail_reason");
      const query = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
      return;
    }

    if (!shouldSetupGmailAfterGoogleLogin() || gmailSetupStarted.current || !user.email) return;
    gmailSetupStarted.current = true;
    void connectGmail({
      expectedEmail: user.email,
      returnUrl: `${window.location.origin}/painel`,
    })
      .then(() => {
        clearGmailSetupAfterGoogleLogin();
      })
      .catch((error) => {
        clearGmailSetupAfterGoogleLogin();
        toast.error(error instanceof Error ? error.message : String(error));
      });
  }, [user.email]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await firebaseSignOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="no-print w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/painel" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center font-bold">F</div>
            <span className="font-semibold tracking-tight">Folha</span>
          </Link>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(item.to + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-2 border-t border-sidebar-border">
          <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <Outlet />
      </main>
    </div>
  );
}

function gmailErrorMessage(reason: string | null): string {
  if (reason === "access_denied") return "A autorização do Gmail foi cancelada.";
  if (reason === "email_mismatch") return "Autorize o mesmo Gmail usado no login do professor.";
  if (reason === "missing_refresh_token") return "O Google não forneceu a autorização permanente. Tente entrar novamente com Google.";
  if (reason === "expired") return "A autorização demorou demais e expirou. Entre novamente com Google.";
  return "Não foi possível autorizar o Gmail do professor.";
}
