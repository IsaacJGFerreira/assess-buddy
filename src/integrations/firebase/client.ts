import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
};

function assertConfig() {
  const missing = (["apiKey", "authDomain", "projectId", "appId"] as const).filter(
    (k) => !config[k],
  );
  if (missing.length) {
    // Only warn at runtime — build must not fail if env is not yet populated.
    console.warn(
      `[firebase] Variáveis ausentes: ${missing.map((k) => `VITE_FIREBASE_${k.replace(/[A-Z]/g, (c) => "_" + c).toUpperCase()}`).join(", ")}`,
    );
  }
}

assertConfig();

// Guard against HMR double-init.
export const firebaseApp: FirebaseApp = getApps().length ? getApp() : initializeApp(config);
export const auth: Auth = getAuth(firebaseApp);