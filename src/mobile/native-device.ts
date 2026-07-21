import { Camera, MediaTypeSelection, type MediaResult } from "@capacitor/camera";
import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileViewer } from "@capacitor/file-viewer";
import { Preferences } from "@capacitor/preferences";
import { Share } from "@capacitor/share";

import {
  base64ToBlob,
  blobToBase64,
  buildCapturedScanName,
  dispatchNativeFile,
  extractRestoredCameraAsset,
  imageMimeFromFormat,
  isNativeActionCancelled,
  readNativeMediaBlob,
  resolvePermissionAction,
  safeNativeFileName,
  type NativeFileDispatcher,
  type NativeMediaAsset,
  type NativeScanSource,
  type RestoredNativePluginResult,
} from "@/lib/mobile-native-runtime";

const PENDING_CAPTURE_KEY = "folha.pending-native-capture";
const PENDING_SCAN_PREFIX = "folha.pending-native-scan";
const NATIVE_SCAN_RESTORED_EVENT = "folha:native-scan-restored";
const MAX_PENDING_SCAN_AGE_MS = 48 * 60 * 60 * 1000;

interface PendingCaptureContext {
  assessmentId: string;
  source: NativeScanSource;
  startedAt: number;
}

interface PendingScanMetadata {
  assessmentId: string;
  path: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  createdAt: number;
}

export function isNativeMobileApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function acquireNativeAnswerSheetImage(
  assessmentId: string,
  source: NativeScanSource,
): Promise<File | null> {
  if (!isNativeMobileApp()) return null;

  await savePendingCaptureContext({ assessmentId, source, startedAt: Date.now() });

  try {
    if (source === "camera") await ensureCameraPermission();

    const result =
      source === "camera"
        ? await Camera.takePhoto({
            quality: 94,
            targetWidth: 3200,
            targetHeight: 3200,
            correctOrientation: true,
            saveToGallery: false,
            editable: "no",
            includeMetadata: true,
          })
        : (
            await Camera.chooseFromGallery({
              mediaType: MediaTypeSelection.Photo,
              allowMultipleSelection: false,
              quality: 94,
              targetWidth: 3200,
              targetHeight: 3200,
              correctOrientation: true,
              editable: "no",
              includeMetadata: true,
            })
          ).results[0];

    if (!result) return null;

    const file = await mediaResultToFile(result, source);
    await persistPendingNativeScan(assessmentId, file);
    return file;
  } catch (error) {
    if (isNativeActionCancelled(error)) return null;
    throw normalizeNativeError(error);
  } finally {
    await Preferences.remove({ key: PENDING_CAPTURE_KEY }).catch(() => undefined);
  }
}

export async function persistPendingNativeScan(assessmentId: string, file: File): Promise<void> {
  if (!isNativeMobileApp()) return;

  await clearPendingNativeScan(assessmentId);
  const extension = extensionForFile(file);
  const path = `folha/pending-scans/${safeNativeFileName(assessmentId)}-${crypto.randomUUID()}.${extension}`;
  const base64 = await blobToBase64(file);

  await Filesystem.writeFile({
    path,
    data: base64,
    directory: Directory.Data,
    recursive: true,
  });

  const metadata: PendingScanMetadata = {
    assessmentId,
    path,
    name: safeNativeFileName(file.name, `folha.${extension}`),
    type: file.type || mimeForExtension(extension),
    size: file.size,
    lastModified: file.lastModified,
    createdAt: Date.now(),
  };

  await Preferences.set({
    key: pendingScanKey(assessmentId),
    value: JSON.stringify(metadata),
  });
}

export async function restorePendingNativeScan(assessmentId: string): Promise<File | null> {
  if (!isNativeMobileApp()) return null;

  const metadata = await readPendingScanMetadata(assessmentId);
  if (!metadata) return null;

  if (Date.now() - metadata.createdAt > MAX_PENDING_SCAN_AGE_MS) {
    await clearPendingNativeScan(assessmentId);
    return null;
  }

  try {
    const result = await Filesystem.readFile({ path: metadata.path, directory: Directory.Data });
    const blob =
      typeof result.data === "string"
        ? base64ToBlob(result.data, metadata.type)
        : result.data.slice(0, result.data.size, metadata.type);

    if (blob.size !== metadata.size) {
      throw new Error("O arquivo recuperado está incompleto.");
    }

    return new File([blob], metadata.name, {
      type: metadata.type,
      lastModified: metadata.lastModified,
    });
  } catch {
    await clearPendingNativeScan(assessmentId);
    return null;
  }
}

export async function clearPendingNativeScan(assessmentId: string): Promise<void> {
  if (!isNativeMobileApp()) return;

  const metadata = await readPendingScanMetadata(assessmentId);
  await Preferences.remove({ key: pendingScanKey(assessmentId) });

  if (metadata?.path) {
    await Filesystem.deleteFile({ path: metadata.path, directory: Directory.Data }).catch(
      () => undefined,
    );
  }
}

export async function handleRestoredNativePluginResult(
  event: RestoredNativePluginResult,
): Promise<boolean> {
  if (!isNativeMobileApp() || event.pluginId !== "Camera") return false;

  const context = await readPendingCaptureContext();
  if (!context) return false;

  try {
    const asset = extractRestoredCameraAsset(event);
    if (!asset) return false;
    const file = await nativeMediaAssetToFile(asset, context.source);
    await persistPendingNativeScan(context.assessmentId, file);
    window.dispatchEvent(
      new CustomEvent(NATIVE_SCAN_RESTORED_EVENT, {
        detail: { assessmentId: context.assessmentId },
      }),
    );
    return true;
  } finally {
    await Preferences.remove({ key: PENDING_CAPTURE_KEY }).catch(() => undefined);
  }
}

export function observeRestoredNativeScan(assessmentId: string, callback: () => void): () => void {
  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ assessmentId?: string }>).detail;
    if (detail?.assessmentId === assessmentId) callback();
  };

  window.addEventListener(NATIVE_SCAN_RESTORED_EVENT, listener);
  return () => window.removeEventListener(NATIVE_SCAN_RESTORED_EVENT, listener);
}

export async function savePdfOnDevice(blob: Blob, fileName: string): Promise<string> {
  return dispatchNativeFile(
    { blob, fileName: ensurePdfExtension(fileName), action: "save" },
    createNativeFileDispatcher(),
  );
}

export async function sharePdfOnDevice(
  blob: Blob,
  fileName: string,
  title: string,
  text?: string,
): Promise<string> {
  return dispatchNativeFile(
    { blob, fileName: ensurePdfExtension(fileName), action: "share", title, text },
    createNativeFileDispatcher(),
  );
}

export async function openPdfOnDevice(blob: Blob, fileName: string): Promise<string> {
  return dispatchNativeFile(
    { blob, fileName: ensurePdfExtension(fileName), action: "open" },
    createNativeFileDispatcher(),
  );
}

export async function openFileOnDevice(file: File): Promise<string> {
  return dispatchNativeFile(
    { blob: file, fileName: file.name, action: "open" },
    createNativeFileDispatcher(),
  );
}

async function ensureCameraPermission(): Promise<void> {
  const status = await Camera.checkPermissions();
  let action = resolvePermissionAction(status.camera);

  if (action === "request") {
    const requested = await Camera.requestPermissions({ permissions: ["camera"] });
    action = resolvePermissionAction(requested.camera);
  }

  if (action === "blocked") {
    throw new Error(
      "A câmera está bloqueada para o Folha. Autorize-a nas configurações do Android.",
    );
  }
}

async function mediaResultToFile(result: MediaResult, source: NativeScanSource): Promise<File> {
  return nativeMediaAssetToFile(result, source);
}

async function nativeMediaAssetToFile(
  asset: NativeMediaAsset,
  source: NativeScanSource,
): Promise<File> {
  const blob = await readNativeMediaBlob(asset, {
    fetchBlob: async (url) => {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`Falha ao ler imagem (${response.status}).`);
      return response.blob();
    },
    readBase64: async (uri) => {
      const result = await Filesystem.readFile({ path: uri });
      if (typeof result.data !== "string") return blobToBase64(result.data);
      return result.data;
    },
  });
  const mime =
    blob.type === "image/png" || blob.type === "image/jpeg"
      ? blob.type
      : imageMimeFromFormat(asset.metadata?.format);

  return new File([blob], buildCapturedScanName(source, mime), {
    type: mime,
    lastModified: Date.now(),
  });
}

function createNativeFileDispatcher(): NativeFileDispatcher {
  return {
    write: async ({ base64, fileName, location }) => {
      const directory = location === "documents" ? Directory.Documents : Directory.Cache;

      if (directory === Directory.Documents) await ensureDocumentPermission();

      const path =
        location === "documents" ? `Folha/${fileName}` : `folha/shared/${Date.now()}-${fileName}`;
      const result = await Filesystem.writeFile({
        path,
        data: base64,
        directory,
        recursive: true,
      });
      return result.uri;
    },
    open: (uri) => FileViewer.openDocumentFromLocalPath({ path: uri }),
    share: async ({ uri, title, text }) => {
      const supported = await Share.canShare();
      if (!supported.value)
        throw new Error("O compartilhamento não está disponível neste aparelho.");
      await Share.share({
        files: [uri],
        title,
        text,
        dialogTitle: "Compartilhar PDF do Folha",
      });
    },
  };
}

async function ensureDocumentPermission(): Promise<void> {
  const status = await Filesystem.checkPermissions();
  let action = resolvePermissionAction(status.publicStorage);

  if (action === "request") {
    const requested = await Filesystem.requestPermissions();
    action = resolvePermissionAction(requested.publicStorage);
  }

  if (action === "blocked") {
    throw new Error(
      "O Android não permitiu salvar em Documentos. Use Compartilhar para escolher outro destino.",
    );
  }
}

async function savePendingCaptureContext(context: PendingCaptureContext): Promise<void> {
  await Preferences.set({ key: PENDING_CAPTURE_KEY, value: JSON.stringify(context) });
}

async function readPendingCaptureContext(): Promise<PendingCaptureContext | null> {
  const result = await Preferences.get({ key: PENDING_CAPTURE_KEY });
  if (!result.value) return null;

  try {
    const parsed = JSON.parse(result.value) as Partial<PendingCaptureContext>;
    if (
      typeof parsed.assessmentId !== "string" ||
      (parsed.source !== "camera" && parsed.source !== "gallery") ||
      typeof parsed.startedAt !== "number"
    ) {
      return null;
    }
    if (Date.now() - parsed.startedAt > MAX_PENDING_SCAN_AGE_MS) {
      await Preferences.remove({ key: PENDING_CAPTURE_KEY });
      return null;
    }
    return parsed as PendingCaptureContext;
  } catch {
    await Preferences.remove({ key: PENDING_CAPTURE_KEY }).catch(() => undefined);
    return null;
  }
}

async function readPendingScanMetadata(assessmentId: string): Promise<PendingScanMetadata | null> {
  const result = await Preferences.get({ key: pendingScanKey(assessmentId) });
  if (!result.value) return null;

  try {
    const parsed = JSON.parse(result.value) as Partial<PendingScanMetadata>;
    if (
      parsed.assessmentId !== assessmentId ||
      typeof parsed.path !== "string" ||
      typeof parsed.name !== "string" ||
      typeof parsed.type !== "string" ||
      typeof parsed.size !== "number" ||
      typeof parsed.lastModified !== "number" ||
      typeof parsed.createdAt !== "number"
    ) {
      return null;
    }
    return parsed as PendingScanMetadata;
  } catch {
    return null;
  }
}

function pendingScanKey(assessmentId: string): string {
  return `${PENDING_SCAN_PREFIX}.${assessmentId}`;
}

function ensurePdfExtension(value: string): string {
  const safe = safeNativeFileName(value, "documento.pdf");
  return safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;
}

function extensionForMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "image/png") return "png";
  return "jpg";
}

function extensionForFile(file: File): string {
  if (file.type) return extensionForMime(file.type);
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension === "pdf" || extension === "png" || extension === "jpg" || extension === "jpeg"
    ? extension === "jpeg"
      ? "jpg"
      : extension
    : "jpg";
}

function mimeForExtension(extension: string): string {
  if (extension === "pdf") return "application/pdf";
  if (extension === "png") return "image/png";
  return "image/jpeg";
}

function normalizeNativeError(error: unknown): Error {
  if (error instanceof Error) return error;
  if (error && typeof error === "object" && "message" in error) {
    return new Error(String((error as { message?: unknown }).message ?? "Falha no Android."));
  }
  return new Error(String(error));
}
