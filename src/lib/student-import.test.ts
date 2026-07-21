import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeStudentCsvRows, validateStudentFields } from "./student-import";

describe("student import", () => {
  it("normaliza cabeçalhos aceitos pela web e pelo Android", () => {
    assert.deepEqual(
      normalizeStudentCsvRows(
        [
          { Nome: " Ana ", MATRICULA: "001", Email: "ANA@EXAMPLE.COM" },
          { nome: "Bia", matricula: "2", email: "" },
        ],
        "t1",
      ),
      [
        { turmaId: "t1", nome: "Ana", matricula: "001", email: "ana@example.com" },
        { turmaId: "t1", nome: "Bia", matricula: "2", email: null },
      ],
    );
  });

  it("rejeita matrícula não numérica e e-mail inválido", () => {
    assert.throws(
      () => normalizeStudentCsvRows([{ nome: "Ana", matricula: "A1" }], "t1"),
      /Matrícula inválida/,
    );
    assert.throws(
      () => validateStudentFields({ nome: "Ana", matricula: "1", email: "invalido" }),
      /e-mail válido/,
    );
  });
});
