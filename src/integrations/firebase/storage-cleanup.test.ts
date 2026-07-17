import assert from "node:assert/strict";
import test from "node:test";

import {
  assessmentStoragePrefixes,
  questionStoragePrefix,
} from "@/integrations/firebase/storage-cleanup-paths";

test("builds every assessment storage prefix", () => {
  assert.deepEqual(assessmentStoragePrefixes("professor-1", "avaliacao-1"), [
    "usuarios/professor-1/digitalizacoes/avaliacao-1",
    "usuarios/professor-1/imagens-modelo/avaliacao-1",
  ]);
});

test("builds the question prefix that contains model and comment images", () => {
  assert.equal(
    questionStoragePrefix("professor-1", "avaliacao-1", "questao-1"),
    "usuarios/professor-1/imagens-modelo/avaliacao-1/questao-1",
  );
});

test("rejects identifiers that could escape the owned storage prefix", () => {
  assert.throws(
    () => questionStoragePrefix("professor-1", "../outra", "questao-1"),
    /Avaliação inválida/,
  );
});
