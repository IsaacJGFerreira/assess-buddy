import assert from "node:assert/strict";
import test from "node:test";

import { storageBytesToDataUrl } from "./feedback-image-data";

test("incorpora imagens das devolutivas como data URL estável", () => {
  const url = storageBytesToDataUrl(new Uint8Array([0, 1, 2, 253, 254, 255]), "image/png");
  assert.equal(url, "data:image/png;base64,AAEC/f7/");
});

test("não propaga tipos de conteúdo arbitrários para o PDF", () => {
  const url = storageBytesToDataUrl(new Uint8Array([255, 216, 255]), "text/html");
  assert.equal(url, "data:image/jpeg;base64,/9j/");
});
