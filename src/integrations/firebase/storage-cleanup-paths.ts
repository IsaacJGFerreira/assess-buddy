export function assessmentStoragePrefixes(ownerUid: string, assessmentId: string): string[] {
  const owner = requiredPathPart(ownerUid, "Usuário inválido.");
  const assessment = requiredPathPart(assessmentId, "Avaliação inválida.");
  return [
    `usuarios/${owner}/digitalizacoes/${assessment}`,
    `usuarios/${owner}/imagens-modelo/${assessment}`,
  ];
}

export function questionStoragePrefix(
  ownerUid: string,
  assessmentId: string,
  questionId: string,
): string {
  const owner = requiredPathPart(ownerUid, "Usuário inválido.");
  const assessment = requiredPathPart(assessmentId, "Avaliação inválida.");
  const question = requiredPathPart(questionId, "Questão inválida.");
  return `usuarios/${owner}/imagens-modelo/${assessment}/${question}`;
}

function requiredPathPart(value: string, errorMessage: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.includes("/") || normalized === "." || normalized === "..") {
    throw new Error(errorMessage);
  }
  return normalized;
}
