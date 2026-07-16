import { ListarMeusAlunosPorTurmaData, ListarMeusAlunosPorTurmaVariables, ObterMeuAlunoData, ObterMeuAlunoVariables, CriarAlunoData, CriarAlunoVariables, AtualizarAlunoData, AtualizarAlunoVariables, ExcluirAlunoData, ExcluirAlunoVariables, ListarMinhasAvaliacoesData, ObterMinhaAvaliacaoData, ObterMinhaAvaliacaoVariables, CriarAvaliacaoComTurmaData, CriarAvaliacaoComTurmaVariables, CriarAvaliacaoSemTurmaData, CriarAvaliacaoSemTurmaVariables, AtualizarAvaliacaoComTurmaData, AtualizarAvaliacaoComTurmaVariables, AtualizarAvaliacaoSemTurmaData, AtualizarAvaliacaoSemTurmaVariables, ExcluirAvaliacaoData, ExcluirAvaliacaoVariables, MeuPerfilData, SalvarMeuPerfilData, SalvarMeuPerfilVariables, ListarMinhasQuestoesData, ListarMinhasQuestoesVariables, ObterMinhaQuestaoData, ObterMinhaQuestaoVariables, CriarQuestaoData, CriarQuestaoVariables, AtualizarQuestaoData, AtualizarQuestaoVariables, ExcluirQuestaoData, ExcluirQuestaoVariables, ListarMinhasRespostasPorAvaliacaoData, ListarMinhasRespostasPorAvaliacaoVariables, ListarMinhasRespostasPorAlunoData, ListarMinhasRespostasPorAlunoVariables, ObterMinhaRespostaPorAlunoEQuestaoData, ObterMinhaRespostaPorAlunoEQuestaoVariables, CriarRespostaAlunoData, CriarRespostaAlunoVariables, AtualizarRespostaAlunoData, AtualizarRespostaAlunoVariables, ExcluirRespostaAlunoData, ExcluirRespostaAlunoVariables, ListarMinhasTurmasData, ObterMinhaTurmaData, ObterMinhaTurmaVariables, CriarTurmaData, CriarTurmaVariables, AtualizarTurmaData, AtualizarTurmaVariables, ExcluirTurmaData, ExcluirTurmaVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useListarMeusAlunosPorTurma(vars: ListarMeusAlunosPorTurmaVariables, options?: useDataConnectQueryOptions<ListarMeusAlunosPorTurmaData>): UseDataConnectQueryResult<ListarMeusAlunosPorTurmaData, ListarMeusAlunosPorTurmaVariables>;
export function useListarMeusAlunosPorTurma(dc: DataConnect, vars: ListarMeusAlunosPorTurmaVariables, options?: useDataConnectQueryOptions<ListarMeusAlunosPorTurmaData>): UseDataConnectQueryResult<ListarMeusAlunosPorTurmaData, ListarMeusAlunosPorTurmaVariables>;

export function useObterMeuAluno(vars: ObterMeuAlunoVariables, options?: useDataConnectQueryOptions<ObterMeuAlunoData>): UseDataConnectQueryResult<ObterMeuAlunoData, ObterMeuAlunoVariables>;
export function useObterMeuAluno(dc: DataConnect, vars: ObterMeuAlunoVariables, options?: useDataConnectQueryOptions<ObterMeuAlunoData>): UseDataConnectQueryResult<ObterMeuAlunoData, ObterMeuAlunoVariables>;

export function useCriarAluno(options?: useDataConnectMutationOptions<CriarAlunoData, FirebaseError, CriarAlunoVariables>): UseDataConnectMutationResult<CriarAlunoData, CriarAlunoVariables>;
export function useCriarAluno(dc: DataConnect, options?: useDataConnectMutationOptions<CriarAlunoData, FirebaseError, CriarAlunoVariables>): UseDataConnectMutationResult<CriarAlunoData, CriarAlunoVariables>;

export function useAtualizarAluno(options?: useDataConnectMutationOptions<AtualizarAlunoData, FirebaseError, AtualizarAlunoVariables>): UseDataConnectMutationResult<AtualizarAlunoData, AtualizarAlunoVariables>;
export function useAtualizarAluno(dc: DataConnect, options?: useDataConnectMutationOptions<AtualizarAlunoData, FirebaseError, AtualizarAlunoVariables>): UseDataConnectMutationResult<AtualizarAlunoData, AtualizarAlunoVariables>;

export function useExcluirAluno(options?: useDataConnectMutationOptions<ExcluirAlunoData, FirebaseError, ExcluirAlunoVariables>): UseDataConnectMutationResult<ExcluirAlunoData, ExcluirAlunoVariables>;
export function useExcluirAluno(dc: DataConnect, options?: useDataConnectMutationOptions<ExcluirAlunoData, FirebaseError, ExcluirAlunoVariables>): UseDataConnectMutationResult<ExcluirAlunoData, ExcluirAlunoVariables>;

export function useListarMinhasAvaliacoes(options?: useDataConnectQueryOptions<ListarMinhasAvaliacoesData>): UseDataConnectQueryResult<ListarMinhasAvaliacoesData, undefined>;
export function useListarMinhasAvaliacoes(dc: DataConnect, options?: useDataConnectQueryOptions<ListarMinhasAvaliacoesData>): UseDataConnectQueryResult<ListarMinhasAvaliacoesData, undefined>;

export function useObterMinhaAvaliacao(vars: ObterMinhaAvaliacaoVariables, options?: useDataConnectQueryOptions<ObterMinhaAvaliacaoData>): UseDataConnectQueryResult<ObterMinhaAvaliacaoData, ObterMinhaAvaliacaoVariables>;
export function useObterMinhaAvaliacao(dc: DataConnect, vars: ObterMinhaAvaliacaoVariables, options?: useDataConnectQueryOptions<ObterMinhaAvaliacaoData>): UseDataConnectQueryResult<ObterMinhaAvaliacaoData, ObterMinhaAvaliacaoVariables>;

export function useCriarAvaliacaoComTurma(options?: useDataConnectMutationOptions<CriarAvaliacaoComTurmaData, FirebaseError, CriarAvaliacaoComTurmaVariables>): UseDataConnectMutationResult<CriarAvaliacaoComTurmaData, CriarAvaliacaoComTurmaVariables>;
export function useCriarAvaliacaoComTurma(dc: DataConnect, options?: useDataConnectMutationOptions<CriarAvaliacaoComTurmaData, FirebaseError, CriarAvaliacaoComTurmaVariables>): UseDataConnectMutationResult<CriarAvaliacaoComTurmaData, CriarAvaliacaoComTurmaVariables>;

export function useCriarAvaliacaoSemTurma(options?: useDataConnectMutationOptions<CriarAvaliacaoSemTurmaData, FirebaseError, CriarAvaliacaoSemTurmaVariables>): UseDataConnectMutationResult<CriarAvaliacaoSemTurmaData, CriarAvaliacaoSemTurmaVariables>;
export function useCriarAvaliacaoSemTurma(dc: DataConnect, options?: useDataConnectMutationOptions<CriarAvaliacaoSemTurmaData, FirebaseError, CriarAvaliacaoSemTurmaVariables>): UseDataConnectMutationResult<CriarAvaliacaoSemTurmaData, CriarAvaliacaoSemTurmaVariables>;

export function useAtualizarAvaliacaoComTurma(options?: useDataConnectMutationOptions<AtualizarAvaliacaoComTurmaData, FirebaseError, AtualizarAvaliacaoComTurmaVariables>): UseDataConnectMutationResult<AtualizarAvaliacaoComTurmaData, AtualizarAvaliacaoComTurmaVariables>;
export function useAtualizarAvaliacaoComTurma(dc: DataConnect, options?: useDataConnectMutationOptions<AtualizarAvaliacaoComTurmaData, FirebaseError, AtualizarAvaliacaoComTurmaVariables>): UseDataConnectMutationResult<AtualizarAvaliacaoComTurmaData, AtualizarAvaliacaoComTurmaVariables>;

export function useAtualizarAvaliacaoSemTurma(options?: useDataConnectMutationOptions<AtualizarAvaliacaoSemTurmaData, FirebaseError, AtualizarAvaliacaoSemTurmaVariables>): UseDataConnectMutationResult<AtualizarAvaliacaoSemTurmaData, AtualizarAvaliacaoSemTurmaVariables>;
export function useAtualizarAvaliacaoSemTurma(dc: DataConnect, options?: useDataConnectMutationOptions<AtualizarAvaliacaoSemTurmaData, FirebaseError, AtualizarAvaliacaoSemTurmaVariables>): UseDataConnectMutationResult<AtualizarAvaliacaoSemTurmaData, AtualizarAvaliacaoSemTurmaVariables>;

export function useExcluirAvaliacao(options?: useDataConnectMutationOptions<ExcluirAvaliacaoData, FirebaseError, ExcluirAvaliacaoVariables>): UseDataConnectMutationResult<ExcluirAvaliacaoData, ExcluirAvaliacaoVariables>;
export function useExcluirAvaliacao(dc: DataConnect, options?: useDataConnectMutationOptions<ExcluirAvaliacaoData, FirebaseError, ExcluirAvaliacaoVariables>): UseDataConnectMutationResult<ExcluirAvaliacaoData, ExcluirAvaliacaoVariables>;

export function useMeuPerfil(options?: useDataConnectQueryOptions<MeuPerfilData>): UseDataConnectQueryResult<MeuPerfilData, undefined>;
export function useMeuPerfil(dc: DataConnect, options?: useDataConnectQueryOptions<MeuPerfilData>): UseDataConnectQueryResult<MeuPerfilData, undefined>;

export function useSalvarMeuPerfil(options?: useDataConnectMutationOptions<SalvarMeuPerfilData, FirebaseError, SalvarMeuPerfilVariables | void>): UseDataConnectMutationResult<SalvarMeuPerfilData, SalvarMeuPerfilVariables>;
export function useSalvarMeuPerfil(dc: DataConnect, options?: useDataConnectMutationOptions<SalvarMeuPerfilData, FirebaseError, SalvarMeuPerfilVariables | void>): UseDataConnectMutationResult<SalvarMeuPerfilData, SalvarMeuPerfilVariables>;

export function useListarMinhasQuestoes(vars: ListarMinhasQuestoesVariables, options?: useDataConnectQueryOptions<ListarMinhasQuestoesData>): UseDataConnectQueryResult<ListarMinhasQuestoesData, ListarMinhasQuestoesVariables>;
export function useListarMinhasQuestoes(dc: DataConnect, vars: ListarMinhasQuestoesVariables, options?: useDataConnectQueryOptions<ListarMinhasQuestoesData>): UseDataConnectQueryResult<ListarMinhasQuestoesData, ListarMinhasQuestoesVariables>;

export function useObterMinhaQuestao(vars: ObterMinhaQuestaoVariables, options?: useDataConnectQueryOptions<ObterMinhaQuestaoData>): UseDataConnectQueryResult<ObterMinhaQuestaoData, ObterMinhaQuestaoVariables>;
export function useObterMinhaQuestao(dc: DataConnect, vars: ObterMinhaQuestaoVariables, options?: useDataConnectQueryOptions<ObterMinhaQuestaoData>): UseDataConnectQueryResult<ObterMinhaQuestaoData, ObterMinhaQuestaoVariables>;

export function useCriarQuestao(options?: useDataConnectMutationOptions<CriarQuestaoData, FirebaseError, CriarQuestaoVariables>): UseDataConnectMutationResult<CriarQuestaoData, CriarQuestaoVariables>;
export function useCriarQuestao(dc: DataConnect, options?: useDataConnectMutationOptions<CriarQuestaoData, FirebaseError, CriarQuestaoVariables>): UseDataConnectMutationResult<CriarQuestaoData, CriarQuestaoVariables>;

export function useAtualizarQuestao(options?: useDataConnectMutationOptions<AtualizarQuestaoData, FirebaseError, AtualizarQuestaoVariables>): UseDataConnectMutationResult<AtualizarQuestaoData, AtualizarQuestaoVariables>;
export function useAtualizarQuestao(dc: DataConnect, options?: useDataConnectMutationOptions<AtualizarQuestaoData, FirebaseError, AtualizarQuestaoVariables>): UseDataConnectMutationResult<AtualizarQuestaoData, AtualizarQuestaoVariables>;

export function useExcluirQuestao(options?: useDataConnectMutationOptions<ExcluirQuestaoData, FirebaseError, ExcluirQuestaoVariables>): UseDataConnectMutationResult<ExcluirQuestaoData, ExcluirQuestaoVariables>;
export function useExcluirQuestao(dc: DataConnect, options?: useDataConnectMutationOptions<ExcluirQuestaoData, FirebaseError, ExcluirQuestaoVariables>): UseDataConnectMutationResult<ExcluirQuestaoData, ExcluirQuestaoVariables>;

export function useListarMinhasRespostasPorAvaliacao(vars: ListarMinhasRespostasPorAvaliacaoVariables, options?: useDataConnectQueryOptions<ListarMinhasRespostasPorAvaliacaoData>): UseDataConnectQueryResult<ListarMinhasRespostasPorAvaliacaoData, ListarMinhasRespostasPorAvaliacaoVariables>;
export function useListarMinhasRespostasPorAvaliacao(dc: DataConnect, vars: ListarMinhasRespostasPorAvaliacaoVariables, options?: useDataConnectQueryOptions<ListarMinhasRespostasPorAvaliacaoData>): UseDataConnectQueryResult<ListarMinhasRespostasPorAvaliacaoData, ListarMinhasRespostasPorAvaliacaoVariables>;

export function useListarMinhasRespostasPorAluno(vars: ListarMinhasRespostasPorAlunoVariables, options?: useDataConnectQueryOptions<ListarMinhasRespostasPorAlunoData>): UseDataConnectQueryResult<ListarMinhasRespostasPorAlunoData, ListarMinhasRespostasPorAlunoVariables>;
export function useListarMinhasRespostasPorAluno(dc: DataConnect, vars: ListarMinhasRespostasPorAlunoVariables, options?: useDataConnectQueryOptions<ListarMinhasRespostasPorAlunoData>): UseDataConnectQueryResult<ListarMinhasRespostasPorAlunoData, ListarMinhasRespostasPorAlunoVariables>;

export function useObterMinhaRespostaPorAlunoEQuestao(vars: ObterMinhaRespostaPorAlunoEQuestaoVariables, options?: useDataConnectQueryOptions<ObterMinhaRespostaPorAlunoEQuestaoData>): UseDataConnectQueryResult<ObterMinhaRespostaPorAlunoEQuestaoData, ObterMinhaRespostaPorAlunoEQuestaoVariables>;
export function useObterMinhaRespostaPorAlunoEQuestao(dc: DataConnect, vars: ObterMinhaRespostaPorAlunoEQuestaoVariables, options?: useDataConnectQueryOptions<ObterMinhaRespostaPorAlunoEQuestaoData>): UseDataConnectQueryResult<ObterMinhaRespostaPorAlunoEQuestaoData, ObterMinhaRespostaPorAlunoEQuestaoVariables>;

export function useCriarRespostaAluno(options?: useDataConnectMutationOptions<CriarRespostaAlunoData, FirebaseError, CriarRespostaAlunoVariables>): UseDataConnectMutationResult<CriarRespostaAlunoData, CriarRespostaAlunoVariables>;
export function useCriarRespostaAluno(dc: DataConnect, options?: useDataConnectMutationOptions<CriarRespostaAlunoData, FirebaseError, CriarRespostaAlunoVariables>): UseDataConnectMutationResult<CriarRespostaAlunoData, CriarRespostaAlunoVariables>;

export function useAtualizarRespostaAluno(options?: useDataConnectMutationOptions<AtualizarRespostaAlunoData, FirebaseError, AtualizarRespostaAlunoVariables>): UseDataConnectMutationResult<AtualizarRespostaAlunoData, AtualizarRespostaAlunoVariables>;
export function useAtualizarRespostaAluno(dc: DataConnect, options?: useDataConnectMutationOptions<AtualizarRespostaAlunoData, FirebaseError, AtualizarRespostaAlunoVariables>): UseDataConnectMutationResult<AtualizarRespostaAlunoData, AtualizarRespostaAlunoVariables>;

export function useExcluirRespostaAluno(options?: useDataConnectMutationOptions<ExcluirRespostaAlunoData, FirebaseError, ExcluirRespostaAlunoVariables>): UseDataConnectMutationResult<ExcluirRespostaAlunoData, ExcluirRespostaAlunoVariables>;
export function useExcluirRespostaAluno(dc: DataConnect, options?: useDataConnectMutationOptions<ExcluirRespostaAlunoData, FirebaseError, ExcluirRespostaAlunoVariables>): UseDataConnectMutationResult<ExcluirRespostaAlunoData, ExcluirRespostaAlunoVariables>;

export function useListarMinhasTurmas(options?: useDataConnectQueryOptions<ListarMinhasTurmasData>): UseDataConnectQueryResult<ListarMinhasTurmasData, undefined>;
export function useListarMinhasTurmas(dc: DataConnect, options?: useDataConnectQueryOptions<ListarMinhasTurmasData>): UseDataConnectQueryResult<ListarMinhasTurmasData, undefined>;

export function useObterMinhaTurma(vars: ObterMinhaTurmaVariables, options?: useDataConnectQueryOptions<ObterMinhaTurmaData>): UseDataConnectQueryResult<ObterMinhaTurmaData, ObterMinhaTurmaVariables>;
export function useObterMinhaTurma(dc: DataConnect, vars: ObterMinhaTurmaVariables, options?: useDataConnectQueryOptions<ObterMinhaTurmaData>): UseDataConnectQueryResult<ObterMinhaTurmaData, ObterMinhaTurmaVariables>;

export function useCriarTurma(options?: useDataConnectMutationOptions<CriarTurmaData, FirebaseError, CriarTurmaVariables>): UseDataConnectMutationResult<CriarTurmaData, CriarTurmaVariables>;
export function useCriarTurma(dc: DataConnect, options?: useDataConnectMutationOptions<CriarTurmaData, FirebaseError, CriarTurmaVariables>): UseDataConnectMutationResult<CriarTurmaData, CriarTurmaVariables>;

export function useAtualizarTurma(options?: useDataConnectMutationOptions<AtualizarTurmaData, FirebaseError, AtualizarTurmaVariables>): UseDataConnectMutationResult<AtualizarTurmaData, AtualizarTurmaVariables>;
export function useAtualizarTurma(dc: DataConnect, options?: useDataConnectMutationOptions<AtualizarTurmaData, FirebaseError, AtualizarTurmaVariables>): UseDataConnectMutationResult<AtualizarTurmaData, AtualizarTurmaVariables>;

export function useExcluirTurma(options?: useDataConnectMutationOptions<ExcluirTurmaData, FirebaseError, ExcluirTurmaVariables>): UseDataConnectMutationResult<ExcluirTurmaData, ExcluirTurmaVariables>;
export function useExcluirTurma(dc: DataConnect, options?: useDataConnectMutationOptions<ExcluirTurmaData, FirebaseError, ExcluirTurmaVariables>): UseDataConnectMutationResult<ExcluirTurmaData, ExcluirTurmaVariables>;
