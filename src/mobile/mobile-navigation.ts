import { useCallback, useEffect, useState } from "react";

export type MobilePrimaryTab = "dashboard" | "classes" | "assessments";
export type MobileAssessmentSection =
  "details" | "questions" | "sheet" | "correction" | "report" | "feedback";

export type MobileRoute =
  | { kind: "dashboard" }
  | { kind: "classes" }
  | { kind: "assessments" }
  | { kind: "new-assessment" }
  | { kind: "assessment"; assessmentId: string; section: MobileAssessmentSection };

const ASSESSMENT_SECTIONS = new Set<MobileAssessmentSection>([
  "details",
  "questions",
  "sheet",
  "correction",
  "report",
  "feedback",
]);

export function parseMobileRoute(hash: string): MobileRoute {
  const path = hash.replace(/^#/, "").replace(/^\/+|\/+$/g, "");
  if (!path || path === "painel") return { kind: "dashboard" };
  if (path === "turmas") return { kind: "classes" };
  if (path === "avaliacoes") return { kind: "assessments" };
  if (path === "avaliacoes/nova") return { kind: "new-assessment" };

  const [group, rawId, rawSection] = path.split("/");
  if (group === "avaliacoes" && rawId) {
    const section = ASSESSMENT_SECTIONS.has(rawSection as MobileAssessmentSection)
      ? (rawSection as MobileAssessmentSection)
      : "details";
    try {
      return {
        kind: "assessment",
        assessmentId: decodeURIComponent(rawId),
        section,
      };
    } catch {
      return { kind: "dashboard" };
    }
  }

  return { kind: "dashboard" };
}

export function serializeMobileRoute(route: MobileRoute): string {
  if (route.kind === "dashboard") return "#/painel";
  if (route.kind === "classes") return "#/turmas";
  if (route.kind === "assessments") return "#/avaliacoes";
  if (route.kind === "new-assessment") return "#/avaliacoes/nova";
  return `#/avaliacoes/${encodeURIComponent(route.assessmentId)}/${route.section}`;
}

export function mobilePrimaryTab(route: MobileRoute): MobilePrimaryTab {
  if (route.kind === "classes") return "classes";
  if (
    route.kind === "assessments" ||
    route.kind === "new-assessment" ||
    route.kind === "assessment"
  ) {
    return "assessments";
  }
  return "dashboard";
}

export function useMobileNavigation() {
  const [route, setRoute] = useState<MobileRoute>(() =>
    typeof window === "undefined" ? { kind: "dashboard" } : parseMobileRoute(window.location.hash),
  );

  useEffect(() => {
    if (!window.location.hash) {
      window.history.replaceState(null, "", serializeMobileRoute({ kind: "dashboard" }));
    }

    const update = () => setRoute(parseMobileRoute(window.location.hash));
    window.addEventListener("hashchange", update);
    update();
    return () => window.removeEventListener("hashchange", update);
  }, []);

  const navigate = useCallback((next: MobileRoute, options?: { replace?: boolean }) => {
    const target = serializeMobileRoute(next);
    if (options?.replace) {
      window.history.replaceState(null, "", target);
      setRoute(next);
      return;
    }
    if (window.location.hash === target) {
      setRoute(next);
      return;
    }
    window.location.hash = target.slice(1);
  }, []);

  return { route, navigate };
}
