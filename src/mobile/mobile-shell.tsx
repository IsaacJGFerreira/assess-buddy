import {
  ArrowLeft,
  ClipboardList,
  Cloud,
  CloudOff,
  Home,
  Loader2,
  LogOut,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import type { User } from "@/integrations/firebase/auth";

import { mobilePrimaryTab, type MobilePrimaryTab, type MobileRoute } from "./mobile-navigation";
import type { MobileLayoutProfile } from "./mobile-responsive";

export function MobileShell({
  user,
  route,
  connected,
  connectionKind,
  signingOut,
  layout,
  onNavigate,
  onBack,
  onSignOut,
  children,
}: {
  user: User;
  route: MobileRoute;
  connected: boolean;
  connectionKind: string;
  signingOut: boolean;
  layout: MobileLayoutProfile;
  onNavigate: (route: MobileRoute) => void;
  onBack?: () => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  const activeTab = mobilePrimaryTab(route);
  const isNested = route.kind === "new-assessment" || route.kind === "assessment";

  return (
    <main
      className="mobile-safe-area mobile-app-shell"
      data-density={layout.density}
      style={{ "--mobile-content-padding": `${layout.contentPadding}px` } as React.CSSProperties}
    >
      {!connected && (
        <div className="mobile-offline-banner">
          <CloudOff /> Sem conexão. Alterações ficam bloqueadas até a internet voltar.
        </div>
      )}

      <header className="mobile-app-header">
        <div className="mobile-app-header-row">
          {isNested ? (
            <Button type="button" variant="ghost" size="icon" aria-label="Voltar" onClick={onBack}>
              <ArrowLeft />
            </Button>
          ) : (
            <div className="mobile-brand-mark" aria-hidden="true">
              F
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="mobile-app-name">Folha</p>
            <p className="mobile-user-email">{user.email}</p>
          </div>
          <span className={`mobile-connection ${connected ? "is-online" : "is-offline"}`}>
            {connected ? <Cloud /> : <CloudOff />}
            {connected ? connectionLabel(connectionKind) : "Offline"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Sair da conta"
            disabled={signingOut}
            onClick={onSignOut}
          >
            {signingOut ? <Loader2 className="animate-spin" /> : <LogOut />}
          </Button>
        </div>
      </header>

      <div className="mobile-app-content">{children}</div>

      <nav className="mobile-bottom-nav" aria-label="Navegação principal">
        <BottomNavItem
          label="Painel"
          icon={<Home />}
          active={activeTab === "dashboard"}
          showLabel={layout.showBottomNavLabels}
          onClick={() => onNavigate({ kind: "dashboard" })}
        />
        <BottomNavItem
          label="Turmas"
          icon={<Users />}
          active={activeTab === "classes"}
          showLabel={layout.showBottomNavLabels}
          onClick={() => onNavigate({ kind: "classes" })}
        />
        <BottomNavItem
          label="Avaliações"
          icon={<ClipboardList />}
          active={activeTab === "assessments"}
          showLabel={layout.showBottomNavLabels}
          onClick={() => onNavigate({ kind: "assessments" })}
        />
      </nav>
    </main>
  );
}

function BottomNavItem({
  label,
  icon,
  active,
  showLabel,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  showLabel: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={active ? "mobile-nav-item is-active" : "mobile-nav-item"}
      aria-current={active ? "page" : undefined}
      aria-label={label}
      onClick={onClick}
    >
      {icon}
      {showLabel && <span>{label}</span>}
    </button>
  );
}

function connectionLabel(kind: string): string {
  if (kind === "wifi") return "Wi-Fi";
  if (kind === "cellular") return "Dados";
  if (kind === "ethernet") return "Rede";
  return "Online";
}
