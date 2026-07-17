import assert from "node:assert/strict";
import test from "node:test";

import { normalizeConnectionSnapshot, resolveAndroidBackAction } from "./mobile-runtime";

test("volta no historico quando o WebView informa que pode voltar", () => {
  assert.equal(resolveAndroidBackAction(true), "back");
});

test("minimiza o aplicativo quando nao existe historico", () => {
  assert.equal(resolveAndroidBackAction(false), "minimize");
});

test("normaliza conexao offline sem preservar um tipo antigo", () => {
  assert.deepEqual(normalizeConnectionSnapshot(false, "wifi"), {
    connected: false,
    kind: "none",
  });
});

test("preserva somente os tipos de conexao conhecidos", () => {
  assert.deepEqual(normalizeConnectionSnapshot(true, "cellular"), {
    connected: true,
    kind: "cellular",
  });
  assert.deepEqual(normalizeConnectionSnapshot(true, "vpn"), {
    connected: true,
    kind: "unknown",
  });
});
