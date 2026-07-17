import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { StatusBar, Style } from "@capacitor/status-bar";

import {
  normalizeConnectionSnapshot,
  resolveAndroidBackAction,
  type ConnectionSnapshot,
} from "@/lib/mobile-runtime";

export async function initializeMobilePlatform(): Promise<() => void> {
  if (!Capacitor.isNativePlatform()) return () => undefined;

  const statusBarResult = await Promise.allSettled([
    StatusBar.setOverlaysWebView({ overlay: true }),
    StatusBar.setStyle({ style: Style.Dark }),
    StatusBar.setBackgroundColor({ color: "#00000000" }),
  ]);

  for (const result of statusBarResult) {
    if (result.status === "rejected") {
      console.warn("Não foi possível aplicar uma configuração da barra de status.", result.reason);
    }
  }

  const backButtonListener = await App.addListener("backButton", async ({ canGoBack }) => {
    const action = resolveAndroidBackAction(canGoBack);

    if (action === "back") {
      window.history.back();
      return;
    }

    await App.minimizeApp();
  });

  return () => {
    void backButtonListener.remove();
  };
}

export async function readConnectionStatus(): Promise<ConnectionSnapshot> {
  const status = await Network.getStatus();
  return normalizeConnectionSnapshot(status.connected, status.connectionType);
}

export async function observeConnectionStatus(
  callback: (status: ConnectionSnapshot) => void,
): Promise<() => void> {
  const listener = await Network.addListener("networkStatusChange", (status) => {
    callback(normalizeConnectionSnapshot(status.connected, status.connectionType));
  });

  return () => {
    void listener.remove();
  };
}
