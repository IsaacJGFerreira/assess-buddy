import assert from "node:assert/strict";
import test from "node:test";

import {
  assertOnline,
  base64ToBlob,
  blobToBase64,
  buildCapturedScanName,
  dispatchNativeFile,
  emailFromOpenIdToken,
  extractRestoredCameraAsset,
  isNativeActionCancelled,
  readNativeMediaBlob,
  resolvePermissionAction,
  safeNativeFileName,
  type NativeFileDispatcher,
} from "./mobile-native-runtime";

test("mapeia permissões modernas sem pedir acesso quando já autorizado", () => {
  assert.equal(resolvePermissionAction("granted"), "continue");
  assert.equal(resolvePermissionAction("limited"), "continue");
  assert.equal(resolvePermissionAction("prompt"), "request");
  assert.equal(resolvePermissionAction("prompt-with-rationale"), "request");
  assert.equal(resolvePermissionAction("denied"), "blocked");
});

test("recupera resultados de câmera e galeria restaurados pelo Android", () => {
  assert.deepEqual(
    extractRestoredCameraAsset({
      pluginId: "Camera",
      methodName: "takePhoto",
      success: true,
      data: { webPath: "capacitor://photo.jpg", metadata: { format: "jpeg" } },
    }),
    { webPath: "capacitor://photo.jpg", metadata: { format: "jpeg" } },
  );
  assert.deepEqual(
    extractRestoredCameraAsset({
      pluginId: "Camera",
      methodName: "chooseFromGallery",
      success: true,
      data: { results: [{ uri: "content://gallery/photo.png" }] },
    }),
    { uri: "content://gallery/photo.png" },
  );
  assert.equal(
    extractRestoredCameraAsset({
      pluginId: "Camera",
      methodName: "takePhoto",
      success: false,
      error: { message: "cancelled" },
    }),
    null,
  );
  assert.equal(
    extractRestoredCameraAsset({
      pluginId: "Filesystem",
      methodName: "readFile",
      success: true,
      data: { uri: "content://ignored" },
    }),
    null,
  );
});

test("lê imagem pelo webPath e normaliza o MIME", async () => {
  const blob = await readNativeMediaBlob(
    { webPath: "capacitor://photo", metadata: { format: "png" } },
    {
      fetchBlob: async () => new Blob([new Uint8Array([1, 2, 3])]),
      readBase64: async () => {
        throw new Error("não deveria usar URI");
      },
    },
  );

  assert.equal(blob.type, "image/png");
  assert.equal(blob.size, 3);
});

test("usa URI como fallback quando o webPath não pode ser lido", async () => {
  const blob = await readNativeMediaBlob(
    {
      webPath: "capacitor://indisponivel",
      uri: "content://photo",
      metadata: { format: "jpeg" },
    },
    {
      fetchBlob: async () => {
        throw new Error("indisponível");
      },
      readBase64: async () => "AQIDBA==",
    },
  );

  assert.equal(blob.type, "image/jpeg");
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), new Uint8Array([1, 2, 3, 4]));
});

test("salva, abre e compartilha arquivos usando o diretório correto", async () => {
  const calls: string[] = [];
  const dispatcher: NativeFileDispatcher = {
    write: async ({ fileName, location }) => {
      calls.push(`write:${location}:${fileName}`);
      return `file:///tmp/${fileName}`;
    },
    open: async (uri) => {
      calls.push(`open:${uri}`);
    },
    share: async ({ uri, title, text }) => {
      calls.push(`share:${uri}:${title}:${text ?? ""}`);
    },
  };
  const pdf = new Blob(["pdf"], { type: "application/pdf" });

  const openedUri = await dispatchNativeFile(
    { blob: pdf, fileName: "Relatório final.pdf", action: "open" },
    dispatcher,
  );
  const savedUri = await dispatchNativeFile(
    { blob: pdf, fileName: "Relatório final.pdf", action: "save" },
    dispatcher,
  );
  const sharedUri = await dispatchNativeFile(
    {
      blob: pdf,
      fileName: "Relatório final.pdf",
      action: "share",
      title: "Devolutiva",
      text: "Arquivo do Folha",
    },
    dispatcher,
  );

  assert.equal(openedUri, "file:///tmp/Relatorio-final.pdf");
  assert.equal(savedUri, "file:///tmp/Relatorio-final.pdf");
  assert.equal(sharedUri, "file:///tmp/Relatorio-final.pdf");
  assert.deepEqual(calls, [
    "write:cache:Relatorio-final.pdf",
    "open:file:///tmp/Relatorio-final.pdf",
    "write:documents:Relatorio-final.pdf",
    "write:cache:Relatorio-final.pdf",
    "share:file:///tmp/Relatorio-final.pdf:Devolutiva:Arquivo do Folha",
  ]);
});

test("recusa arquivo vazio e bloqueia ações de rede quando offline", async () => {
  const dispatcher: NativeFileDispatcher = {
    write: async () => "file:///tmp/empty.pdf",
    open: async () => undefined,
    share: async () => undefined,
  };

  await assert.rejects(
    dispatchNativeFile({ blob: new Blob([]), fileName: "empty.pdf", action: "save" }, dispatcher),
    /arquivo está vazio/i,
  );
  assert.doesNotThrow(() => assertOnline(true, "enviar a folha"));
  assert.throws(() => assertOnline(false, "enviar a folha"), /continua salvo no aparelho/i);
});

test("converte blobs sem alterar bytes e gera nomes seguros", async () => {
  const original = new Blob([new Uint8Array([0, 1, 2, 253, 254, 255])], {
    type: "application/octet-stream",
  });
  const base64 = await blobToBase64(original);
  const restored = base64ToBlob(base64, original.type);

  assert.deepEqual(
    new Uint8Array(await restored.arrayBuffer()),
    new Uint8Array(await original.arrayBuffer()),
  );
  assert.equal(safeNativeFileName("  Relatório / turma A?.pdf "), "Relatorio-turma-A-.pdf");
  assert.match(buildCapturedScanName("camera", "image/jpeg", 42), /^folha-camera-42\.jpg$/);
});

test("reconhece cancelamentos nativos conhecidos", () => {
  assert.equal(isNativeActionCancelled({ code: "OS-PLUG-CAMR-0006" }), true);
  assert.equal(isNativeActionCancelled({ code: "OS-PLUG-CAMR-0013" }), true);
  assert.equal(isNativeActionCancelled({ code: "OS-PLUG-CAMR-0020" }), true);
  assert.equal(isNativeActionCancelled({ code: "OS-PLUG-CAMR-0004" }), false);
  assert.equal(isNativeActionCancelled(new Error("cancelled")), false);
});

test("extrai somente o e-mail do ID token retornado pelo Google", () => {
  const payload = btoa(JSON.stringify({ email: "Professor@Example.com", sub: "123" }))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/g, "");
  assert.equal(emailFromOpenIdToken(`header.${payload}.signature`), "professor@example.com");
  assert.equal(emailFromOpenIdToken("token-invalido"), null);
  assert.equal(emailFromOpenIdToken("header.bm90LWpzb24.signature"), null);
});
