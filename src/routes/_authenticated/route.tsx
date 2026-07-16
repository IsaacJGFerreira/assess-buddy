import {
  createFileRoute,
  Outlet,
  redirect,
  Link,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, Users, FileText, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { signOut, waitForAuthenticatedUser } from "@/integrations/firebase/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const user = await waitForAuthenticatedUser();

    if (!user) {
      throw redirect({ to: "/auth" });
    }

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
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  async function handleSignOut() {
    try {
      await queryClient.cancelQueries();
      queryClient.clear();
      await signOut();
      navigate({ to: "/auth", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      <aside className="no-print w-60 shrink-0 bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="p-4 border-b border-sidebar-border">
          <Link to="/painel" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-sidebar-primary text-sidebar-primary-foreground grid place-items-center font-bold">
              F
            </div>
            <span className="font-semibold tracking-tight">Folha</span>
          </Link>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
            const Icon = item.icon;

            return (
              <Link
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-sidebar-border">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => void handleSignOut()}
          >
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
