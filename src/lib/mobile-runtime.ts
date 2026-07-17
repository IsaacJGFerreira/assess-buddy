export type AndroidBackAction = "back" | "minimize";

export function resolveAndroidBackAction(canGoBack: boolean): AndroidBackAction {
  return canGoBack ? "back" : "minimize";
}

export type ConnectionKind = "wifi" | "cellular" | "ethernet" | "unknown" | "none";

export interface ConnectionSnapshot {
  connected: boolean;
  kind: ConnectionKind;
}

export function normalizeConnectionSnapshot(
  connected: boolean,
  connectionType: string,
): ConnectionSnapshot {
  if (!connected) return { connected: false, kind: "none" };

  if (connectionType === "wifi" || connectionType === "cellular" || connectionType === "ethernet") {
    return { connected: true, kind: connectionType };
  }

  return { connected: true, kind: "unknown" };
}
