import assert from "node:assert/strict";
import test from "node:test";

import { createAndVerifyServerRecord } from "./sync-verification";

test("confirma a gravacao somente depois de reler o mesmo ID do servidor", async () => {
  const calls: string[] = [];
  const result = await createAndVerifyServerRecord(
    { nome: "Turma Android" },
    {
      create: async (draft) => {
        calls.push(`create:${draft.nome}`);
        return { id: "turma-1", nome: draft.nome };
      },
      listFromServer: async () => {
        calls.push("list");
        return [{ id: "turma-1", nome: "Turma Android" }];
      },
    },
  );

  assert.deepEqual(calls, ["create:Turma Android", "list"]);
  assert.equal(result.created.id, "turma-1");
  assert.equal(result.serverRecords.length, 1);
});

test("nao anuncia sincronizacao quando a releitura nao contem o registro", async () => {
  await assert.rejects(
    createAndVerifyServerRecord(
      { nome: "Turma Android" },
      {
        create: async () => ({ id: "turma-2" }),
        listFromServer: async () => [],
      },
    ),
    /ainda não apareceu na releitura do servidor/,
  );
});
