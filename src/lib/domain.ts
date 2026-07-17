import type { AnswerSheetIdentificationMode } from "@/lib/answer-sheet-identification";
import type { AnswerSheetLayout, AnswerSheetOrientation } from "@/lib/answer-sheet-layout";
import {
  excluirTurmaFirebase,
  listarAlunosFirebase,
  listarTurmasFirebase,
} from "@/integrations/firebase/academic-data";
import {
  atualizarAvaliacaoRuntime,
  atualizarQuestaoRuntime,
  criarAvaliacaoRuntime,
  criarQuestoesRuntime,
  excluirAvaliacaoRuntime,
  excluirQuestaoRuntime,
  listarAvaliacoesRuntime,
  listarQuestoesRuntime,
  listarRespostasRuntime,
  obterAvaliacaoRuntime,
  reordenarQuestoesRuntime,
  salvarRespostaRuntime,
  type RuntimeAvaliacao,
  type RuntimeQuestao,
  type RuntimeResposta,
} from "@/integrations/firebase/runtime-data";
import {
  criarOuObterFolhaFirebase,
  listarModelosFolhaFirebase,
} from "@/integrations/firebase/sheet-data";
import {
  confirmarLeituraDigitalizacaoFirebase,
  downloadDigitalizacaoFirebase,
  excluirDigitalizacaoFirebase,
  listarDigitalizacoesFirebase,
  obterDigitalizacaoFirebase,
  salvarLeituraDigitalizacaoFirebase,
  uploadDigitalizacaoFirebase,
} from "@/integrations/firebase/scan-data";

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type TipoQuestao = "mc" | "ce" | "num" | "disc";
export type StatusAvaliacao =
  | "elaboracao"
  | "pronta"
  | "aplicada"
  | "em_correcao"
  | "corrigida"
  | "devolvida";

export const STATUS_LABEL: Record<StatusAvaliacao, string> = {
  elaboracao: "Em elaboração",
  pronta: "Pronta para impressão",
  aplicada: "Aplicada",
  em_correcao: "Em correção",
  corrigida: "Corrigida",
  devolvida: "Devolvida",
};

export const TIPO_LABEL: Record<TipoQuestao, string> = {
  mc: "Múltipla escolha",
  ce: "Certo/Errado",
  num: "Numérica",
  disc: "Discursiva",
};

export interface Turma {
  id: string;
  nome: string;
  serie: string | null;
  ano: number | null;
}

export interface Aluno {
  id: string;
  turma_id: string;
  nome: string;
  matricula: string | null;
  chamada: number | null;
  email?: string | null;
}

export interface Avaliacao {
  id: string;
  titulo: string;
  disciplina: string | null;
  turma_id: string | null;
  data_aplicacao: string | null;
  valor_total: number;
  instrucoes: string | null;
  comentario_devolutiva?: string | null;
  status: StatusAvaliacao;
  created_at: string;
  updated_at?: string;
}

export interface Questao {
  id: string;
  avaliacao_id: string;
  numero: number;
  tipo: TipoQuestao;
  qtd_alternativas: number | null;
  num_digitos: number | null;
  gabarito: string | null;
  valor: number;
  desconto_erro: number;
  anulada: boolean;
  conteudo: string | null;
  orientacao_correcao?: string | null;
  resposta_modelo?: string | null;
  resposta_modelo_imagem_path?: string | null;
}

export interface Resposta {
  id: string;
  avaliacao_id?: string;
  aluno_id: string;
  questao_id: string;
  resposta: string | null;
  nota_manual?: number | null;
  feedback?: string | null;
}

export interface ModeloFolhaResposta {
  id: string;
  avaliacao_id: string;
  versao: number;
  colunas: number;
  linhas_por_coluna: number;
  orientacao: AnswerSheetOrientation;
  snapshot: Json;
  created_at: string;
}

export interface IdentificacaoFolhaResposta {
  modeloId: string;
  versao: number;
  folhaId: string;
  codigo: string;
  qrPayload: string;
}

export interface DigitalizacaoFolha {
  id: string;
  owner_id: string;
  avaliacao_id: string;
  folha_id: string | null;
  aluno_id: string | null;
  arquivo_original: string;
  mime_original: "image/jpeg" | "image/png" | "application/pdf";
  pagina_origem: number;
  rotacao: number;
  recorte: Json;
  storage_path: string;
  largura_px: number;
  altura_px: number;
  tamanho_bytes: number;
  modelo_id: string | null;
  pagina_modelo: number | null;
  resultado_leitura: Json | null;
  confianca_leitura: number | null;
  processado_at: string | null;
  status: "preparada" | "identificada" | "revisao" | "processada" | "erro";
  created_at: string;
  updated_at: string;
}

export interface UploadDigitalizacaoFolhaInput {
  avaliacaoId: string;
  arquivoOriginal: string;
  mimeOriginal: DigitalizacaoFolha["mime_original"];
  paginaOrigem: number;
  rotacao: number;
  recorte: Json;
  imagem: Blob;
  larguraPx: number;
  alturaPx: number;
}

export interface CriarAvaliacaoInput {
  titulo: string;
  disciplina?: string | null;
  turmaId?: string | null;
  dataAplicacao?: string | null;
  valorTotal?: number;
  instrucoes?: string | null;
  status?: StatusAvaliacao;
}

export interface CriarQuestaoInput {
  numero: number;
  tipo: TipoQuestao;
  qtd_alternativas?: number | null;
  num_digitos?: number | null;
  gabarito?: string | null;
  valor?: number;
  desconto_erro?: number;
  anulada?: boolean;
  conteudo?: string | null;
}

export function isAnswerSheetPersistenceUnavailable(_error: unknown): boolean {
  return false;
}

export async function listTurmas(): Promise<Turma[]> {
  const turmas = await listarTurmasFirebase();
  return turmas.map((turma) => ({
    id: turma.id,
    nome: turma.nome,
    serie: turma.serie,
    ano: turma.ano,
  }));
}

export async function listAlunosByTurma(turmaId: string): Promise<Aluno[]> {
  const alunos = await listarAlunosFirebase(turmaId);
  return alunos.map((aluno) => ({
    id: aluno.id,
    turma_id: aluno.turmaId,
    nome: aluno.nome,
    matricula: aluno.matricula,
    chamada: aluno.chamada,
    email: aluno.email,
  }));
}

export async function deleteTurma(turmaId: string): Promise<void> {
  await excluirTurmaFirebase(turmaId);
}

export async function listAvaliacoes(): Promise<Avaliacao[]> {
  const avaliacoes = await listarAvaliacoesRuntime();
  return avaliacoes.map(mapAvaliacao).sort((a, b) =>
    b.created_at.localeCompare(a.created_at),
  );
}

export async function createAvaliacao(input: CriarAvaliacaoInput): Promise<Avaliacao> {
  return mapAvaliacao(
    await criarAvaliacaoRuntime({
      turmaId: input.turmaId ?? null,
      titulo: input.titulo,
      disciplina: input.disciplina ?? null,
      dataAplicacao: input.dataAplicacao ?? null,
      valorTotal: input.valorTotal ?? 10,
      instrucoes: input.instrucoes ?? null,
      comentarioDevolutiva: null,
      status: input.status ?? "elaboracao",
    }),
  );
}

export async function updateAvaliacao(
  avaliacao: Avaliacao,
  patch: Partial<Avaliacao>,
): Promise<Avaliacao> {
  const merged = { ...avaliacao, ...patch };
  return mapAvaliacao(
    await atualizarAvaliacaoRuntime({
      id: merged.id,
      turmaId: merged.turma_id,
      titulo: merged.titulo,
      disciplina: merged.disciplina,
      dataAplicacao: merged.data_aplicacao,
      valorTotal: Number(merged.valor_total),
      instrucoes: merged.instrucoes,
      comentarioDevolutiva: merged.comentario_devolutiva ?? null,
      status: merged.status,
    }),
  );
}

export async function deleteAvaliacao(
  avaliacaoId: string,
): Promise<{ storageCleanupFailed: boolean }> {
  const scans = await listarDigitalizacoesFirebase(avaliacaoId);
  let storageCleanupFailed = false;

  for (const scan of scans) {
    try {
      const result = await excluirDigitalizacaoFirebase(scan.id);
      storageCleanupFailed ||= result.storageCleanupFailed;
    } catch {
      storageCleanupFailed = true;
    }
  }

  await excluirAvaliacaoRuntime(avaliacaoId);
  return { storageCleanupFailed };
}

export async function getAvaliacao(id: string): Promise<Avaliacao> {
  const avaliacao = await obterAvaliacaoRuntime(id);
  if (!avaliacao) throw new Error("Avaliação não encontrada.");
  return mapAvaliacao(avaliacao);
}

export async function listQuestoes(avaliacaoId: string): Promise<Questao[]> {
  const questoes = await listarQuestoesRuntime(avaliacaoId);
  return questoes.map(mapQuestao).sort((a, b) => a.numero - b.numero);
}

export async function createQuestoes(
  avaliacaoId: string,
  inputs: CriarQuestaoInput[],
): Promise<Questao[]> {
  const created = await criarQuestoesRuntime(
    inputs.map((input) => ({
      avaliacaoId,
      numero: input.numero,
      tipo: input.tipo,
      qtdAlternativas:
        input.qtd_alternativas ?? (input.tipo === "mc" ? 5 : input.tipo === "ce" ? 2 : null),
      numDigitos: input.num_digitos ?? (input.tipo === "num" ? 3 : null),
      gabarito: input.gabarito ?? null,
      valor: input.valor ?? 1,
      descontoErro: input.desconto_erro ?? 0,
      anulada: input.anulada ?? false,
      conteudo: input.conteudo ?? null,
      orientacaoCorrecao: null,
      respostaModelo: null,
      respostaModeloImagemPath: null,
    })),
  );
  return created.map(mapQuestao);
}

export async function updateQuestao(
  questao: Questao,
  patch: Partial<Questao>,
): Promise<Questao> {
  const merged = { ...questao, ...patch };
  return mapQuestao(
    await atualizarQuestaoRuntime({
      id: merged.id,
      numero: merged.numero,
      tipo: merged.tipo,
      qtdAlternativas: merged.qtd_alternativas,
      numDigitos: merged.num_digitos,
      gabarito: merged.gabarito,
      valor: Number(merged.valor),
      descontoErro: Number(merged.desconto_erro),
      anulada: merged.anulada,
      conteudo: merged.conteudo,
      orientacaoCorrecao: merged.orientacao_correcao ?? null,
      respostaModelo: merged.resposta_modelo ?? null,
      respostaModeloImagemPath: merged.resposta_modelo_imagem_path ?? null,
    }),
  );
}

export async function duplicateQuestao(questao: Questao, numero: number): Promise<Questao> {
  const [created] = await createQuestoes(questao.avaliacao_id, [
    {
      numero,
      tipo: questao.tipo,
      qtd_alternativas: questao.qtd_alternativas,
      num_digitos: questao.num_digitos,
      gabarito: questao.gabarito,
      valor: questao.valor,
      desconto_erro: questao.desconto_erro,
      anulada: questao.anulada,
      conteudo: questao.conteudo,
    },
  ]);
  return created;
}

export async function deleteQuestao(id: string): Promise<void> {
  await excluirQuestaoRuntime(id);
}

export async function moveQuestao(
  questoes: Questao[],
  questaoId: string,
  novaPosicao: number,
): Promise<Questao[]> {
  const reordered = await reordenarQuestoesRuntime(
    questoes.map(toRuntimeQuestao),
    questaoId,
    novaPosicao,
  );
  return reordered.map(mapQuestao);
}

export async function listRespostasByAvaliacao(avaliacaoId: string): Promise<Resposta[]> {
  return (await listarRespostasRuntime(avaliacaoId)).map(mapResposta);
}

export async function saveResposta(input: {
  avaliacaoId: string;
  turmaId: string;
  alunoId: string;
  questaoId: string;
  resposta?: string | null;
  notaManual?: number | null;
  feedback?: string | null;
}): Promise<Resposta> {
  return mapResposta(
    await salvarRespostaRuntime({
      avaliacaoId: input.avaliacaoId,
      turmaId: input.turmaId,
      alunoId: input.alunoId,
      questaoId: input.questaoId,
      resposta: input.resposta,
      notaManual: input.notaManual,
      feedback: input.feedback,
    }),
  );
}

export async function getLatestAnswerSheetModel(
  avaliacaoId: string,
): Promise<ModeloFolhaResposta | null> {
  return (await listAnswerSheetModels(avaliacaoId))[0] ?? null;
}

export async function listAnswerSheetModels(
  avaliacaoId: string,
): Promise<ModeloFolhaResposta[]> {
  return (await listarModelosFolhaFirebase(avaliacaoId))
    .map(mapModelo)
    .sort((left, right) => right.versao - left.versao);
}

export async function createOrGetAnswerSheet({
  avaliacao,
  questoes,
  alunoId,
  layout,
  identificationMode = "none",
  identifierDigits = 6,
}: {
  avaliacao: Avaliacao;
  questoes: Questao[];
  alunoId?: string;
  layout: AnswerSheetLayout;
  identificationMode?: AnswerSheetIdentificationMode;
  identifierDigits?: number;
}): Promise<IdentificacaoFolhaResposta> {
  const snapshot = {
    schemaVersion: 2,
    identificacao: { modo: identificationMode, digitos: identifierDigits },
    avaliacao: {
      id: avaliacao.id,
      titulo: avaliacao.titulo,
      disciplina: avaliacao.disciplina,
      turmaId: avaliacao.turma_id,
      dataAplicacao: avaliacao.data_aplicacao,
      valorTotal: Number(avaliacao.valor_total),
      instrucoes: avaliacao.instrucoes,
    },
    questoes: questoes.map((questao) => ({
      id: questao.id,
      numero: questao.numero,
      tipo: questao.tipo,
      qtdAlternativas: questao.qtd_alternativas,
      numDigitos: questao.num_digitos,
      gabarito: questao.gabarito,
      valor: Number(questao.valor),
      descontoErro: Number(questao.desconto_erro),
      anulada: questao.anulada,
      conteudo: questao.conteudo,
    })),
  };

  return criarOuObterFolhaFirebase({
    avaliacaoId: avaliacao.id,
    turmaId: avaliacao.turma_id,
    alunoId: alunoId ?? null,
    colunas: layout.columns,
    linhasPorColuna: layout.rowsPerColumn,
    orientacao: layout.orientation,
    snapshot,
  });
}

export async function listAnswerSheetScans(
  avaliacaoId: string,
): Promise<DigitalizacaoFolha[]> {
  return (await listarDigitalizacoesFirebase(avaliacaoId)).map(mapDigitalizacao);
}

export async function uploadAnswerSheetScan(
  input: UploadDigitalizacaoFolhaInput,
): Promise<DigitalizacaoFolha> {
  return mapDigitalizacao(
    await uploadDigitalizacaoFirebase({
      avaliacaoId: input.avaliacaoId,
      arquivoOriginal: input.arquivoOriginal,
      mimeOriginal: input.mimeOriginal,
      paginaOrigem: input.paginaOrigem,
      rotacao: input.rotacao,
      recorte: input.recorte,
      imagem: input.imagem,
      larguraPx: input.larguraPx,
      alturaPx: input.alturaPx,
    }),
  );
}

export async function deleteAnswerSheetScan(
  scan: Pick<DigitalizacaoFolha, "id" | "storage_path">,
): Promise<void> {
  const result = await excluirDigitalizacaoFirebase(scan.id);
  if (result.storageCleanupFailed) {
    throw new Error("O registro foi apagado, mas o arquivo não pôde ser removido.");
  }
}

export async function downloadAnswerSheetScan(
  scan: Pick<DigitalizacaoFolha, "id" | "storage_path">,
): Promise<Blob> {
  return downloadDigitalizacaoFirebase(scan.id);
}

export async function saveAnswerSheetScanReading({
  scanId,
  alunoId,
  modeloId,
  pagina,
  resultado,
  confianca,
}: {
  scanId: string;
  alunoId?: string | null;
  modeloId: string;
  pagina: number;
  resultado: Json;
  confianca: number;
}): Promise<void> {
  const scan = await obterDigitalizacaoFirebase(scanId);
  if (!scan) throw new Error("Digitalização não encontrada.");
  const avaliacao = await getAvaliacao(scan.avaliacaoId);
  await salvarLeituraDigitalizacaoFirebase({
    digitalizacaoId: scanId,
    avaliacaoId: scan.avaliacaoId,
    turmaId: avaliacao.turma_id,
    alunoId,
    modeloId,
    paginaModelo: pagina,
    resultado,
    confianca,
  });
}

export async function confirmAnswerSheetScanReading({
  scanId,
  alunoId,
  modeloId,
  pagina,
  resultado,
}: {
  scanId: string;
  alunoId?: string | null;
  modeloId: string;
  pagina: number;
  resultado: Json;
}): Promise<void> {
  const scan = await obterDigitalizacaoFirebase(scanId);
  if (!scan) throw new Error("Digitalização não encontrada.");
  const avaliacao = await getAvaliacao(scan.avaliacaoId);
  await confirmarLeituraDigitalizacaoFirebase({
    digitalizacaoId: scanId,
    avaliacaoId: scan.avaliacaoId,
    turmaId: avaliacao.turma_id,
    alunoId,
    modeloId,
    paginaModelo: pagina,
    resultado,
  });
}

export type Situacao = "correta" | "incorreta" | "branco" | "anulada";

export function corrigirQuestao(
  q: Questao,
  resposta: string | null | undefined,
): { situacao: Situacao; pontos: number } {
  if (q.anulada) return { situacao: "anulada", pontos: Number(q.valor) };
  if (q.tipo === "disc") return { situacao: "branco", pontos: 0 };
  const r = (resposta ?? "").trim();
  if (!r) return { situacao: "branco", pontos: 0 };
  const gab = (q.gabarito ?? "").trim().toUpperCase();
  const ans = r.toUpperCase();
  if (!gab) return { situacao: "incorreta", pontos: 0 };
  return ans === gab
    ? { situacao: "correta", pontos: Number(q.valor) }
    : { situacao: "incorreta", pontos: -Number(q.desconto_erro ?? 0) };
}

export function calcularNotaAluno(
  questoes: Questao[],
  respostas: Resposta[],
): { nota: number; acertos: number; erros: number; branco: number; anuladas: number } {
  const byQ = new Map(respostas.map((r) => [r.questao_id, r.resposta]));
  let nota = 0;
  let acertos = 0;
  let erros = 0;
  let branco = 0;
  let anuladas = 0;

  for (const q of questoes) {
    const { situacao, pontos } = corrigirQuestao(q, byQ.get(q.id));
    nota += pontos;
    if (situacao === "correta") acertos += 1;
    else if (situacao === "incorreta") erros += 1;
    else if (situacao === "branco") branco += 1;
    else anuladas += 1;
  }

  return {
    nota: Math.round(nota * 100) / 100,
    acertos,
    erros,
    branco,
    anuladas,
  };
}

export { alternativas } from "@/lib/question-options";

function mapAvaliacao(value: RuntimeAvaliacao): Avaliacao {
  return {
    id: value.id,
    titulo: value.titulo,
    disciplina: value.disciplina,
    turma_id: value.turmaId,
    data_aplicacao: value.dataAplicacao,
    valor_total: value.valorTotal,
    instrucoes: value.instrucoes,
    comentario_devolutiva: value.comentarioDevolutiva,
    status: value.status,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  };
}

function mapQuestao(value: RuntimeQuestao): Questao {
  return {
    id: value.id,
    avaliacao_id: value.avaliacaoId,
    numero: value.numero,
    tipo: value.tipo,
    qtd_alternativas: value.qtdAlternativas,
    num_digitos: value.numDigitos,
    gabarito: value.gabarito,
    valor: value.valor,
    desconto_erro: value.descontoErro,
    anulada: value.anulada,
    conteudo: value.conteudo,
    orientacao_correcao: value.orientacaoCorrecao,
    resposta_modelo: value.respostaModelo,
    resposta_modelo_imagem_path: value.respostaModeloImagemPath,
  };
}

function toRuntimeQuestao(value: Questao): RuntimeQuestao {
  return {
    id: value.id,
    avaliacaoId: value.avaliacao_id,
    numero: value.numero,
    tipo: value.tipo,
    qtdAlternativas: value.qtd_alternativas,
    numDigitos: value.num_digitos,
    gabarito: value.gabarito,
    valor: value.valor,
    descontoErro: value.desconto_erro,
    anulada: value.anulada,
    conteudo: value.conteudo,
    orientacaoCorrecao: value.orientacao_correcao ?? null,
    respostaModelo: value.resposta_modelo ?? null,
    respostaModeloImagemPath: value.resposta_modelo_imagem_path ?? null,
    createdAt: "",
    updatedAt: "",
  };
}

function mapResposta(value: RuntimeResposta): Resposta {
  return {
    id: value.id,
    avaliacao_id: value.avaliacaoId,
    aluno_id: value.alunoId,
    questao_id: value.questaoId,
    resposta: value.resposta,
    nota_manual: value.notaManual,
    feedback: value.feedback,
  };
}

function mapModelo(value: {
  id: string;
  avaliacaoId: string;
  versao: number;
  colunas: number;
  linhasPorColuna: number;
  orientacao: AnswerSheetOrientation;
  snapshot: unknown;
  createdAt: string;
}): ModeloFolhaResposta {
  return {
    id: value.id,
    avaliacao_id: value.avaliacaoId,
    versao: value.versao,
    colunas: value.colunas,
    linhas_por_coluna: value.linhasPorColuna,
    orientacao: value.orientacao,
    snapshot: value.snapshot as Json,
    created_at: value.createdAt,
  };
}

function mapDigitalizacao(value: {
  id: string;
  avaliacaoId: string;
  folhaId: string | null;
  modeloId: string | null;
  alunoId: string | null;
  arquivoOriginal: string;
  mimeOriginal: DigitalizacaoFolha["mime_original"];
  paginaOrigem: number;
  paginaModelo: number | null;
  rotacao: number;
  recorte: unknown;
  storagePath: string;
  larguraPx: number;
  alturaPx: number;
  tamanhoBytes: number;
  resultadoLeitura: unknown | null;
  confiancaLeitura: number | null;
  status: DigitalizacaoFolha["status"];
  processadoAt: string | null;
  createdAt: string;
  updatedAt: string;
}): DigitalizacaoFolha {
  return {
    id: value.id,
    owner_id: "",
    avaliacao_id: value.avaliacaoId,
    folha_id: value.folhaId,
    aluno_id: value.alunoId,
    arquivo_original: value.arquivoOriginal,
    mime_original: value.mimeOriginal,
    pagina_origem: value.paginaOrigem,
    rotacao: value.rotacao,
    recorte: value.recorte as Json,
    storage_path: value.storagePath,
    largura_px: value.larguraPx,
    altura_px: value.alturaPx,
    tamanho_bytes: value.tamanhoBytes,
    modelo_id: value.modeloId,
    pagina_modelo: value.paginaModelo,
    resultado_leitura: value.resultadoLeitura as Json | null,
    confianca_leitura: value.confiancaLeitura,
    processado_at: value.processadoAt,
    status: value.status,
    created_at: value.createdAt,
    updated_at: value.updatedAt,
  };
}
