import {
  deleteObject,
  listAll,
  ref,
  type FirebaseStorage,
  type StorageReference,
} from "firebase/storage";

import { getFirebaseStorage } from "./client";
import { assessmentStoragePrefixes, questionStoragePrefix } from "./storage-cleanup-paths";

const DELETE_ATTEMPTS = 3;

export interface FirebaseStorageCleanupResult {
  storageCleanupFailed: boolean;
}

export async function deleteAssessmentStorage(
  ownerUid: string,
  assessmentId: string,
): Promise<FirebaseStorageCleanupResult> {
  return deletePrefixes(assessmentStoragePrefixes(ownerUid, assessmentId));
}

export async function deleteQuestionStorage(
  ownerUid: string,
  assessmentId: string,
  questionId: string,
): Promise<FirebaseStorageCleanupResult> {
  return deletePrefixes([questionStoragePrefix(ownerUid, assessmentId, questionId)]);
}

async function deletePrefixes(paths: string[]): Promise<FirebaseStorageCleanupResult> {
  const storage = getFirebaseStorage();
  const results = await Promise.all(paths.map((path) => deleteStorageTree(storage, path)));
  return { storageCleanupFailed: results.some((success) => !success) };
}

async function deleteStorageTree(storage: FirebaseStorage, path: string): Promise<boolean> {
  try {
    const root = ref(storage, path);
    const result = await listAll(root);
    const nested = await Promise.all(
      result.prefixes.map((prefix) => deleteStorageReferenceTree(prefix)),
    );
    const deleted = await Promise.all(result.items.map((item) => deleteWithRetry(item)));
    return nested.every(Boolean) && deleted.every(Boolean);
  } catch {
    return false;
  }
}

async function deleteStorageReferenceTree(reference: StorageReference): Promise<boolean> {
  try {
    const result = await listAll(reference);
    const nested = await Promise.all(
      result.prefixes.map((prefix) => deleteStorageReferenceTree(prefix)),
    );
    const deleted = await Promise.all(result.items.map((item) => deleteWithRetry(item)));
    return nested.every(Boolean) && deleted.every(Boolean);
  } catch {
    return false;
  }
}

async function deleteWithRetry(reference: StorageReference): Promise<boolean> {
  for (let attempt = 1; attempt <= DELETE_ATTEMPTS; attempt += 1) {
    try {
      await deleteObject(reference);
      return true;
    } catch (error) {
      if (isStorageObjectNotFound(error)) return true;
      if (attempt === DELETE_ATTEMPTS) return false;
    }
  }
  return false;
}

function isStorageObjectNotFound(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code?: unknown }).code === "storage/object-not-found"
  );
}
