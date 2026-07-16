import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type Unsubscribe,
  type User,
  type UserCredential,
} from "firebase/auth";

import { supabase } from "@/integrations/supabase/client";

import { buscarMeuPerfil, salvarPerfil } from "./academic-data";
import { getFirebaseAuth } from "./client";

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

export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  const credential = await signInWithPopup(getFirebaseAuth(), provider);

  try {
    const googleCredential = GoogleAuthProvider.credentialFromResult(credential);
    const idToken = googleCredential?.idToken;

    if (!idToken) {
      throw new Error("O Google não forneceu um token de identidade válido.");
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: "google",
      token: idToken,
    });

    if (error) {
      throw new Error(
        `O login no Firebase foi concluído, mas a sessão temporária de compatibilidade falhou: ${error.message}`,
      );
    }

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

export async function waitForCompatibleAuth(): Promise<User | null> {
  const user = await waitForAuthReady();

  if (!user) return null;

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) return null;

  await ensureFirebaseProfile(user);

  return user;
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

  await salvarPerfil({
    nome: nome ?? current?.nome ?? null,
    email: email ?? current?.email ?? null,
    escola: current?.escola ?? null,
  });
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
  if (code === "auth/network-request-failed") return "Não foi possível acessar o Firebase. Verifique sua conexão.";

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
      signInResult.error?.message ?? "Não foi possível preparar a sessão temporária de compatibilidade.",
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