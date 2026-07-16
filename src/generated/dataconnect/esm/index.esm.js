import { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } from 'firebase/data-connect';

export const StatusAvaliacao = {
  ELABORACAO: "ELABORACAO",
  PRONTA: "PRONTA",
  APLICADA: "APLICADA",
  EM_CORRECAO: "EM_CORRECAO",
  CORRIGIDA: "CORRIGIDA",
  DEVOLVIDA: "DEVOLVIDA",
}

export const TipoQuestao = {
  MULTIPLA_ESCOLHA: "MULTIPLA_ESCOLHA",
  CERTO_ERRADO: "CERTO_ERRADO",
  NUMERICA: "NUMERICA",
  DISCURSIVA: "DISCURSIVA",
}

export const connectorConfig = {
  connector: 'app',
  service: 'assess-buddy',
  location: 'southamerica-east1'
};
export const listarMeusAlunosPorTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListarMeusAlunosPorTurma', inputVars);
}
listarMeusAlunosPorTurmaRef.operationName = 'ListarMeusAlunosPorTurma';

export function listarMeusAlunosPorTurma(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listarMeusAlunosPorTurmaRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const obterMeuAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ObterMeuAluno', inputVars);
}
obterMeuAlunoRef.operationName = 'ObterMeuAluno';

export function obterMeuAluno(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(obterMeuAlunoRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const criarAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarAluno', inputVars);
}
criarAlunoRef.operationName = 'CriarAluno';

export function criarAluno(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarAlunoRef(dcInstance, inputVars));
}

export const atualizarAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarAluno', inputVars);
}
atualizarAlunoRef.operationName = 'AtualizarAluno';

export function atualizarAluno(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarAlunoRef(dcInstance, inputVars));
}

export const excluirAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ExcluirAluno', inputVars);
}
excluirAlunoRef.operationName = 'ExcluirAluno';

export function excluirAluno(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(excluirAlunoRef(dcInstance, inputVars));
}

export const listarMinhasAvaliacoesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListarMinhasAvaliacoes');
}
listarMinhasAvaliacoesRef.operationName = 'ListarMinhasAvaliacoes';

export function listarMinhasAvaliacoes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listarMinhasAvaliacoesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const obterMinhaAvaliacaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ObterMinhaAvaliacao', inputVars);
}
obterMinhaAvaliacaoRef.operationName = 'ObterMinhaAvaliacao';

export function obterMinhaAvaliacao(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(obterMinhaAvaliacaoRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const criarAvaliacaoComTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarAvaliacaoComTurma', inputVars);
}
criarAvaliacaoComTurmaRef.operationName = 'CriarAvaliacaoComTurma';

export function criarAvaliacaoComTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarAvaliacaoComTurmaRef(dcInstance, inputVars));
}

export const criarAvaliacaoSemTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarAvaliacaoSemTurma', inputVars);
}
criarAvaliacaoSemTurmaRef.operationName = 'CriarAvaliacaoSemTurma';

export function criarAvaliacaoSemTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarAvaliacaoSemTurmaRef(dcInstance, inputVars));
}

export const atualizarAvaliacaoComTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarAvaliacaoComTurma', inputVars);
}
atualizarAvaliacaoComTurmaRef.operationName = 'AtualizarAvaliacaoComTurma';

export function atualizarAvaliacaoComTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarAvaliacaoComTurmaRef(dcInstance, inputVars));
}

export const atualizarAvaliacaoSemTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarAvaliacaoSemTurma', inputVars);
}
atualizarAvaliacaoSemTurmaRef.operationName = 'AtualizarAvaliacaoSemTurma';

export function atualizarAvaliacaoSemTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarAvaliacaoSemTurmaRef(dcInstance, inputVars));
}

export const excluirAvaliacaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ExcluirAvaliacao', inputVars);
}
excluirAvaliacaoRef.operationName = 'ExcluirAvaliacao';

export function excluirAvaliacao(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(excluirAvaliacaoRef(dcInstance, inputVars));
}

export const meuPerfilRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'MeuPerfil');
}
meuPerfilRef.operationName = 'MeuPerfil';

export function meuPerfil(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(meuPerfilRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const salvarMeuPerfilRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SalvarMeuPerfil', inputVars);
}
salvarMeuPerfilRef.operationName = 'SalvarMeuPerfil';

export function salvarMeuPerfil(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars);
  return executeMutation(salvarMeuPerfilRef(dcInstance, inputVars));
}

export const listarMinhasQuestoesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListarMinhasQuestoes', inputVars);
}
listarMinhasQuestoesRef.operationName = 'ListarMinhasQuestoes';

export function listarMinhasQuestoes(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listarMinhasQuestoesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const obterMinhaQuestaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ObterMinhaQuestao', inputVars);
}
obterMinhaQuestaoRef.operationName = 'ObterMinhaQuestao';

export function obterMinhaQuestao(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(obterMinhaQuestaoRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const criarQuestaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarQuestao', inputVars);
}
criarQuestaoRef.operationName = 'CriarQuestao';

export function criarQuestao(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarQuestaoRef(dcInstance, inputVars));
}

export const atualizarQuestaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarQuestao', inputVars);
}
atualizarQuestaoRef.operationName = 'AtualizarQuestao';

export function atualizarQuestao(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarQuestaoRef(dcInstance, inputVars));
}

export const excluirQuestaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ExcluirQuestao', inputVars);
}
excluirQuestaoRef.operationName = 'ExcluirQuestao';

export function excluirQuestao(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(excluirQuestaoRef(dcInstance, inputVars));
}

export const listarMinhasRespostasPorAvaliacaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListarMinhasRespostasPorAvaliacao', inputVars);
}
listarMinhasRespostasPorAvaliacaoRef.operationName = 'ListarMinhasRespostasPorAvaliacao';

export function listarMinhasRespostasPorAvaliacao(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listarMinhasRespostasPorAvaliacaoRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const listarMinhasRespostasPorAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListarMinhasRespostasPorAluno', inputVars);
}
listarMinhasRespostasPorAlunoRef.operationName = 'ListarMinhasRespostasPorAluno';

export function listarMinhasRespostasPorAluno(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listarMinhasRespostasPorAlunoRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const obterMinhaRespostaPorAlunoEQuestaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ObterMinhaRespostaPorAlunoEQuestao', inputVars);
}
obterMinhaRespostaPorAlunoEQuestaoRef.operationName = 'ObterMinhaRespostaPorAlunoEQuestao';

export function obterMinhaRespostaPorAlunoEQuestao(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(obterMinhaRespostaPorAlunoEQuestaoRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const criarRespostaAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarRespostaAluno', inputVars);
}
criarRespostaAlunoRef.operationName = 'CriarRespostaAluno';

export function criarRespostaAluno(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarRespostaAlunoRef(dcInstance, inputVars));
}

export const atualizarRespostaAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarRespostaAluno', inputVars);
}
atualizarRespostaAlunoRef.operationName = 'AtualizarRespostaAluno';

export function atualizarRespostaAluno(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarRespostaAlunoRef(dcInstance, inputVars));
}

export const excluirRespostaAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ExcluirRespostaAluno', inputVars);
}
excluirRespostaAlunoRef.operationName = 'ExcluirRespostaAluno';

export function excluirRespostaAluno(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(excluirRespostaAlunoRef(dcInstance, inputVars));
}

export const listarMinhasTurmasRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListarMinhasTurmas');
}
listarMinhasTurmasRef.operationName = 'ListarMinhasTurmas';

export function listarMinhasTurmas(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listarMinhasTurmasRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const obterMinhaTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ObterMinhaTurma', inputVars);
}
obterMinhaTurmaRef.operationName = 'ObterMinhaTurma';

export function obterMinhaTurma(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(obterMinhaTurmaRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}

export const criarTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarTurma', inputVars);
}
criarTurmaRef.operationName = 'CriarTurma';

export function criarTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarTurmaRef(dcInstance, inputVars));
}

export const atualizarTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarTurma', inputVars);
}
atualizarTurmaRef.operationName = 'AtualizarTurma';

export function atualizarTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarTurmaRef(dcInstance, inputVars));
}

export const excluirTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ExcluirTurma', inputVars);
}
excluirTurmaRef.operationName = 'ExcluirTurma';

export function excluirTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(excluirTurmaRef(dcInstance, inputVars));
}

