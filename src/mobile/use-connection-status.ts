import { onlineManager } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import type { ConnectionSnapshot } from "@/lib/mobile-runtime";

import { observeConnectionStatus, readConnectionStatus } from "./platform";

const INITIAL_CONNECTION: ConnectionSnapshot = {
  connected: typeof navigator === "undefined" ? true : navigator.onLine,
  kind: "unknown",
};

export function useConnectionStatus(): ConnectionSnapshot {
  const [connection, setConnection] = useState(INITIAL_CONNECTION);

  useEffect(() => {
    let disposed = false;
    let removeListener: () => void = () => undefined;

    const update = (next: ConnectionSnapshot) => {
      if (disposed) return;
      setConnection(next);
      onlineManager.setOnline(next.connected);
    };

    void readConnectionStatus()
      .then(update)
      .catch(() => undefined);
    void observeConnectionStatus(update).then((remove) => {
      if (disposed) {
        remove();
      } else {
        removeListener = remove;
      }
    });

    return () => {
      disposed = true;
      removeListener();
    };
  }, []);

  return connection;
}
