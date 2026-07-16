import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, ExecuteQueryOptions, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;


export enum OrientacaoFolha {
  RETRATO = "RETRATO",
  PAISAGEM = "PAISAGEM",
};

export enum StatusAvaliacao {
  ELABORACAO = "ELABORACAO",
  PRONTA = "PRONTA",
  APLICADA = "APLICADA",
  EM_CORRECAO = "EM_CORRECAO",
  CORRIGIDA = "CORRIGIDA",
  DEVOLVIDA = "DEVOLVIDA",
};

export enum StatusDigitalizacao {
  PREPARADA = "PREPARADA",
  IDENTIFICADA = "IDENTIFICADA",
  REVISAO = "REVISAO",
  PROCESSADA = "PROCESSADA",
  ERRO = "ERRO",
};

export enum TipoQuestao {
  MULTIPLA_ESCOLHA = "MULTIPLA_ESCOLHA",
  CERTO_ERRADO = "CERTO_ERRADO",
  NUMERICA = "NUMERICA",
  DISCURSIVA = "DISCURSIVA",
};



export interface Aluno_Key {
  id: UUIDString;
  __typename?: 'Aluno_Key';
}

export interface AtualizarAlunoData {
  aluno_update?: Aluno_Key | null;
}

export interface AtualizarAlunoVariables {
  id: UUIDString;
  turmaId: UUIDString;
  nome: string;
  matricula?: string | null;
  chamada?: number | null;
  email?: string | null;
}

export interface AtualizarAvaliacaoComTurmaData {
  avaliacao_update?: Avaliacao_Key | null;
}

export interface AtualizarAvaliacaoComTurmaVariables {
  id: UUIDString;
  turmaId: UUIDString;
  titulo: string;
  disciplina?: string | null;
  dataAplicacao?: DateString | null;
  valorTotal: number;
  instrucoes?: string | null;
  comentarioDevolutiva?: string | null;
  status: StatusAvaliacao;
}

export interface AtualizarAvaliacaoSemTurmaData {
  avaliacao_update?: Avaliacao_Key | null;
}

export interface AtualizarAvaliacaoSemTurmaVariables {
  id: UUIDString;
  titulo: string;
  disciplina?: string | null;
  dataAplicacao?: DateString | null;
  valorTotal: number;
  instrucoes?: string | null;
  comentarioDevolutiva?: string | null;
  status: StatusAvaliacao;
}

export interface AtualizarLeituraDigitalizacaoComAlunoData {
  digitalizacaoFolha_update?: DigitalizacaoFolha_Key | null;
}

export interface AtualizarLeituraDigitalizacaoComAlunoVariables {
  id: UUIDString;
  avaliacaoId: UUIDString;
  turmaId: UUIDString;
  alunoId: UUIDString;
  modeloId: UUIDString;
  paginaModelo: number;
  resultadoLeitura: unknown;
  confiancaLeitura?: number | null;
  status: StatusDigitalizacao;
  processadoAt?: TimestampString | null;
}

export interface AtualizarLeituraDigitalizacaoSemAlunoData {
  digitalizacaoFolha_update?: DigitalizacaoFolha_Key | null;
}

export interface AtualizarLeituraDigitalizacaoSemAlunoVariables {
  id: UUIDString;
  avaliacaoId: UUIDString;
  modeloId: UUIDString;
  paginaModelo: number;
  resultadoLeitura: unknown;
  confiancaLeitura?: number | null;
  status: StatusDigitalizacao;
  processadoAt?: TimestampString | null;
}

export interface AtualizarQuestaoData {
  questao_update?: Questao_Key | null;
}

export interface AtualizarQuestaoVariables {
  id: UUIDString;
  numero: number;
  tipo: TipoQuestao;
  qtdAlternativas?: number | null;
  numDigitos?: number | null;
  gabarito?: string | null;
  valor: number;
  descontoErro: number;
  anulada: boolean;
  conteudo?: string | null;
  orientacaoCorrecao?: string | null;
  respostaModelo?: string | null;
  respostaModeloImagemPath?: string | null;
}

export interface AtualizarRespostaAlunoData {
  respostaAluno_update?: RespostaAluno_Key | null;
}

export interface AtualizarRespostaAlunoVariables {
  id: UUIDString;
  resposta?: string | null;
  notaManual?: number | null;
  feedback?: string | null;
}

export interface AtualizarTurmaData {
  turma_update?: Turma_Key | null;
}

export interface AtualizarTurmaVariables {
  id: UUIDString;
  nome: string;
  serie?: string | null;
  ano?: number | null;
}

export interface AutorizacaoGmail_Key {
  ownerUid: string;
  __typename?: 'AutorizacaoGmail_Key';
}

export interface Avaliacao_Key {
  id: UUIDString;
  __typename?: 'Avaliacao_Key';
}

export interface CriarAlunoData {
  aluno_insert: Aluno_Key;
}

export interface CriarAlunoVariables {
  turmaId: UUIDString;
  nome: string;
  matricula?: string | null;
  chamada?: number | null;
  email?: string | null;
}

export interface CriarAvaliacaoComTurmaData {
  avaliacao_insert: Avaliacao_Key;
}

export interface CriarAvaliacaoComTurmaVariables {
  turmaId: UUIDString;
  titulo: string;
  disciplina?: string | null;
  dataAplicacao?: DateString | null;
  valorTotal: number;
  instrucoes?: string | null;
  comentarioDevolutiva?: string | null;
  status: StatusAvaliacao;
}

export interface CriarAvaliacaoSemTurmaData {
  avaliacao_insert: Avaliacao_Key;
}

export interface CriarAvaliacaoSemTurmaVariables {
  titulo: string;
  disciplina?: string | null;
  dataAplicacao?: DateString | null;
  valorTotal: number;
  instrucoes?: string | null;
  comentarioDevolutiva?: string | null;
  status: StatusAvaliacao;
}

export interface CriarDigitalizacaoFolhaData {
  digitalizacaoFolha_insert: DigitalizacaoFolha_Key;
}

export interface CriarDigitalizacaoFolhaVariables {
  id: UUIDString;
  avaliacaoId: UUIDString;
  arquivoOriginal: string;
  mimeOriginal: string;
  paginaOrigem: number;
  rotacao: number;
  recorte: unknown;
  storagePath: string;
  larguraPx: number;
  alturaPx: number;
  tamanhoBytes: Int64String;
}

export interface CriarFolhaRespostaComAlunoData {
  folhaResposta_insert: FolhaResposta_Key;
}

export interface CriarFolhaRespostaComAlunoVariables {
  avaliacaoId: UUIDString;
  modeloId: UUIDString;
  turmaId: UUIDString;
  alunoId: UUIDString;
  codigo: string;
  qrPayload: string;
}

export interface CriarFolhaRespostaSemAlunoData {
  folhaResposta_insert: FolhaResposta_Key;
}

export interface CriarFolhaRespostaSemAlunoVariables {
  avaliacaoId: UUIDString;
  modeloId: UUIDString;
  codigo: string;
  qrPayload: string;
}

export interface CriarModeloFolhaData {
  modeloFolhaResposta_insert: ModeloFolhaResposta_Key;
}

export interface CriarModeloFolhaVariables {
  avaliacaoId: UUIDString;
  versao: number;
  colunas: number;
  linhasPorColuna: number;
  orientacao: OrientacaoFolha;
  snapshot: unknown;
}

export interface CriarQuestaoData {
  questao_insert: Questao_Key;
}

export interface CriarQuestaoVariables {
  avaliacaoId: UUIDString;
  numero: number;
  tipo: TipoQuestao;
  qtdAlternativas?: number | null;
  numDigitos?: number | null;
  gabarito?: string | null;
  valor: number;
  descontoErro: number;
  anulada: boolean;
  conteudo?: string | null;
  orientacaoCorrecao?: string | null;
  respostaModelo?: string | null;
  respostaModeloImagemPath?: string | null;
}

export interface CriarRespostaAlunoData {
  respostaAluno_insert: RespostaAluno_Key;
}

export interface CriarRespostaAlunoVariables {
  avaliacaoId: UUIDString;
  turmaId: UUIDString;
  alunoId: UUIDString;
  questaoId: UUIDString;
  resposta?: string | null;
  notaManual?: number | null;
  feedback?: string | null;
}

export interface CriarTurmaData {
  turma_insert: Turma_Key;
}

export interface CriarTurmaVariables {
  nome: string;
  serie?: string | null;
  ano?: number | null;
}

export interface DigitalizacaoFolha_Key {
  id: UUIDString;
  __typename?: 'DigitalizacaoFolha_Key';
}

export interface EnvioDevolutiva_Key {
  id: UUIDString;
  __typename?: 'EnvioDevolutiva_Key';
}

export interface ExcluirAlunoData {
  aluno_delete?: Aluno_Key | null;
}

export interface ExcluirAlunoVariables {
  id: UUIDString;
}

export interface ExcluirAvaliacaoData {
  avaliacao_delete?: Avaliacao_Key | null;
}

export interface ExcluirAvaliacaoVariables {
  id: UUIDString;
}

export interface ExcluirDigitalizacaoFolhaData {
  digitalizacaoFolha_delete?: DigitalizacaoFolha_Key | null;
}

export interface ExcluirDigitalizacaoFolhaVariables {
  id: UUIDString;
}

export interface ExcluirQuestaoData {
  questao_delete?: Questao_Key | null;
}

export interface ExcluirQuestaoVariables {
  id: UUIDString;
}

export interface ExcluirRespostaAlunoData {
  respostaAluno_delete?: RespostaAluno_Key | null;
}

export interface ExcluirRespostaAlunoVariables {
  id: UUIDString;
}

export interface ExcluirTurmaData {
  turma_delete?: Turma_Key | null;
}

export interface ExcluirTurmaVariables {
  id: UUIDString;
}

export interface FolhaResposta_Key {
  id: UUIDString;
  __typename?: 'FolhaResposta_Key';
}

export interface ListarMeusAlunosPorTurmaData {
  alunos: ({
    id: UUIDString;
    turmaId: UUIDString;
    nome: string;
    matricula?: string | null;
    chamada?: number | null;
    email?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Aluno_Key)[];
}

export interface ListarMeusAlunosPorTurmaVariables {
  turmaId: UUIDString;
}

export interface ListarMeusModelosFolhaData {
  modelosFolhaResposta: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    versao: number;
    colunas: number;
    linhasPorColuna: number;
    orientacao: OrientacaoFolha;
    snapshot: unknown;
    createdAt: TimestampString;
  } & ModeloFolhaResposta_Key)[];
}

export interface ListarMeusModelosFolhaVariables {
  avaliacaoId: UUIDString;
}

export interface ListarMinhasAvaliacoesData {
  avaliacoes: ({
    id: UUIDString;
    turmaId?: UUIDString | null;
    titulo: string;
    disciplina?: string | null;
    dataAplicacao?: DateString | null;
    valorTotal: number;
    instrucoes?: string | null;
    comentarioDevolutiva?: string | null;
    status: StatusAvaliacao;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    turma?: {
      id: UUIDString;
      nome: string;
      serie?: string | null;
      ano?: number | null;
    } & Turma_Key;
  } & Avaliacao_Key)[];
}

export interface ListarMinhasDigitalizacoesPorAvaliacaoData {
  digitalizacoesFolha: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    folhaId?: UUIDString | null;
    modeloId?: UUIDString | null;
    alunoId?: UUIDString | null;
    arquivoOriginal: string;
    mimeOriginal: string;
    paginaOrigem: number;
    paginaModelo?: number | null;
    rotacao: number;
    recorte: unknown;
    storagePath: string;
    larguraPx: number;
    alturaPx: number;
    tamanhoBytes: Int64String;
    resultadoLeitura?: unknown | null;
    confiancaLeitura?: number | null;
    status: StatusDigitalizacao;
    processadoAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & DigitalizacaoFolha_Key)[];
}

export interface ListarMinhasDigitalizacoesPorAvaliacaoVariables {
  avaliacaoId: UUIDString;
}

export interface ListarMinhasFolhasPorAvaliacaoData {
  folhasResposta: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    modeloId: UUIDString;
    alunoId?: UUIDString | null;
    codigo: string;
    qrPayload: string;
    createdAt: TimestampString;
  } & FolhaResposta_Key)[];
}

export interface ListarMinhasFolhasPorAvaliacaoVariables {
  avaliacaoId: UUIDString;
}

export interface ListarMinhasFolhasPorModeloData {
  folhasResposta: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    modeloId: UUIDString;
    alunoId?: UUIDString | null;
    codigo: string;
    qrPayload: string;
    createdAt: TimestampString;
  } & FolhaResposta_Key)[];
}

export interface ListarMinhasFolhasPorModeloVariables {
  modeloId: UUIDString;
}

export interface ListarMinhasQuestoesData {
  questoes: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    numero: number;
    tipo: TipoQuestao;
    qtdAlternativas?: number | null;
    numDigitos?: number | null;
    gabarito?: string | null;
    valor: number;
    descontoErro: number;
    anulada: boolean;
    conteudo?: string | null;
    orientacaoCorrecao?: string | null;
    respostaModelo?: string | null;
    respostaModeloImagemPath?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Questao_Key)[];
}

export interface ListarMinhasQuestoesVariables {
  avaliacaoId: UUIDString;
}

export interface ListarMinhasRespostasPorAlunoData {
  respostasAluno: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    alunoId: UUIDString;
    questaoId: UUIDString;
    resposta?: string | null;
    notaManual?: number | null;
    feedback?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & RespostaAluno_Key)[];
}

export interface ListarMinhasRespostasPorAlunoVariables {
  avaliacaoId: UUIDString;
  alunoId: UUIDString;
}

export interface ListarMinhasRespostasPorAvaliacaoData {
  respostasAluno: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    alunoId: UUIDString;
    questaoId: UUIDString;
    resposta?: string | null;
    notaManual?: number | null;
    feedback?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & RespostaAluno_Key)[];
}

export interface ListarMinhasRespostasPorAvaliacaoVariables {
  avaliacaoId: UUIDString;
}

export interface ListarMinhasTurmasData {
  turmas: ({
    id: UUIDString;
    nome: string;
    serie?: string | null;
    ano?: number | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Turma_Key)[];
}

export interface MarcarDigitalizacaoComErroData {
  digitalizacaoFolha_update?: DigitalizacaoFolha_Key | null;
}

export interface MarcarDigitalizacaoComErroVariables {
  id: UUIDString;
}

export interface MeuPerfilData {
  professors: ({
    uid: string;
    nome?: string | null;
    email?: string | null;
    escola?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Professor_Key)[];
}

export interface ModeloFolhaResposta_Key {
  id: UUIDString;
  __typename?: 'ModeloFolhaResposta_Key';
}

export interface ObterMeuAlunoData {
  alunos: ({
    id: UUIDString;
    turmaId: UUIDString;
    nome: string;
    matricula?: string | null;
    chamada?: number | null;
    email?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    turma: {
      id: UUIDString;
      nome: string;
      serie?: string | null;
      ano?: number | null;
    } & Turma_Key;
  } & Aluno_Key)[];
}

export interface ObterMeuAlunoVariables {
  id: UUIDString;
}

export interface ObterMeuModeloFolhaData {
  modelosFolhaResposta: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    versao: number;
    colunas: number;
    linhasPorColuna: number;
    orientacao: OrientacaoFolha;
    snapshot: unknown;
    createdAt: TimestampString;
  } & ModeloFolhaResposta_Key)[];
}

export interface ObterMeuModeloFolhaVariables {
  id: UUIDString;
}

export interface ObterMinhaAvaliacaoData {
  avaliacoes: ({
    id: UUIDString;
    turmaId?: UUIDString | null;
    titulo: string;
    disciplina?: string | null;
    dataAplicacao?: DateString | null;
    valorTotal: number;
    instrucoes?: string | null;
    comentarioDevolutiva?: string | null;
    status: StatusAvaliacao;
    createdAt: TimestampString;
    updatedAt: TimestampString;
    turma?: {
      id: UUIDString;
      nome: string;
      serie?: string | null;
      ano?: number | null;
    } & Turma_Key;
  } & Avaliacao_Key)[];
}

export interface ObterMinhaAvaliacaoVariables {
  id: UUIDString;
}

export interface ObterMinhaDigitalizacaoData {
  digitalizacoesFolha: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    folhaId?: UUIDString | null;
    modeloId?: UUIDString | null;
    alunoId?: UUIDString | null;
    arquivoOriginal: string;
    mimeOriginal: string;
    paginaOrigem: number;
    paginaModelo?: number | null;
    rotacao: number;
    recorte: unknown;
    storagePath: string;
    larguraPx: number;
    alturaPx: number;
    tamanhoBytes: Int64String;
    resultadoLeitura?: unknown | null;
    confiancaLeitura?: number | null;
    status: StatusDigitalizacao;
    processadoAt?: TimestampString | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & DigitalizacaoFolha_Key)[];
}

export interface ObterMinhaDigitalizacaoVariables {
  id: UUIDString;
}

export interface ObterMinhaFolhaPorCodigoData {
  folhasResposta: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    modeloId: UUIDString;
    alunoId?: UUIDString | null;
    codigo: string;
    qrPayload: string;
    createdAt: TimestampString;
  } & FolhaResposta_Key)[];
}

export interface ObterMinhaFolhaPorCodigoVariables {
  codigo: string;
}

export interface ObterMinhaQuestaoData {
  questoes: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    numero: number;
    tipo: TipoQuestao;
    qtdAlternativas?: number | null;
    numDigitos?: number | null;
    gabarito?: string | null;
    valor: number;
    descontoErro: number;
    anulada: boolean;
    conteudo?: string | null;
    orientacaoCorrecao?: string | null;
    respostaModelo?: string | null;
    respostaModeloImagemPath?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Questao_Key)[];
}

export interface ObterMinhaQuestaoVariables {
  id: UUIDString;
}

export interface ObterMinhaRespostaPorAlunoEQuestaoData {
  respostasAluno: ({
    id: UUIDString;
    avaliacaoId: UUIDString;
    alunoId: UUIDString;
    questaoId: UUIDString;
    resposta?: string | null;
    notaManual?: number | null;
    feedback?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & RespostaAluno_Key)[];
}

export interface ObterMinhaRespostaPorAlunoEQuestaoVariables {
  avaliacaoId: UUIDString;
  alunoId: UUIDString;
  questaoId: UUIDString;
}

export interface ObterMinhaTurmaData {
  turmas: ({
    id: UUIDString;
    nome: string;
    serie?: string | null;
    ano?: number | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & Turma_Key)[];
}

export interface ObterMinhaTurmaVariables {
  id: UUIDString;
}

export interface Professor_Key {
  uid: string;
  __typename?: 'Professor_Key';
}

export interface Questao_Key {
  id: UUIDString;
  __typename?: 'Questao_Key';
}

export interface RespostaAluno_Key {
  id: UUIDString;
  __typename?: 'RespostaAluno_Key';
}

export interface SalvarMeuPerfilData {
  professor_upsert: Professor_Key;
}

export interface SalvarMeuPerfilVariables {
  nome?: string | null;
  email?: string | null;
  escola?: string | null;
}

export interface Turma_Key {
  id: UUIDString;
  __typename?: 'Turma_Key';
}

export interface VincularDigitalizacaoAFolhaData {
  digitalizacaoFolha_update?: DigitalizacaoFolha_Key | null;
}

export interface VincularDigitalizacaoAFolhaVariables {
  id: UUIDString;
  avaliacaoId: UUIDString;
  folhaId: UUIDString;
}

interface ListarMeusAlunosPorTurmaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListarMeusAlunosPorTurmaVariables): QueryRef<ListarMeusAlunosPorTurmaData, ListarMeusAlunosPorTurmaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListarMeusAlunosPorTurmaVariables): QueryRef<ListarMeusAlunosPorTurmaData, ListarMeusAlunosPorTurmaVariables>;
  operationName: string;
}
export const listarMeusAlunosPorTurmaRef: ListarMeusAlunosPorTurmaRef;

export function listarMeusAlunosPorTurma(vars: ListarMeusAlunosPorTurmaVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMeusAlunosPorTurmaData, ListarMeusAlunosPorTurmaVariables>;
export function listarMeusAlunosPorTurma(dc: DataConnect, vars: ListarMeusAlunosPorTurmaVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMeusAlunosPorTurmaData, ListarMeusAlunosPorTurmaVariables>;

interface ObterMeuAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ObterMeuAlunoVariables): QueryRef<ObterMeuAlunoData, ObterMeuAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ObterMeuAlunoVariables): QueryRef<ObterMeuAlunoData, ObterMeuAlunoVariables>;
  operationName: string;
}
export const obterMeuAlunoRef: ObterMeuAlunoRef;

export function obterMeuAluno(vars: ObterMeuAlunoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMeuAlunoData, ObterMeuAlunoVariables>;
export function obterMeuAluno(dc: DataConnect, vars: ObterMeuAlunoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMeuAlunoData, ObterMeuAlunoVariables>;

interface CriarAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CriarAlunoVariables): MutationRef<CriarAlunoData, CriarAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CriarAlunoVariables): MutationRef<CriarAlunoData, CriarAlunoVariables>;
  operationName: string;
}
export const criarAlunoRef: CriarAlunoRef;

export function criarAluno(vars: CriarAlunoVariables): MutationPromise<CriarAlunoData, CriarAlunoVariables>;
export function criarAluno(dc: DataConnect, vars: CriarAlunoVariables): MutationPromise<CriarAlunoData, CriarAlunoVariables>;

interface AtualizarAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AtualizarAlunoVariables): MutationRef<AtualizarAlunoData, AtualizarAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AtualizarAlunoVariables): MutationRef<AtualizarAlunoData, AtualizarAlunoVariables>;
  operationName: string;
}
export const atualizarAlunoRef: AtualizarAlunoRef;

export function atualizarAluno(vars: AtualizarAlunoVariables): MutationPromise<AtualizarAlunoData, AtualizarAlunoVariables>;
export function atualizarAluno(dc: DataConnect, vars: AtualizarAlunoVariables): MutationPromise<AtualizarAlunoData, AtualizarAlunoVariables>;

interface ExcluirAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ExcluirAlunoVariables): MutationRef<ExcluirAlunoData, ExcluirAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ExcluirAlunoVariables): MutationRef<ExcluirAlunoData, ExcluirAlunoVariables>;
  operationName: string;
}
export const excluirAlunoRef: ExcluirAlunoRef;

export function excluirAluno(vars: ExcluirAlunoVariables): MutationPromise<ExcluirAlunoData, ExcluirAlunoVariables>;
export function excluirAluno(dc: DataConnect, vars: ExcluirAlunoVariables): MutationPromise<ExcluirAlunoData, ExcluirAlunoVariables>;

interface ListarMinhasAvaliacoesRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListarMinhasAvaliacoesData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListarMinhasAvaliacoesData, undefined>;
  operationName: string;
}
export const listarMinhasAvaliacoesRef: ListarMinhasAvaliacoesRef;

export function listarMinhasAvaliacoes(options?: ExecuteQueryOptions): QueryPromise<ListarMinhasAvaliacoesData, undefined>;
export function listarMinhasAvaliacoes(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasAvaliacoesData, undefined>;

interface ObterMinhaAvaliacaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ObterMinhaAvaliacaoVariables): QueryRef<ObterMinhaAvaliacaoData, ObterMinhaAvaliacaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ObterMinhaAvaliacaoVariables): QueryRef<ObterMinhaAvaliacaoData, ObterMinhaAvaliacaoVariables>;
  operationName: string;
}
export const obterMinhaAvaliacaoRef: ObterMinhaAvaliacaoRef;

export function obterMinhaAvaliacao(vars: ObterMinhaAvaliacaoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaAvaliacaoData, ObterMinhaAvaliacaoVariables>;
export function obterMinhaAvaliacao(dc: DataConnect, vars: ObterMinhaAvaliacaoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaAvaliacaoData, ObterMinhaAvaliacaoVariables>;

interface CriarAvaliacaoComTurmaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CriarAvaliacaoComTurmaVariables): MutationRef<CriarAvaliacaoComTurmaData, CriarAvaliacaoComTurmaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CriarAvaliacaoComTurmaVariables): MutationRef<CriarAvaliacaoComTurmaData, CriarAvaliacaoComTurmaVariables>;
  operationName: string;
}
export const criarAvaliacaoComTurmaRef: CriarAvaliacaoComTurmaRef;

export function criarAvaliacaoComTurma(vars: CriarAvaliacaoComTurmaVariables): MutationPromise<CriarAvaliacaoComTurmaData, CriarAvaliacaoComTurmaVariables>;
export function criarAvaliacaoComTurma(dc: DataConnect, vars: CriarAvaliacaoComTurmaVariables): MutationPromise<CriarAvaliacaoComTurmaData, CriarAvaliacaoComTurmaVariables>;

interface CriarAvaliacaoSemTurmaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CriarAvaliacaoSemTurmaVariables): MutationRef<CriarAvaliacaoSemTurmaData, CriarAvaliacaoSemTurmaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CriarAvaliacaoSemTurmaVariables): MutationRef<CriarAvaliacaoSemTurmaData, CriarAvaliacaoSemTurmaVariables>;
  operationName: string;
}
export const criarAvaliacaoSemTurmaRef: CriarAvaliacaoSemTurmaRef;

export function criarAvaliacaoSemTurma(vars: CriarAvaliacaoSemTurmaVariables): MutationPromise<CriarAvaliacaoSemTurmaData, CriarAvaliacaoSemTurmaVariables>;
export function criarAvaliacaoSemTurma(dc: DataConnect, vars: CriarAvaliacaoSemTurmaVariables): MutationPromise<CriarAvaliacaoSemTurmaData, CriarAvaliacaoSemTurmaVariables>;

interface AtualizarAvaliacaoComTurmaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AtualizarAvaliacaoComTurmaVariables): MutationRef<AtualizarAvaliacaoComTurmaData, AtualizarAvaliacaoComTurmaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AtualizarAvaliacaoComTurmaVariables): MutationRef<AtualizarAvaliacaoComTurmaData, AtualizarAvaliacaoComTurmaVariables>;
  operationName: string;
}
export const atualizarAvaliacaoComTurmaRef: AtualizarAvaliacaoComTurmaRef;

export function atualizarAvaliacaoComTurma(vars: AtualizarAvaliacaoComTurmaVariables): MutationPromise<AtualizarAvaliacaoComTurmaData, AtualizarAvaliacaoComTurmaVariables>;
export function atualizarAvaliacaoComTurma(dc: DataConnect, vars: AtualizarAvaliacaoComTurmaVariables): MutationPromise<AtualizarAvaliacaoComTurmaData, AtualizarAvaliacaoComTurmaVariables>;

interface AtualizarAvaliacaoSemTurmaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AtualizarAvaliacaoSemTurmaVariables): MutationRef<AtualizarAvaliacaoSemTurmaData, AtualizarAvaliacaoSemTurmaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AtualizarAvaliacaoSemTurmaVariables): MutationRef<AtualizarAvaliacaoSemTurmaData, AtualizarAvaliacaoSemTurmaVariables>;
  operationName: string;
}
export const atualizarAvaliacaoSemTurmaRef: AtualizarAvaliacaoSemTurmaRef;

export function atualizarAvaliacaoSemTurma(vars: AtualizarAvaliacaoSemTurmaVariables): MutationPromise<AtualizarAvaliacaoSemTurmaData, AtualizarAvaliacaoSemTurmaVariables>;
export function atualizarAvaliacaoSemTurma(dc: DataConnect, vars: AtualizarAvaliacaoSemTurmaVariables): MutationPromise<AtualizarAvaliacaoSemTurmaData, AtualizarAvaliacaoSemTurmaVariables>;

interface ExcluirAvaliacaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ExcluirAvaliacaoVariables): MutationRef<ExcluirAvaliacaoData, ExcluirAvaliacaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ExcluirAvaliacaoVariables): MutationRef<ExcluirAvaliacaoData, ExcluirAvaliacaoVariables>;
  operationName: string;
}
export const excluirAvaliacaoRef: ExcluirAvaliacaoRef;

export function excluirAvaliacao(vars: ExcluirAvaliacaoVariables): MutationPromise<ExcluirAvaliacaoData, ExcluirAvaliacaoVariables>;
export function excluirAvaliacao(dc: DataConnect, vars: ExcluirAvaliacaoVariables): MutationPromise<ExcluirAvaliacaoData, ExcluirAvaliacaoVariables>;

interface ListarMinhasDigitalizacoesPorAvaliacaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListarMinhasDigitalizacoesPorAvaliacaoVariables): QueryRef<ListarMinhasDigitalizacoesPorAvaliacaoData, ListarMinhasDigitalizacoesPorAvaliacaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListarMinhasDigitalizacoesPorAvaliacaoVariables): QueryRef<ListarMinhasDigitalizacoesPorAvaliacaoData, ListarMinhasDigitalizacoesPorAvaliacaoVariables>;
  operationName: string;
}
export const listarMinhasDigitalizacoesPorAvaliacaoRef: ListarMinhasDigitalizacoesPorAvaliacaoRef;

export function listarMinhasDigitalizacoesPorAvaliacao(vars: ListarMinhasDigitalizacoesPorAvaliacaoVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasDigitalizacoesPorAvaliacaoData, ListarMinhasDigitalizacoesPorAvaliacaoVariables>;
export function listarMinhasDigitalizacoesPorAvaliacao(dc: DataConnect, vars: ListarMinhasDigitalizacoesPorAvaliacaoVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasDigitalizacoesPorAvaliacaoData, ListarMinhasDigitalizacoesPorAvaliacaoVariables>;

interface ObterMinhaDigitalizacaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ObterMinhaDigitalizacaoVariables): QueryRef<ObterMinhaDigitalizacaoData, ObterMinhaDigitalizacaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ObterMinhaDigitalizacaoVariables): QueryRef<ObterMinhaDigitalizacaoData, ObterMinhaDigitalizacaoVariables>;
  operationName: string;
}
export const obterMinhaDigitalizacaoRef: ObterMinhaDigitalizacaoRef;

export function obterMinhaDigitalizacao(vars: ObterMinhaDigitalizacaoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaDigitalizacaoData, ObterMinhaDigitalizacaoVariables>;
export function obterMinhaDigitalizacao(dc: DataConnect, vars: ObterMinhaDigitalizacaoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaDigitalizacaoData, ObterMinhaDigitalizacaoVariables>;

interface CriarDigitalizacaoFolhaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CriarDigitalizacaoFolhaVariables): MutationRef<CriarDigitalizacaoFolhaData, CriarDigitalizacaoFolhaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CriarDigitalizacaoFolhaVariables): MutationRef<CriarDigitalizacaoFolhaData, CriarDigitalizacaoFolhaVariables>;
  operationName: string;
}
export const criarDigitalizacaoFolhaRef: CriarDigitalizacaoFolhaRef;

export function criarDigitalizacaoFolha(vars: CriarDigitalizacaoFolhaVariables): MutationPromise<CriarDigitalizacaoFolhaData, CriarDigitalizacaoFolhaVariables>;
export function criarDigitalizacaoFolha(dc: DataConnect, vars: CriarDigitalizacaoFolhaVariables): MutationPromise<CriarDigitalizacaoFolhaData, CriarDigitalizacaoFolhaVariables>;

interface VincularDigitalizacaoAFolhaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: VincularDigitalizacaoAFolhaVariables): MutationRef<VincularDigitalizacaoAFolhaData, VincularDigitalizacaoAFolhaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: VincularDigitalizacaoAFolhaVariables): MutationRef<VincularDigitalizacaoAFolhaData, VincularDigitalizacaoAFolhaVariables>;
  operationName: string;
}
export const vincularDigitalizacaoAFolhaRef: VincularDigitalizacaoAFolhaRef;

export function vincularDigitalizacaoAFolha(vars: VincularDigitalizacaoAFolhaVariables): MutationPromise<VincularDigitalizacaoAFolhaData, VincularDigitalizacaoAFolhaVariables>;
export function vincularDigitalizacaoAFolha(dc: DataConnect, vars: VincularDigitalizacaoAFolhaVariables): MutationPromise<VincularDigitalizacaoAFolhaData, VincularDigitalizacaoAFolhaVariables>;

interface AtualizarLeituraDigitalizacaoComAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AtualizarLeituraDigitalizacaoComAlunoVariables): MutationRef<AtualizarLeituraDigitalizacaoComAlunoData, AtualizarLeituraDigitalizacaoComAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AtualizarLeituraDigitalizacaoComAlunoVariables): MutationRef<AtualizarLeituraDigitalizacaoComAlunoData, AtualizarLeituraDigitalizacaoComAlunoVariables>;
  operationName: string;
}
export const atualizarLeituraDigitalizacaoComAlunoRef: AtualizarLeituraDigitalizacaoComAlunoRef;

export function atualizarLeituraDigitalizacaoComAluno(vars: AtualizarLeituraDigitalizacaoComAlunoVariables): MutationPromise<AtualizarLeituraDigitalizacaoComAlunoData, AtualizarLeituraDigitalizacaoComAlunoVariables>;
export function atualizarLeituraDigitalizacaoComAluno(dc: DataConnect, vars: AtualizarLeituraDigitalizacaoComAlunoVariables): MutationPromise<AtualizarLeituraDigitalizacaoComAlunoData, AtualizarLeituraDigitalizacaoComAlunoVariables>;

interface AtualizarLeituraDigitalizacaoSemAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AtualizarLeituraDigitalizacaoSemAlunoVariables): MutationRef<AtualizarLeituraDigitalizacaoSemAlunoData, AtualizarLeituraDigitalizacaoSemAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AtualizarLeituraDigitalizacaoSemAlunoVariables): MutationRef<AtualizarLeituraDigitalizacaoSemAlunoData, AtualizarLeituraDigitalizacaoSemAlunoVariables>;
  operationName: string;
}
export const atualizarLeituraDigitalizacaoSemAlunoRef: AtualizarLeituraDigitalizacaoSemAlunoRef;

export function atualizarLeituraDigitalizacaoSemAluno(vars: AtualizarLeituraDigitalizacaoSemAlunoVariables): MutationPromise<AtualizarLeituraDigitalizacaoSemAlunoData, AtualizarLeituraDigitalizacaoSemAlunoVariables>;
export function atualizarLeituraDigitalizacaoSemAluno(dc: DataConnect, vars: AtualizarLeituraDigitalizacaoSemAlunoVariables): MutationPromise<AtualizarLeituraDigitalizacaoSemAlunoData, AtualizarLeituraDigitalizacaoSemAlunoVariables>;

interface MarcarDigitalizacaoComErroRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: MarcarDigitalizacaoComErroVariables): MutationRef<MarcarDigitalizacaoComErroData, MarcarDigitalizacaoComErroVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: MarcarDigitalizacaoComErroVariables): MutationRef<MarcarDigitalizacaoComErroData, MarcarDigitalizacaoComErroVariables>;
  operationName: string;
}
export const marcarDigitalizacaoComErroRef: MarcarDigitalizacaoComErroRef;

export function marcarDigitalizacaoComErro(vars: MarcarDigitalizacaoComErroVariables): MutationPromise<MarcarDigitalizacaoComErroData, MarcarDigitalizacaoComErroVariables>;
export function marcarDigitalizacaoComErro(dc: DataConnect, vars: MarcarDigitalizacaoComErroVariables): MutationPromise<MarcarDigitalizacaoComErroData, MarcarDigitalizacaoComErroVariables>;

interface ExcluirDigitalizacaoFolhaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ExcluirDigitalizacaoFolhaVariables): MutationRef<ExcluirDigitalizacaoFolhaData, ExcluirDigitalizacaoFolhaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ExcluirDigitalizacaoFolhaVariables): MutationRef<ExcluirDigitalizacaoFolhaData, ExcluirDigitalizacaoFolhaVariables>;
  operationName: string;
}
export const excluirDigitalizacaoFolhaRef: ExcluirDigitalizacaoFolhaRef;

export function excluirDigitalizacaoFolha(vars: ExcluirDigitalizacaoFolhaVariables): MutationPromise<ExcluirDigitalizacaoFolhaData, ExcluirDigitalizacaoFolhaVariables>;
export function excluirDigitalizacaoFolha(dc: DataConnect, vars: ExcluirDigitalizacaoFolhaVariables): MutationPromise<ExcluirDigitalizacaoFolhaData, ExcluirDigitalizacaoFolhaVariables>;

interface ListarMeusModelosFolhaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListarMeusModelosFolhaVariables): QueryRef<ListarMeusModelosFolhaData, ListarMeusModelosFolhaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListarMeusModelosFolhaVariables): QueryRef<ListarMeusModelosFolhaData, ListarMeusModelosFolhaVariables>;
  operationName: string;
}
export const listarMeusModelosFolhaRef: ListarMeusModelosFolhaRef;

export function listarMeusModelosFolha(vars: ListarMeusModelosFolhaVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMeusModelosFolhaData, ListarMeusModelosFolhaVariables>;
export function listarMeusModelosFolha(dc: DataConnect, vars: ListarMeusModelosFolhaVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMeusModelosFolhaData, ListarMeusModelosFolhaVariables>;

interface ObterMeuModeloFolhaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ObterMeuModeloFolhaVariables): QueryRef<ObterMeuModeloFolhaData, ObterMeuModeloFolhaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ObterMeuModeloFolhaVariables): QueryRef<ObterMeuModeloFolhaData, ObterMeuModeloFolhaVariables>;
  operationName: string;
}
export const obterMeuModeloFolhaRef: ObterMeuModeloFolhaRef;

export function obterMeuModeloFolha(vars: ObterMeuModeloFolhaVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMeuModeloFolhaData, ObterMeuModeloFolhaVariables>;
export function obterMeuModeloFolha(dc: DataConnect, vars: ObterMeuModeloFolhaVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMeuModeloFolhaData, ObterMeuModeloFolhaVariables>;

interface CriarModeloFolhaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CriarModeloFolhaVariables): MutationRef<CriarModeloFolhaData, CriarModeloFolhaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CriarModeloFolhaVariables): MutationRef<CriarModeloFolhaData, CriarModeloFolhaVariables>;
  operationName: string;
}
export const criarModeloFolhaRef: CriarModeloFolhaRef;

export function criarModeloFolha(vars: CriarModeloFolhaVariables): MutationPromise<CriarModeloFolhaData, CriarModeloFolhaVariables>;
export function criarModeloFolha(dc: DataConnect, vars: CriarModeloFolhaVariables): MutationPromise<CriarModeloFolhaData, CriarModeloFolhaVariables>;

interface ListarMinhasFolhasPorAvaliacaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListarMinhasFolhasPorAvaliacaoVariables): QueryRef<ListarMinhasFolhasPorAvaliacaoData, ListarMinhasFolhasPorAvaliacaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListarMinhasFolhasPorAvaliacaoVariables): QueryRef<ListarMinhasFolhasPorAvaliacaoData, ListarMinhasFolhasPorAvaliacaoVariables>;
  operationName: string;
}
export const listarMinhasFolhasPorAvaliacaoRef: ListarMinhasFolhasPorAvaliacaoRef;

export function listarMinhasFolhasPorAvaliacao(vars: ListarMinhasFolhasPorAvaliacaoVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasFolhasPorAvaliacaoData, ListarMinhasFolhasPorAvaliacaoVariables>;
export function listarMinhasFolhasPorAvaliacao(dc: DataConnect, vars: ListarMinhasFolhasPorAvaliacaoVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasFolhasPorAvaliacaoData, ListarMinhasFolhasPorAvaliacaoVariables>;

interface ListarMinhasFolhasPorModeloRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListarMinhasFolhasPorModeloVariables): QueryRef<ListarMinhasFolhasPorModeloData, ListarMinhasFolhasPorModeloVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListarMinhasFolhasPorModeloVariables): QueryRef<ListarMinhasFolhasPorModeloData, ListarMinhasFolhasPorModeloVariables>;
  operationName: string;
}
export const listarMinhasFolhasPorModeloRef: ListarMinhasFolhasPorModeloRef;

export function listarMinhasFolhasPorModelo(vars: ListarMinhasFolhasPorModeloVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasFolhasPorModeloData, ListarMinhasFolhasPorModeloVariables>;
export function listarMinhasFolhasPorModelo(dc: DataConnect, vars: ListarMinhasFolhasPorModeloVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasFolhasPorModeloData, ListarMinhasFolhasPorModeloVariables>;

interface ObterMinhaFolhaPorCodigoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ObterMinhaFolhaPorCodigoVariables): QueryRef<ObterMinhaFolhaPorCodigoData, ObterMinhaFolhaPorCodigoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ObterMinhaFolhaPorCodigoVariables): QueryRef<ObterMinhaFolhaPorCodigoData, ObterMinhaFolhaPorCodigoVariables>;
  operationName: string;
}
export const obterMinhaFolhaPorCodigoRef: ObterMinhaFolhaPorCodigoRef;

export function obterMinhaFolhaPorCodigo(vars: ObterMinhaFolhaPorCodigoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaFolhaPorCodigoData, ObterMinhaFolhaPorCodigoVariables>;
export function obterMinhaFolhaPorCodigo(dc: DataConnect, vars: ObterMinhaFolhaPorCodigoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaFolhaPorCodigoData, ObterMinhaFolhaPorCodigoVariables>;

interface CriarFolhaRespostaComAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CriarFolhaRespostaComAlunoVariables): MutationRef<CriarFolhaRespostaComAlunoData, CriarFolhaRespostaComAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CriarFolhaRespostaComAlunoVariables): MutationRef<CriarFolhaRespostaComAlunoData, CriarFolhaRespostaComAlunoVariables>;
  operationName: string;
}
export const criarFolhaRespostaComAlunoRef: CriarFolhaRespostaComAlunoRef;

export function criarFolhaRespostaComAluno(vars: CriarFolhaRespostaComAlunoVariables): MutationPromise<CriarFolhaRespostaComAlunoData, CriarFolhaRespostaComAlunoVariables>;
export function criarFolhaRespostaComAluno(dc: DataConnect, vars: CriarFolhaRespostaComAlunoVariables): MutationPromise<CriarFolhaRespostaComAlunoData, CriarFolhaRespostaComAlunoVariables>;

interface CriarFolhaRespostaSemAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CriarFolhaRespostaSemAlunoVariables): MutationRef<CriarFolhaRespostaSemAlunoData, CriarFolhaRespostaSemAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CriarFolhaRespostaSemAlunoVariables): MutationRef<CriarFolhaRespostaSemAlunoData, CriarFolhaRespostaSemAlunoVariables>;
  operationName: string;
}
export const criarFolhaRespostaSemAlunoRef: CriarFolhaRespostaSemAlunoRef;

export function criarFolhaRespostaSemAluno(vars: CriarFolhaRespostaSemAlunoVariables): MutationPromise<CriarFolhaRespostaSemAlunoData, CriarFolhaRespostaSemAlunoVariables>;
export function criarFolhaRespostaSemAluno(dc: DataConnect, vars: CriarFolhaRespostaSemAlunoVariables): MutationPromise<CriarFolhaRespostaSemAlunoData, CriarFolhaRespostaSemAlunoVariables>;

interface MeuPerfilRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<MeuPerfilData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<MeuPerfilData, undefined>;
  operationName: string;
}
export const meuPerfilRef: MeuPerfilRef;

export function meuPerfil(options?: ExecuteQueryOptions): QueryPromise<MeuPerfilData, undefined>;
export function meuPerfil(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<MeuPerfilData, undefined>;

interface SalvarMeuPerfilRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars?: SalvarMeuPerfilVariables): MutationRef<SalvarMeuPerfilData, SalvarMeuPerfilVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars?: SalvarMeuPerfilVariables): MutationRef<SalvarMeuPerfilData, SalvarMeuPerfilVariables>;
  operationName: string;
}
export const salvarMeuPerfilRef: SalvarMeuPerfilRef;

export function salvarMeuPerfil(vars?: SalvarMeuPerfilVariables): MutationPromise<SalvarMeuPerfilData, SalvarMeuPerfilVariables>;
export function salvarMeuPerfil(dc: DataConnect, vars?: SalvarMeuPerfilVariables): MutationPromise<SalvarMeuPerfilData, SalvarMeuPerfilVariables>;

interface ListarMinhasQuestoesRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListarMinhasQuestoesVariables): QueryRef<ListarMinhasQuestoesData, ListarMinhasQuestoesVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListarMinhasQuestoesVariables): QueryRef<ListarMinhasQuestoesData, ListarMinhasQuestoesVariables>;
  operationName: string;
}
export const listarMinhasQuestoesRef: ListarMinhasQuestoesRef;

export function listarMinhasQuestoes(vars: ListarMinhasQuestoesVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasQuestoesData, ListarMinhasQuestoesVariables>;
export function listarMinhasQuestoes(dc: DataConnect, vars: ListarMinhasQuestoesVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasQuestoesData, ListarMinhasQuestoesVariables>;

interface ObterMinhaQuestaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ObterMinhaQuestaoVariables): QueryRef<ObterMinhaQuestaoData, ObterMinhaQuestaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ObterMinhaQuestaoVariables): QueryRef<ObterMinhaQuestaoData, ObterMinhaQuestaoVariables>;
  operationName: string;
}
export const obterMinhaQuestaoRef: ObterMinhaQuestaoRef;

export function obterMinhaQuestao(vars: ObterMinhaQuestaoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaQuestaoData, ObterMinhaQuestaoVariables>;
export function obterMinhaQuestao(dc: DataConnect, vars: ObterMinhaQuestaoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaQuestaoData, ObterMinhaQuestaoVariables>;

interface CriarQuestaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CriarQuestaoVariables): MutationRef<CriarQuestaoData, CriarQuestaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CriarQuestaoVariables): MutationRef<CriarQuestaoData, CriarQuestaoVariables>;
  operationName: string;
}
export const criarQuestaoRef: CriarQuestaoRef;

export function criarQuestao(vars: CriarQuestaoVariables): MutationPromise<CriarQuestaoData, CriarQuestaoVariables>;
export function criarQuestao(dc: DataConnect, vars: CriarQuestaoVariables): MutationPromise<CriarQuestaoData, CriarQuestaoVariables>;

interface AtualizarQuestaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AtualizarQuestaoVariables): MutationRef<AtualizarQuestaoData, AtualizarQuestaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AtualizarQuestaoVariables): MutationRef<AtualizarQuestaoData, AtualizarQuestaoVariables>;
  operationName: string;
}
export const atualizarQuestaoRef: AtualizarQuestaoRef;

export function atualizarQuestao(vars: AtualizarQuestaoVariables): MutationPromise<AtualizarQuestaoData, AtualizarQuestaoVariables>;
export function atualizarQuestao(dc: DataConnect, vars: AtualizarQuestaoVariables): MutationPromise<AtualizarQuestaoData, AtualizarQuestaoVariables>;

interface ExcluirQuestaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ExcluirQuestaoVariables): MutationRef<ExcluirQuestaoData, ExcluirQuestaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ExcluirQuestaoVariables): MutationRef<ExcluirQuestaoData, ExcluirQuestaoVariables>;
  operationName: string;
}
export const excluirQuestaoRef: ExcluirQuestaoRef;

export function excluirQuestao(vars: ExcluirQuestaoVariables): MutationPromise<ExcluirQuestaoData, ExcluirQuestaoVariables>;
export function excluirQuestao(dc: DataConnect, vars: ExcluirQuestaoVariables): MutationPromise<ExcluirQuestaoData, ExcluirQuestaoVariables>;

interface ListarMinhasRespostasPorAvaliacaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListarMinhasRespostasPorAvaliacaoVariables): QueryRef<ListarMinhasRespostasPorAvaliacaoData, ListarMinhasRespostasPorAvaliacaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListarMinhasRespostasPorAvaliacaoVariables): QueryRef<ListarMinhasRespostasPorAvaliacaoData, ListarMinhasRespostasPorAvaliacaoVariables>;
  operationName: string;
}
export const listarMinhasRespostasPorAvaliacaoRef: ListarMinhasRespostasPorAvaliacaoRef;

export function listarMinhasRespostasPorAvaliacao(vars: ListarMinhasRespostasPorAvaliacaoVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasRespostasPorAvaliacaoData, ListarMinhasRespostasPorAvaliacaoVariables>;
export function listarMinhasRespostasPorAvaliacao(dc: DataConnect, vars: ListarMinhasRespostasPorAvaliacaoVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasRespostasPorAvaliacaoData, ListarMinhasRespostasPorAvaliacaoVariables>;

interface ListarMinhasRespostasPorAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ListarMinhasRespostasPorAlunoVariables): QueryRef<ListarMinhasRespostasPorAlunoData, ListarMinhasRespostasPorAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ListarMinhasRespostasPorAlunoVariables): QueryRef<ListarMinhasRespostasPorAlunoData, ListarMinhasRespostasPorAlunoVariables>;
  operationName: string;
}
export const listarMinhasRespostasPorAlunoRef: ListarMinhasRespostasPorAlunoRef;

export function listarMinhasRespostasPorAluno(vars: ListarMinhasRespostasPorAlunoVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasRespostasPorAlunoData, ListarMinhasRespostasPorAlunoVariables>;
export function listarMinhasRespostasPorAluno(dc: DataConnect, vars: ListarMinhasRespostasPorAlunoVariables, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasRespostasPorAlunoData, ListarMinhasRespostasPorAlunoVariables>;

interface ObterMinhaRespostaPorAlunoEQuestaoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ObterMinhaRespostaPorAlunoEQuestaoVariables): QueryRef<ObterMinhaRespostaPorAlunoEQuestaoData, ObterMinhaRespostaPorAlunoEQuestaoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ObterMinhaRespostaPorAlunoEQuestaoVariables): QueryRef<ObterMinhaRespostaPorAlunoEQuestaoData, ObterMinhaRespostaPorAlunoEQuestaoVariables>;
  operationName: string;
}
export const obterMinhaRespostaPorAlunoEQuestaoRef: ObterMinhaRespostaPorAlunoEQuestaoRef;

export function obterMinhaRespostaPorAlunoEQuestao(vars: ObterMinhaRespostaPorAlunoEQuestaoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaRespostaPorAlunoEQuestaoData, ObterMinhaRespostaPorAlunoEQuestaoVariables>;
export function obterMinhaRespostaPorAlunoEQuestao(dc: DataConnect, vars: ObterMinhaRespostaPorAlunoEQuestaoVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaRespostaPorAlunoEQuestaoData, ObterMinhaRespostaPorAlunoEQuestaoVariables>;

interface CriarRespostaAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CriarRespostaAlunoVariables): MutationRef<CriarRespostaAlunoData, CriarRespostaAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CriarRespostaAlunoVariables): MutationRef<CriarRespostaAlunoData, CriarRespostaAlunoVariables>;
  operationName: string;
}
export const criarRespostaAlunoRef: CriarRespostaAlunoRef;

export function criarRespostaAluno(vars: CriarRespostaAlunoVariables): MutationPromise<CriarRespostaAlunoData, CriarRespostaAlunoVariables>;
export function criarRespostaAluno(dc: DataConnect, vars: CriarRespostaAlunoVariables): MutationPromise<CriarRespostaAlunoData, CriarRespostaAlunoVariables>;

interface AtualizarRespostaAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AtualizarRespostaAlunoVariables): MutationRef<AtualizarRespostaAlunoData, AtualizarRespostaAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AtualizarRespostaAlunoVariables): MutationRef<AtualizarRespostaAlunoData, AtualizarRespostaAlunoVariables>;
  operationName: string;
}
export const atualizarRespostaAlunoRef: AtualizarRespostaAlunoRef;

export function atualizarRespostaAluno(vars: AtualizarRespostaAlunoVariables): MutationPromise<AtualizarRespostaAlunoData, AtualizarRespostaAlunoVariables>;
export function atualizarRespostaAluno(dc: DataConnect, vars: AtualizarRespostaAlunoVariables): MutationPromise<AtualizarRespostaAlunoData, AtualizarRespostaAlunoVariables>;

interface ExcluirRespostaAlunoRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ExcluirRespostaAlunoVariables): MutationRef<ExcluirRespostaAlunoData, ExcluirRespostaAlunoVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ExcluirRespostaAlunoVariables): MutationRef<ExcluirRespostaAlunoData, ExcluirRespostaAlunoVariables>;
  operationName: string;
}
export const excluirRespostaAlunoRef: ExcluirRespostaAlunoRef;

export function excluirRespostaAluno(vars: ExcluirRespostaAlunoVariables): MutationPromise<ExcluirRespostaAlunoData, ExcluirRespostaAlunoVariables>;
export function excluirRespostaAluno(dc: DataConnect, vars: ExcluirRespostaAlunoVariables): MutationPromise<ExcluirRespostaAlunoData, ExcluirRespostaAlunoVariables>;

interface ListarMinhasTurmasRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<ListarMinhasTurmasData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<ListarMinhasTurmasData, undefined>;
  operationName: string;
}
export const listarMinhasTurmasRef: ListarMinhasTurmasRef;

export function listarMinhasTurmas(options?: ExecuteQueryOptions): QueryPromise<ListarMinhasTurmasData, undefined>;
export function listarMinhasTurmas(dc: DataConnect, options?: ExecuteQueryOptions): QueryPromise<ListarMinhasTurmasData, undefined>;

interface ObterMinhaTurmaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ObterMinhaTurmaVariables): QueryRef<ObterMinhaTurmaData, ObterMinhaTurmaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ObterMinhaTurmaVariables): QueryRef<ObterMinhaTurmaData, ObterMinhaTurmaVariables>;
  operationName: string;
}
export const obterMinhaTurmaRef: ObterMinhaTurmaRef;

export function obterMinhaTurma(vars: ObterMinhaTurmaVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaTurmaData, ObterMinhaTurmaVariables>;
export function obterMinhaTurma(dc: DataConnect, vars: ObterMinhaTurmaVariables, options?: ExecuteQueryOptions): QueryPromise<ObterMinhaTurmaData, ObterMinhaTurmaVariables>;

interface CriarTurmaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CriarTurmaVariables): MutationRef<CriarTurmaData, CriarTurmaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CriarTurmaVariables): MutationRef<CriarTurmaData, CriarTurmaVariables>;
  operationName: string;
}
export const criarTurmaRef: CriarTurmaRef;

export function criarTurma(vars: CriarTurmaVariables): MutationPromise<CriarTurmaData, CriarTurmaVariables>;
export function criarTurma(dc: DataConnect, vars: CriarTurmaVariables): MutationPromise<CriarTurmaData, CriarTurmaVariables>;

interface AtualizarTurmaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AtualizarTurmaVariables): MutationRef<AtualizarTurmaData, AtualizarTurmaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AtualizarTurmaVariables): MutationRef<AtualizarTurmaData, AtualizarTurmaVariables>;
  operationName: string;
}
export const atualizarTurmaRef: AtualizarTurmaRef;

export function atualizarTurma(vars: AtualizarTurmaVariables): MutationPromise<AtualizarTurmaData, AtualizarTurmaVariables>;
export function atualizarTurma(dc: DataConnect, vars: AtualizarTurmaVariables): MutationPromise<AtualizarTurmaData, AtualizarTurmaVariables>;

interface ExcluirTurmaRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: ExcluirTurmaVariables): MutationRef<ExcluirTurmaData, ExcluirTurmaVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: ExcluirTurmaVariables): MutationRef<ExcluirTurmaData, ExcluirTurmaVariables>;
  operationName: string;
}
export const excluirTurmaRef: ExcluirTurmaRef;

export function excluirTurma(vars: ExcluirTurmaVariables): MutationPromise<ExcluirTurmaData, ExcluirTurmaVariables>;
export function excluirTurma(dc: DataConnect, vars: ExcluirTurmaVariables): MutationPromise<ExcluirTurmaData, ExcluirTurmaVariables>;

