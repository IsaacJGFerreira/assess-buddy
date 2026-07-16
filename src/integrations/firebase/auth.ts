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

import { getFirebaseAuth } from "./client";

export async function signInWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );
}

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(
    getFirebaseAuth(),
    email.trim(),
    password,
  );

  const normalizedName = displayName.trim();

  if (normalizedName) {
    await updateProfile(credential.user, {
      displayName: normalizedName,
    });
  }

  return credential;
}

export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();

  provider.setCustomParameters({
    prompt: "select_account",
  });

  return signInWithPopup(getFirebaseAuth(), provider);
}

export async function signOut(): Promise<void> {
  await firebaseSignOut(getFirebaseAuth());
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

export function getCurrentUser(): User | null {
  return getFirebaseAuth().currentUser;
}

export type { User };
