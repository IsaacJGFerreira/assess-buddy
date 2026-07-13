import { supabase } from "@/integrations/supabase/client";

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

export async function listRespostasByAvaliacao(
  avaliacaoId: string,
): Promise<Resposta[]> {
  const { data, error } = await supabase
    .from("respostas_alunos")
    .select("*")
    .eq("avaliacao_id", avaliacaoId);
  if (error) throw error;
  return data as Resposta[];
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
    return ["A", "B", "C", "D", "E", "F"].slice(0, n);
  }
  if (q.tipo === "ce") return ["C", "E"];
  return [];
}