import {
  GoogleAuthProvider,
  browserLocalPersistence,
  createUserWithEmailAndPassword,
  indexedDBLocalPersistence,
  onAuthStateChanged,
  setPersistence,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type Unsubscribe,
  type User,
  type UserCredential,
} from "firebase/auth";

import { buscarMeuPerfil, salvarPerfil } from "./academic-data";
import { getFirebaseAuth } from "./client";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  firebaseUser: User;
  source: "firebase";
}

export async function signInWithEmail(email: string, password: string): Promise<UserCredential> {
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    normalizeEmail(email),
    password,
  );

  await ensureFirebaseProfile(credential.user);
  return credential;
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    normalizeEmail(email),
    password,
  );
  const normalizedName = displayName.trim();

  if (normalizedName) {
    await updateProfile(credential.user, { displayName: normalizedName });
  }

  await ensureFirebaseProfile(credential.user);
  return credential;
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  provider.addScope("openid");
  provider.addScope("email");
  provider.addScope("profile");
  provider.setCustomParameters({ prompt: "select_account" });

  const credential = await signInWithPopup(getFirebaseAuth(), provider);
  await ensureFirebaseProfile(credential.user);
  return credential;
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
}

export async function configurePersistentAuth(): Promise<"indexeddb" | "localstorage"> {
  const auth = getFirebaseAuth();

  try {
    await setPersistence(auth, indexedDBLocalPersistence);
    return "indexeddb";
  } catch {
    await setPersistence(auth, browserLocalPersistence);
    return "localstorage";
  }
}

export function observeAuthState(callback: (user: User | null) => void): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function waitForAuthReady(): Promise<User | null> {
  const auth = getFirebaseAuth();
  await auth.authStateReady();
  return auth.currentUser;
}

export async function waitForAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const user = await waitForAuthReady();
  if (!user) return null;

  await ensureFirebaseProfile(user);
  return mapFirebaseUser(user);
}

export function getCurrentUser(): User | null {
  return getFirebaseAuth().currentUser;
}

export async function ensureFirebaseProfile(user: User): Promise<void> {
  await user.getIdToken();

  const current = await buscarMeuPerfil();
  const nome = user.displayName?.trim() || null;
  const email = user.email?.trim().toLowerCase() || null;

  if (current && current.nome === nome && current.email === email) return;

  try {
    await salvarPerfil({
      nome: nome ?? current?.nome ?? null,
      email: email ?? current?.email ?? null,
      escola: current?.escola ?? null,
    });
  } catch (error) {
    if (isProfileReadAfterWriteError(error)) {
      console.warn(
        "O perfil foi salvo no Data Connect, mas ainda não apareceu na releitura imediata.",
      );
      return;
    }

    throw error;
  }
}

export function authErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return String(error);

  const code = (error as Error & { code?: string }).code;

  if (code === "auth/invalid-credential") return "E-mail ou senha incorretos.";
  if (code === "auth/email-already-in-use") return "Já existe uma conta com este e-mail.";
  if (code === "auth/weak-password") return "A senha precisa ter pelo menos 6 caracteres.";
  if (code === "auth/invalid-email") return "Informe um e-mail válido.";
  if (code === "auth/popup-closed-by-user") return "A janela de login do Google foi fechada.";
  if (code === "auth/popup-blocked") return "O navegador bloqueou a janela de login do Google.";
  if (code === "auth/unauthorized-domain") {
    return "Este domínio ainda não foi autorizado no Firebase Authentication.";
  }
  if (code === "auth/network-request-failed") {
    return "Não foi possível acessar o Firebase. Verifique sua conexão.";
  }

  return error.message;
}

function mapFirebaseUser(user: User): AuthenticatedUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    firebaseUser: user,
    source: "firebase",
  };
}

function isProfileReadAfterWriteError(error: unknown): boolean {
  return (
    error instanceof Error && error.message === "O perfil foi salvo, mas não pôde ser carregado."
  );
}

function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (!normalized) throw new Error("Informe seu e-mail.");
  return normalized;
}

export type { User };
