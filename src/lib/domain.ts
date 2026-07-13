import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { AnswerSheetLayout, AnswerSheetOrientation } from "@/lib/answer-sheet-layout";

export type TipoQuestao = "mc" | "ce" | "num";
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
}

export interface Avaliacao {
  id: string;
  titulo: string;
  disciplina: string | null;
  turma_id: string | null;
  data_aplicacao: string | null;
  valor_total: number;
  instrucoes: string | null;
  status: StatusAvaliacao;
  created_at: string;
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
  anulada: boolean;
  conteudo: string | null;
}

export interface Resposta {
  id: string;
  aluno_id: string;
  questao_id: string;
  resposta: string | null;
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

// ---------- Fetchers ----------
export async function listTurmas(): Promise<Turma[]> {
  const { data, error } = await supabase.from("turmas").select("*").order("nome");
  if (error) throw error;
  return data as Turma[];
}

export async function listAlunosByTurma(turmaId: string): Promise<Aluno[]> {
  const { data, error } = await supabase
    .from("alunos")
    .select("*")
    .eq("turma_id", turmaId)
    .order("chamada", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return data as Aluno[];
}

export async function listAvaliacoes(): Promise<Avaliacao[]> {
  const { data, error } = await supabase
    .from("avaliacoes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Avaliacao[];
}

export async function getAvaliacao(id: string): Promise<Avaliacao> {
  const { data, error } = await supabase.from("avaliacoes").select("*").eq("id", id).single();
  if (error) throw error;
  return data as Avaliacao;
}

export async function listQuestoes(avaliacaoId: string): Promise<Questao[]> {
  const { data, error } = await supabase
    .from("questoes")
    .select("*")
    .eq("avaliacao_id", avaliacaoId)
    .order("numero");
  if (error) throw error;
  return data as Questao[];
}

export async function listRespostasByAvaliacao(avaliacaoId: string): Promise<Resposta[]> {
  const { data, error } = await supabase
    .from("respostas_alunos")
    .select("*")
    .eq("avaliacao_id", avaliacaoId);
  if (error) throw error;
  return data as Resposta[];
}

export async function getLatestAnswerSheetModel(
  avaliacaoId: string,
): Promise<ModeloFolhaResposta | null> {
  const { data, error } = await supabase
    .from("modelos_folha_respostas")
    .select("*")
    .eq("avaliacao_id", avaliacaoId)
    .order("versao", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as ModeloFolhaResposta | null;
}

export async function createOrGetAnswerSheet({
  avaliacao,
  questoes,
  alunoId,
  layout,
}: {
  avaliacao: Avaliacao;
  questoes: Questao[];
  alunoId?: string;
  layout: AnswerSheetLayout;
}): Promise<IdentificacaoFolhaResposta> {
  const snapshot: Json = {
    schemaVersion: 1,
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
      anulada: questao.anulada,
      conteudo: questao.conteudo,
    })),
  };
  const { data, error } = await supabase.rpc("criar_ou_obter_folha_respostas", {
    p_avaliacao_id: avaliacao.id,
    p_aluno_id: alunoId ?? null,
    p_colunas: layout.columns,
    p_linhas_por_coluna: layout.rowsPerColumn,
    p_orientacao: layout.orientation,
    p_snapshot: snapshot,
  });
  if (error) throw error;
  const result = data?.[0];
  if (!result) throw new Error("Não foi possível identificar a folha de respostas.");
  return {
    modeloId: result.modelo_id,
    versao: result.versao,
    folhaId: result.folha_id,
    codigo: result.codigo,
    qrPayload: result.qr_payload,
  };
}

// ---------- Scoring ----------
export type Situacao = "correta" | "incorreta" | "branco" | "anulada";

export function corrigirQuestao(
  q: Questao,
  resposta: string | null | undefined,
): { situacao: Situacao; pontos: number } {
  if (q.anulada) return { situacao: "anulada", pontos: Number(q.valor) };
  const r = (resposta ?? "").trim();
  if (!r) return { situacao: "branco", pontos: 0 };
  const gab = (q.gabarito ?? "").trim().toUpperCase();
  const ans = r.toUpperCase();
  if (!gab) return { situacao: "incorreta", pontos: 0 };
  return ans === gab
    ? { situacao: "correta", pontos: Number(q.valor) }
    : { situacao: "incorreta", pontos: 0 };
}

export function calcularNotaAluno(
  questoes: Questao[],
  respostas: Resposta[],
): { nota: number; acertos: number; erros: number; branco: number; anuladas: number } {
  const byQ = new Map(respostas.map((r) => [r.questao_id, r.resposta]));
  let nota = 0,
    acertos = 0,
    erros = 0,
    branco = 0,
    anuladas = 0;
  for (const q of questoes) {
    const { situacao, pontos } = corrigirQuestao(q, byQ.get(q.id));
    nota += pontos;
    if (situacao === "correta") acertos++;
    else if (situacao === "incorreta") erros++;
    else if (situacao === "branco") branco++;
    else if (situacao === "anulada") anuladas++;
  }
  return { nota: Math.round(nota * 100) / 100, acertos, erros, branco, anuladas };
}

// ---------- Formatting helpers ----------
export function alternativas(q: Questao): string[] {
  if (q.tipo === "mc") {
    const n = q.qtd_alternativas ?? 5;
    return ["A", "B", "C", "D", "E", "F", "G"].slice(0, n);
  }
  if (q.tipo === "ce") return ["C", "E"];
  return [];
}
