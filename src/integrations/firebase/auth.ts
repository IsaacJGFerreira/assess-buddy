import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type Unsubscribe,
  type User,
  type UserCredential,
} from "firebase/auth";

import { supabase } from "@/integrations/supabase/client";

import { buscarMeuPerfil, salvarPerfil } from "./academic-data";
import { getFirebaseAuth } from "./client";

export interface AuthenticatedUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  firebaseUser: User | null;
  source: "firebase" | "supabase";
}

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  const normalizedEmail = normalizeEmail(email);
  const credential = await signInWithEmailAndPassword(
    getFirebaseAuth(),
    normalizedEmail,
    password,
  );

  try {
    await ensureSupabasePasswordSession({
      email: normalizedEmail,
      password,
      displayName: credential.user.displayName,
      allowCreate: true,
    });
    await ensureFirebaseProfile(credential.user);
    return credential;
  } catch (error) {
    await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
    throw error;
  }
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<UserCredential> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedName = displayName.trim();
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    normalizedEmail,
    password,
  );

  try {
    if (normalizedName) {
      await updateProfile(credential.user, {
        displayName: normalizedName,
      });
    }

    await ensureSupabasePasswordSession({
      email: normalizedEmail,
      password,
      displayName: normalizedName,
      allowCreate: true,
    });
    await ensureFirebaseProfile(credential.user);
    return credential;
  } catch (error) {
    await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
    throw error;
  }
}

export async function signOut(): Promise<void> {
  const results = await Promise.allSettled([
    firebaseSignOut(getFirebaseAuth()),
    supabase.auth.signOut(),
  ]);

  const firebaseResult = results[0];

  if (firebaseResult.status === "rejected") {
    throw firebaseResult.reason;
  }
}

export function observeAuthState(
  callback: (user: User | null) => void,
): Unsubscribe {
  return onAuthStateChanged(getFirebaseAuth(), callback);
}

export async function waitForAuthReady(): Promise<User | null> {
  const auth = getFirebaseAuth();

  await auth.authStateReady();

  return auth.currentUser;
}

export async function waitForCompatibleAuth(): Promise<AuthenticatedUser | null> {
  let firebaseUser = await waitForAuthReady();
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const session = data.session;

  if (!session) {
    if (firebaseUser) {
      await firebaseSignOut(getFirebaseAuth()).catch(() => undefined);
    }
    return null;
  }

  if (!firebaseUser && session.provider_token) {
    try {
      const googleCredential = GoogleAuthProvider.credential(
        null,
        session.provider_token,
      );
      const credential = await signInWithCredential(
        getFirebaseAuth(),
        googleCredential,
      );
      firebaseUser = credential.user;
    } catch (error) {
      console.warn(
        "A sessão Google do Lovable foi criada, mas não pôde ser sincronizada com o Firebase.",
        error,
      );
    }
  }

  if (firebaseUser) {
    await ensureFirebaseProfile(firebaseUser);
    return mapFirebaseUser(firebaseUser);
  }

  return {
    uid: session.user.id,
    email: session.user.email ?? null,
    displayName: readSupabaseDisplayName(session.user.user_metadata),
    firebaseUser: null,
    source: "supabase",
  };
}

export function getCurrentUser(): User | null {
  return getFirebaseAuth().currentUser;
}

export async function ensureFirebaseProfile(user: User): Promise<void> {
  await user.getIdToken();

  const current = await buscarMeuPerfil();
  const nome = user.displayName?.trim() || null;
  const email = user.email?.trim().toLowerCase() || null;

  if (current && current.nome === nome && current.email === email) {
    return;
  }

  try {
    await salvarPerfil({
      nome: nome ?? current?.nome ?? null,
      email: email ?? current?.email ?? null,
      escola: current?.escola ?? null,
    });
  } catch (error) {
    if (isProfileReadAfterWriteError(error)) {
      console.warn(
        "O perfil foi salvo no Data Connect, mas ainda não apareceu na releitura imediata. O login continuará normalmente.",
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
  if (code === "auth/network-request-failed") {
    return "Não foi possível acessar o Firebase. Verifique sua conexão.";
  }

  return error.message;
}

async function ensureSupabasePasswordSession({
  email,
  password,
  displayName,
  allowCreate,
}: {
  email: string;
  password: string;
  displayName: string | null;
  allowCreate: boolean;
}): Promise<void> {
  const signInResult = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (!signInResult.error && signInResult.data.session) {
    return;
  }

  if (!allowCreate || !isMissingSupabaseUser(signInResult.error)) {
    throw new Error(
      signInResult.error?.message ??
        "Não foi possível preparar a sessão temporária de compatibilidade.",
    );
  }

  const signUpResult = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nome: displayName?.trim() || undefined,
      },
    },
  });

  if (signUpResult.error) {
    throw new Error(signUpResult.error.message);
  }

  if (!signUpResult.data.session) {
    throw new Error(
      "A conta foi criada, mas o sistema antigo exige confirmação por e-mail. Confirme o endereço e entre novamente.",
    );
  }
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

function readSupabaseDisplayName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;

  const values = metadata as Record<string, unknown>;
  const candidate = values.full_name ?? values.name ?? values.nome;

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null;
}

function isProfileReadAfterWriteError(error: unknown): boolean {
  return (
    error instanceof Error &&
    error.message === "O perfil foi salvo, mas não pôde ser carregado."
  );
}

function isMissingSupabaseUser(error: { message?: string } | null): boolean {
  const message = error?.message?.toLowerCase() ?? "";

  return (
    message.includes("invalid login credentials") ||
    message.includes("email not confirmed") ||
    message.includes("user not found")
  );
}

function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    throw new Error("Informe seu e-mail.");
  }

  return normalized;
}

export type { User };
