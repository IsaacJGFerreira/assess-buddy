import assert from "node:assert/strict";
import test from "node:test";

import {
  determineIdentifierDigits,
  formatMatriculaForSheet,
  normalizeNumericMatricula,
  resolveMatriculaReading,
} from "@/lib/answer-sheet-identification";
import type { Aluno } from "@/lib/domain";

const students: Aluno[] = [
  {
    id: "student-1",
    turma_id: "class-1",
    nome: "Ana",
    matricula: "00123",
    chamada: 1,
  },
  {
    id: "student-2",
    turma_id: "class-1",
    nome: "Bruno",
    matricula: "4567",
    chamada: 2,
  },
];

test("normalizes numeric school identifiers without accepting letters", () => {
  assert.equal(normalizeNumericMatricula("00.123-4"), "001234");
  assert.equal(normalizeNumericMatricula("AB-123"), null);
  assert.equal(formatMatriculaForSheet("123", 5), "00123");
  assert.equal(determineIdentifierDigits(students), 5);
});

test("links a confident matrícula to exactly one student", () => {
  const resolution = resolveMatriculaReading(
    { value: "00123", status: "confident", requiresReview: false },
    students,
    5,
  );

  assert.equal(resolution.status, "linked");
  assert.equal(resolution.studentId, "student-1");
  assert.equal(resolution.studentName, "Ana");
});

test("keeps an unknown matrícula unlinked", () => {
  const resolution = resolveMatriculaReading(
    { value: "99999", status: "confident", requiresReview: false },
    students,
    5,
  );

  assert.equal(resolution.status, "not_found");
  assert.equal(resolution.studentId, null);
});

test("flags ambiguous and duplicate matrícula matches as inconsistent", () => {
  const ambiguous = resolveMatriculaReading(
    { value: "00123", status: "ambiguous", requiresReview: true },
    students,
    5,
  );
  const duplicate = resolveMatriculaReading(
    { value: "00123", status: "confident", requiresReview: false },
    [...students, { ...students[0], id: "student-3", nome: "Carla" }],
    5,
  );

  assert.equal(ambiguous.status, "inconsistent");
  assert.equal(duplicate.status, "inconsistent");
  assert.deepEqual(duplicate.matchingStudentIds, ["student-1", "student-3"]);
});
