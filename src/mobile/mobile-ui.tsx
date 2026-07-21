import { CircleAlert, Loader2, RefreshCw } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

import { errorMessage } from "./mobile-utils";

export function MobilePage({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mobile-page">
      <div className="mobile-page-heading">
        <div className="min-w-0">
          <h1>{title}</h1>
          {description && <p>{description}</p>}
        </div>
        {action && <div className="mobile-page-action">{action}</div>}
      </div>
      {children}
    </div>
  );
}

export function MobileCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`mobile-card ${className}`.trim()}>{children}</section>;
}

export function MobileCardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mobile-card-header">
      <div className="min-w-0">
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function MobileField({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="mobile-field">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="mobile-field-hint">{hint}</p>}
    </div>
  );
}

export function MobileNativeSelect({
  label,
  value,
  onChange,
  children,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="mobile-field">
      <span className="text-sm font-medium">{label}</span>
      <select
        className="mobile-native-select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {children}
      </select>
    </label>
  );
}

export function MobileLoading({ label = "Carregando…" }: { label?: string }) {
  return (
    <div className="mobile-state" role="status">
      <Loader2 className="animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function MobileError({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="mobile-error" role="alert">
      <CircleAlert />
      <div className="min-w-0 flex-1">
        <p>{errorMessage(error)}</p>
        {onRetry && (
          <Button type="button" variant="outline" onClick={onRetry}>
            <RefreshCw /> Tentar novamente
          </Button>
        )}
      </div>
    </div>
  );
}

export function MobileEmpty({ children }: { children: ReactNode }) {
  return <div className="mobile-empty">{children}</div>;
}

export function MobileStatusPill({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger";
}) {
  return <span className={`mobile-status-pill is-${tone}`}>{children}</span>;
}
