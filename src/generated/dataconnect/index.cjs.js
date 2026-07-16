const { queryRef, executeQuery, validateArgsWithOptions, mutationRef, executeMutation, validateArgs } = require('firebase/data-connect');

const StatusAvaliacao = {
  ELABORACAO: "ELABORACAO",
  PRONTA: "PRONTA",
  APLICADA: "APLICADA",
  EM_CORRECAO: "EM_CORRECAO",
  CORRIGIDA: "CORRIGIDA",
  DEVOLVIDA: "DEVOLVIDA",
}
exports.StatusAvaliacao = StatusAvaliacao;

const TipoQuestao = {
  MULTIPLA_ESCOLHA: "MULTIPLA_ESCOLHA",
  CERTO_ERRADO: "CERTO_ERRADO",
  NUMERICA: "NUMERICA",
  DISCURSIVA: "DISCURSIVA",
}
exports.TipoQuestao = TipoQuestao;

const connectorConfig = {
  connector: 'app',
  service: 'assess-buddy',
  location: 'southamerica-east1'
};
exports.connectorConfig = connectorConfig;

const listarMeusAlunosPorTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListarMeusAlunosPorTurma', inputVars);
}
listarMeusAlunosPorTurmaRef.operationName = 'ListarMeusAlunosPorTurma';
exports.listarMeusAlunosPorTurmaRef = listarMeusAlunosPorTurmaRef;

exports.listarMeusAlunosPorTurma = function listarMeusAlunosPorTurma(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listarMeusAlunosPorTurmaRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const obterMeuAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ObterMeuAluno', inputVars);
}
obterMeuAlunoRef.operationName = 'ObterMeuAluno';
exports.obterMeuAlunoRef = obterMeuAlunoRef;

exports.obterMeuAluno = function obterMeuAluno(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(obterMeuAlunoRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const criarAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarAluno', inputVars);
}
criarAlunoRef.operationName = 'CriarAluno';
exports.criarAlunoRef = criarAlunoRef;

exports.criarAluno = function criarAluno(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarAlunoRef(dcInstance, inputVars));
}
;

const atualizarAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarAluno', inputVars);
}
atualizarAlunoRef.operationName = 'AtualizarAluno';
exports.atualizarAlunoRef = atualizarAlunoRef;

exports.atualizarAluno = function atualizarAluno(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarAlunoRef(dcInstance, inputVars));
}
;

const excluirAlunoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ExcluirAluno', inputVars);
}
excluirAlunoRef.operationName = 'ExcluirAluno';
exports.excluirAlunoRef = excluirAlunoRef;

exports.excluirAluno = function excluirAluno(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(excluirAlunoRef(dcInstance, inputVars));
}
;

const listarMinhasAvaliacoesRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListarMinhasAvaliacoes');
}
listarMinhasAvaliacoesRef.operationName = 'ListarMinhasAvaliacoes';
exports.listarMinhasAvaliacoesRef = listarMinhasAvaliacoesRef;

exports.listarMinhasAvaliacoes = function listarMinhasAvaliacoes(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listarMinhasAvaliacoesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const obterMinhaAvaliacaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ObterMinhaAvaliacao', inputVars);
}
obterMinhaAvaliacaoRef.operationName = 'ObterMinhaAvaliacao';
exports.obterMinhaAvaliacaoRef = obterMinhaAvaliacaoRef;

exports.obterMinhaAvaliacao = function obterMinhaAvaliacao(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(obterMinhaAvaliacaoRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const criarAvaliacaoComTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarAvaliacaoComTurma', inputVars);
}
criarAvaliacaoComTurmaRef.operationName = 'CriarAvaliacaoComTurma';
exports.criarAvaliacaoComTurmaRef = criarAvaliacaoComTurmaRef;

exports.criarAvaliacaoComTurma = function criarAvaliacaoComTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarAvaliacaoComTurmaRef(dcInstance, inputVars));
}
;

const criarAvaliacaoSemTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarAvaliacaoSemTurma', inputVars);
}
criarAvaliacaoSemTurmaRef.operationName = 'CriarAvaliacaoSemTurma';
exports.criarAvaliacaoSemTurmaRef = criarAvaliacaoSemTurmaRef;

exports.criarAvaliacaoSemTurma = function criarAvaliacaoSemTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarAvaliacaoSemTurmaRef(dcInstance, inputVars));
}
;

const atualizarAvaliacaoComTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarAvaliacaoComTurma', inputVars);
}
atualizarAvaliacaoComTurmaRef.operationName = 'AtualizarAvaliacaoComTurma';
exports.atualizarAvaliacaoComTurmaRef = atualizarAvaliacaoComTurmaRef;

exports.atualizarAvaliacaoComTurma = function atualizarAvaliacaoComTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarAvaliacaoComTurmaRef(dcInstance, inputVars));
}
;

const atualizarAvaliacaoSemTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarAvaliacaoSemTurma', inputVars);
}
atualizarAvaliacaoSemTurmaRef.operationName = 'AtualizarAvaliacaoSemTurma';
exports.atualizarAvaliacaoSemTurmaRef = atualizarAvaliacaoSemTurmaRef;

exports.atualizarAvaliacaoSemTurma = function atualizarAvaliacaoSemTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarAvaliacaoSemTurmaRef(dcInstance, inputVars));
}
;

const excluirAvaliacaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ExcluirAvaliacao', inputVars);
}
excluirAvaliacaoRef.operationName = 'ExcluirAvaliacao';
exports.excluirAvaliacaoRef = excluirAvaliacaoRef;

exports.excluirAvaliacao = function excluirAvaliacao(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(excluirAvaliacaoRef(dcInstance, inputVars));
}
;

const meuPerfilRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'MeuPerfil');
}
meuPerfilRef.operationName = 'MeuPerfil';
exports.meuPerfilRef = meuPerfilRef;

exports.meuPerfil = function meuPerfil(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(meuPerfilRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const salvarMeuPerfilRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'SalvarMeuPerfil', inputVars);
}
salvarMeuPerfilRef.operationName = 'SalvarMeuPerfil';
exports.salvarMeuPerfilRef = salvarMeuPerfilRef;

exports.salvarMeuPerfil = function salvarMeuPerfil(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars);
  return executeMutation(salvarMeuPerfilRef(dcInstance, inputVars));
}
;

const listarMinhasQuestoesRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListarMinhasQuestoes', inputVars);
}
listarMinhasQuestoesRef.operationName = 'ListarMinhasQuestoes';
exports.listarMinhasQuestoesRef = listarMinhasQuestoesRef;

exports.listarMinhasQuestoes = function listarMinhasQuestoes(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(listarMinhasQuestoesRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const obterMinhaQuestaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ObterMinhaQuestao', inputVars);
}
obterMinhaQuestaoRef.operationName = 'ObterMinhaQuestao';
exports.obterMinhaQuestaoRef = obterMinhaQuestaoRef;

exports.obterMinhaQuestao = function obterMinhaQuestao(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(obterMinhaQuestaoRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const criarQuestaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarQuestao', inputVars);
}
criarQuestaoRef.operationName = 'CriarQuestao';
exports.criarQuestaoRef = criarQuestaoRef;

exports.criarQuestao = function criarQuestao(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarQuestaoRef(dcInstance, inputVars));
}
;

const atualizarQuestaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarQuestao', inputVars);
}
atualizarQuestaoRef.operationName = 'AtualizarQuestao';
exports.atualizarQuestaoRef = atualizarQuestaoRef;

exports.atualizarQuestao = function atualizarQuestao(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarQuestaoRef(dcInstance, inputVars));
}
;

const excluirQuestaoRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ExcluirQuestao', inputVars);
}
excluirQuestaoRef.operationName = 'ExcluirQuestao';
exports.excluirQuestaoRef = excluirQuestaoRef;

exports.excluirQuestao = function excluirQuestao(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(excluirQuestaoRef(dcInstance, inputVars));
}
;

const listarMinhasTurmasRef = (dc) => {
  const { dc: dcInstance} = validateArgs(connectorConfig, dc, undefined);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ListarMinhasTurmas');
}
listarMinhasTurmasRef.operationName = 'ListarMinhasTurmas';
exports.listarMinhasTurmasRef = listarMinhasTurmasRef;

exports.listarMinhasTurmas = function listarMinhasTurmas(dcOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrOptions, options, undefined,false, false);
  return executeQuery(listarMinhasTurmasRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const obterMinhaTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return queryRef(dcInstance, 'ObterMinhaTurma', inputVars);
}
obterMinhaTurmaRef.operationName = 'ObterMinhaTurma';
exports.obterMinhaTurmaRef = obterMinhaTurmaRef;

exports.obterMinhaTurma = function obterMinhaTurma(dcOrVars, varsOrOptions, options) {
  
  const { dc: dcInstance, vars: inputVars, options: inputOpts } = validateArgsWithOptions(connectorConfig, dcOrVars, varsOrOptions, options, true, true);
  return executeQuery(obterMinhaTurmaRef(dcInstance, inputVars), inputOpts && { fetchPolicy: inputOpts.fetchPolicy });
}
;

const criarTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'CriarTurma', inputVars);
}
criarTurmaRef.operationName = 'CriarTurma';
exports.criarTurmaRef = criarTurmaRef;

exports.criarTurma = function criarTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(criarTurmaRef(dcInstance, inputVars));
}
;

const atualizarTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'AtualizarTurma', inputVars);
}
atualizarTurmaRef.operationName = 'AtualizarTurma';
exports.atualizarTurmaRef = atualizarTurmaRef;

exports.atualizarTurma = function atualizarTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(atualizarTurmaRef(dcInstance, inputVars));
}
;

const excluirTurmaRef = (dcOrVars, vars) => {
  const { dc: dcInstance, vars: inputVars} = validateArgs(connectorConfig, dcOrVars, vars, true);
  dcInstance._useGeneratedSdk();
  return mutationRef(dcInstance, 'ExcluirTurma', inputVars);
}
excluirTurmaRef.operationName = 'ExcluirTurma';
exports.excluirTurmaRef = excluirTurmaRef;

exports.excluirTurma = function excluirTurma(dcOrVars, vars) {
  const { dc: dcInstance, vars: inputVars } = validateArgs(connectorConfig, dcOrVars, vars, true);
  return executeMutation(excluirTurmaRef(dcInstance, inputVars));
}
;
