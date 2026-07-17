import { useEffect, useState } from "react";

import { configurePersistentAuth } from "@/integrations/firebase/auth";

import { MobileApp } from "./mobile-app";
import { initializeMobilePlatform } from "./platform";

type BootstrapState =
  { status: "loading" } | { status: "ready" } | { status: "error"; message: string };

export function MobileBootstrap() {
  const [state, setState] = useState<BootstrapState>({ status: "loading" });

  useEffect(() => {
    let disposed = false;
    let cleanupPlatform: () => void = () => undefined;

    void Promise.all([configurePersistentAuth(), initializeMobilePlatform()])
      .then(([, cleanup]) => {
        cleanupPlatform = cleanup;
        if (!disposed) setState({ status: "ready" });
      })
      .catch((error: unknown) => {
        if (!disposed) {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : String(error),
          });
        }
      });

    return () => {
      disposed = true;
      cleanupPlatform();
    };
  }, []);

  if (state.status === "loading") {
    return (
      <div className="mobile-safe-area grid place-items-center bg-background px-6">
        <div className="text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-primary text-xl font-bold text-primary-foreground">
            F
          </div>
          <p className="mt-4 text-sm text-muted-foreground">Preparando o Folha…</p>
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="mobile-safe-area grid place-items-center bg-background px-6">
        <div className="w-full max-w-md rounded-xl border border-destructive/30 bg-card p-5 shadow-sm">
          <h1 className="font-semibold text-foreground">O aplicativo não pôde iniciar</h1>
          <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
          <button
            type="button"
            className="mt-4 h-10 w-full rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return <MobileApp />;
}
