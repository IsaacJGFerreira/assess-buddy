import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const assessmentMutationUrl = new URL("../../../dataconnect/app/avaliacoes.gql", import.meta.url);
const questionMutationUrl = new URL("../../../dataconnect/app/questoes.gql", import.meta.url);

test("deletes every assessment dependency before deleting the assessment", async () => {
  const mutation = await readFile(assessmentMutationUrl, "utf8");
  const assessmentDelete = mutation.indexOf("avaliacao_delete(");
  const dependencies = [
    "digitalizacaoFolha_deleteMany(",
    "respostaAluno_deleteMany(",
    "envioDevolutiva_deleteMany(",
    "folhaResposta_deleteMany(",
    "modeloFolhaResposta_deleteMany(",
    "questao_deleteMany(",
  ];

  assert.ok(assessmentDelete > -1);
  for (const dependency of dependencies) {
    const dependencyDelete = mutation.indexOf(dependency);
    assert.ok(dependencyDelete > -1, `${dependency} is missing`);
    assert.ok(dependencyDelete < assessmentDelete, `${dependency} must run first`);
  }
});

test("deletes question responses before deleting the question", async () => {
  const mutation = await readFile(questionMutationUrl, "utf8");
  const responseDelete = mutation.indexOf("respostaAluno_deleteMany(");
  const questionDelete = mutation.indexOf("questao_delete(");

  assert.ok(responseDelete > -1);
  assert.ok(questionDelete > -1);
  assert.ok(responseDelete < questionDelete);
});
