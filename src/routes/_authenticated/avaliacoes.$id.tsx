import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  Copy,
  Download,
  FileImage,
  FileText,
  LayoutGrid,
  Loader2,
  Plus,
  Printer,
  RectangleHorizontal,
  RectangleVertical,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";

import { AnswerSheet } from "@/components/answer-sheet";
import { AnswerSheetUploadPanel } from "@/components/answer-sheet-upload-panel";
import { StudentFeedbackEditor } from "@/components/class-feedback-panel";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  STATUS_LABEL,
  TIPO_LABEL,
  alternativas,
  calcularNotaAluno,
  corrigirQuestao,
  createOrGetAnswerSheet,
  createQuestoes,
  deleteQuestao,
  duplicateQuestao,
  getAvaliacao,
  getLatestAnswerSheetModel,
  isAnswerSheetPersistenceUnavailable,
  listAlunosByTurma,
  listQuestoes,
  listRespostasByAvaliacao,
  moveQuestao,
  saveResposta,
  updateAvaliacao,
  updateQuestao,
  type Aluno,
  type Avaliacao,
  type IdentificacaoFolhaResposta,
  type Questao,
  type StatusAvaliacao,
  type TipoQuestao,
} from "@/lib/domain";
import { batchExportAnswerSheetsAsZip } from "@/lib/answer-sheet-batch";
import { exportAnswerSheetAsPdf, exportAnswerSheetAsPng } from "@/lib/answer-sheet-export";
import { restoreAnswerSheetModel } from "@/lib/answer-sheet-model";
import {
  DEFAULT_ANSWER_SHEET_LAYOUT,
  type AnswerSheetLayout,
  type AnswerSheetOrientation,
} from "@/lib/answer-sheet-layout";
import {
  clampIdentifierDigits,
  DEFAULT_IDENTIFIER_DIGITS,
  determineIdentifierDigits,
  isStudentEligibleForPrefilledSheet,
  MAX_IDENTIFIER_DIGITS,
  MIN_IDENTIFIER_DIGITS,
  type AnswerSheetIdentificationMode,
} from "@/lib/answer-sheet-identification";

export const Route = createFileRoute("/_authenticated/avaliacoes/$id")({
  component: AvaliacaoDetail,
});

const avaliacaoKey = (id: string) => ["firebase-avaliacao", id] as const;
const questoesKey = (id: string) => ["firebase-questoes", id] as const;
const respostasKey = (id: string) => ["firebase-respostas", id] as const;
const alunosKey = (turmaId: string) => ["firebase-alunos", turmaId] as const;

function AvaliacaoDetail() {
  const { id } = Route.useParams();
  const avaliacaoQuery = useQuery({
    queryKey: avaliacaoKey(id),
    queryFn: () => getAvaliacao(id),
  });
  const questoesQuery = useQuery({
    queryKey: questoesKey(id),
    queryFn: () => listQuestoes(id),
  });

  if (avaliacaoQuery.isPending || questoesQuery.isPending) {
    return (
      <div className="flex items-center gap-2 p-8 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando avaliação…
      </div>
    );
  }

  if (avaliacaoQuery.isError) {
    return <div className="p-8 text-destructive">{message(avaliacaoQuery.error)}</div>;
  }

  if (!avaliacaoQuery.data) {
    return <div className="p-8">Avaliação não encontrada.</div>;
  }

  const avaliacao = avaliacaoQuery.data;
  const questoes = questoesQuery.data ?? [];
  const somaValores = questoes.reduce((total, questao) => total + Number(questao.valor), 0);

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <Link to="/painel" className="text-sm text-muted-foreground hover:underline">
          ← Painel
        </Link>
        <div className="flex items-end justify-between mt-2 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{avaliacao.titulo}</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              {avaliacao.disciplina ?? "Sem disciplina"} · {questoes.length} questões · Valor total{" "}
              {avaliacao.valor_total} (soma atual: {somaValores.toFixed(2)})
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
            {STATUS_LABEL[avaliacao.status]}
          </span>
        </div>
      </div>

      <Tabs defaultValue="config">
        <TabsList className="flex-wrap">
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="gabarito">Gabarito</TabsTrigger>
          <TabsTrigger value="folha">Folha</TabsTrigger>
          <TabsTrigger value="correcao">Correção</TabsTrigger>
          <TabsTrigger value="relatorio">Relatório</TabsTrigger>
          <TabsTrigger value="devolutiva">Devolutiva</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="mt-4">
          <ConfigTab avaliacaoId={id} />
        </TabsContent>
        <TabsContent value="gabarito" className="mt-4">
          <GabaritoTab avaliacaoId={id} />
        </TabsContent>
        <TabsContent value="folha" className="mt-4">
          <FolhaTab avaliacao={avaliacao} questoes={questoes} />
        </TabsContent>
        <TabsContent value="correcao" className="mt-4">
          <CorrecaoTab avaliacao={avaliacao} />
        </TabsContent>
        <TabsContent value="relatorio" className="mt-4">
          <RelatorioTab avaliacaoId={id} turmaId={avaliacao.turma_id} />
        </TabsContent>
        <TabsContent value="devolutiva" className="mt-4">
          <DevolutivaTab avaliacaoId={id} turmaId={avaliacao.turma_id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ConfigTab({ avaliacaoId }: { avaliacaoId: string }) {
  const queryClient = useQueryClient();
  const [quantidades, setQuantidades] = useState<Record<TipoQuestao, string>>({
    mc: "1",
    ce: "1",
    num: "1",
    disc: "1",
  });
  const questoesQuery = useQuery({
    queryKey: questoesKey(avaliacaoId),
    queryFn: () => listQuestoes(avaliacaoId),
  });
  const questoes = questoesQuery.data ?? [];

  const add = useMutation({
    mutationFn: async ({ tipo, quantidade }: { tipo: TipoQuestao; quantidade: number }) => {
      if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 100) {
        throw new Error("Informe uma quantidade inteira entre 1 e 100.");
      }
      const primeiroNumero = Math.max(0, ...questoes.map((questao) => questao.numero)) + 1;
      return createQuestoes(
        avaliacaoId,
        Array.from({ length: quantidade }, (_, index) => ({
          numero: primeiroNumero + index,
          tipo,
          valor: 1,
          desconto_erro: 0,
          anulada: false,
          qtd_alternativas: tipo === "mc" ? 5 : tipo === "ce" ? 2 : null,
          num_digitos: tipo === "num" ? 3 : null,
          gabarito: null,
          conteudo: null,
        })),
      );
    },
    onSuccess: async (created, variables) => {
      queryClient.setQueryData<Questao[]>(questoesKey(avaliacaoId), (current = []) =>
        [...current, ...created].sort((a, b) => a.numero - b.numero),
      );
      await queryClient.invalidateQueries({ queryKey: questoesKey(avaliacaoId) });
      toast.success(
        variables.quantidade === 1
          ? "Item adicionado no Firebase."
          : `${variables.quantidade} itens adicionados no Firebase.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ questao, patch }: { questao: Questao; patch: Partial<Questao> }) =>
      updateQuestao(questao, patch),
    onSuccess: async (updated) => {
      queryClient.setQueryData<Questao[]>(questoesKey(avaliacaoId), (current = []) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      await queryClient.invalidateQueries({ queryKey: questoesKey(avaliacaoId) });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteQuestao,
    onSuccess: async (_data, id) => {
      queryClient.setQueryData<Questao[]>(questoesKey(avaliacaoId), (current = []) =>
        current.filter((item) => item.id !== id),
      );
      await queryClient.invalidateQueries({ queryKey: questoesKey(avaliacaoId) });
      toast.success("Item apagado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const duplicate = useMutation({
    mutationFn: (questao: Questao) => {
      const numero = Math.max(0, ...questoes.map((item) => item.numero)) + 1;
      return duplicateQuestao(questao, numero);
    },
    onSuccess: async (created) => {
      queryClient.setQueryData<Questao[]>(questoesKey(avaliacaoId), (current = []) =>
        [...current, created].sort((a, b) => a.numero - b.numero),
      );
      await queryClient.invalidateQueries({ queryKey: questoesKey(avaliacaoId) });
      toast.success("Item duplicado.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const move = useMutation({
    mutationFn: ({ id, novaPosicao }: { id: string; novaPosicao: number }) =>
      moveQuestao(questoes, id, novaPosicao),
    onSuccess: async (reordered) => {
      queryClient.setQueryData(questoesKey(avaliacaoId), reordered);
      await queryClient.invalidateQueries({ queryKey: questoesKey(avaliacaoId) });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const tipos: Array<{
    tipo: TipoQuestao;
    titulo: string;
    detalhe: string;
  }> = [
    { tipo: "mc", titulo: "Múltipla escolha", detalhe: "5 alternativas" },
    { tipo: "ce", titulo: "Certo/Errado", detalhe: "Opções C e E" },
    { tipo: "num", titulo: "Numérica", detalhe: "3 dígitos" },
    { tipo: "disc", titulo: "Discursiva", detalhe: "Correção manual" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {tipos.map(({ tipo, titulo, detalhe }) => (
          <div key={tipo} className="rounded-lg border border-border bg-card p-3">
            <p className="font-medium">{titulo}</p>
            <p className="text-xs text-muted-foreground">{detalhe}</p>
            <div className="mt-3 flex gap-2">
              <Input
                className="h-9 w-20"
                type="number"
                min={1}
                max={100}
                value={quantidades[tipo]}
                onChange={(event) =>
                  setQuantidades((current) => ({ ...current, [tipo]: event.target.value }))
                }
              />
              <Button
                className="flex-1"
                size="sm"
                disabled={add.isPending}
                onClick={() => add.mutate({ tipo, quantidade: Number(quantidades[tipo]) })}
              >
                {add.isPending && add.variables?.tipo === tipo ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-1 h-4 w-4" />
                )}
                Adicionar
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-primary/20 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
        Valor e desconto aceitam ponto ou vírgula. O desconto é aplicado somente nas respostas
        erradas.
      </div>

      {questoesQuery.isPending ? (
        <div className="flex items-center gap-2 p-8 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando itens…
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="w-14 px-3 py-2">Nº</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Formato</th>
                <th className="px-3 py-2">Gabarito</th>
                <th className="w-24 px-3 py-2">Valor</th>
                <th className="w-32 px-3 py-2">Desconto</th>
                <th className="px-3 py-2">Conteúdo</th>
                <th className="w-20 px-3 py-2">Anulada</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {questoes.map((questao, index) => (
                <tr key={questao.id} className="border-t border-border">
                  <td className="px-3 py-2 font-medium">{questao.numero}</td>
                  <td className="px-3 py-2">{TIPO_LABEL[questao.tipo]}</td>
                  <td className="px-3 py-2">
                    <FormatoQuestao
                      questao={questao}
                      onChange={(patch) => update.mutate({ questao, patch })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <GabaritoInput
                      questao={questao}
                      onChange={(gabarito) =>
                        update.mutate({ questao, patch: { gabarito } })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <DecimalInput
                      value={questao.valor}
                      label={`Valor do item ${questao.numero}`}
                      onChange={(valor) => update.mutate({ questao, patch: { valor } })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <DecimalInput
                      value={questao.desconto_erro}
                      label={`Desconto do item ${questao.numero}`}
                      onChange={(desconto_erro) =>
                        update.mutate({ questao, patch: { desconto_erro } })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-8 min-w-40"
                      defaultValue={questao.conteudo ?? ""}
                      onBlur={(event) => {
                        const conteudo = event.currentTarget.value.trim() || null;
                        if (conteudo !== questao.conteudo) {
                          update.mutate({ questao, patch: { conteudo } });
                        }
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Checkbox
                      checked={questao.anulada}
                      onCheckedChange={(checked) =>
                        update.mutate({ questao, patch: { anulada: Boolean(checked) } })
                      }
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Mover para cima"
                        disabled={index === 0 || move.isPending}
                        onClick={() => move.mutate({ id: questao.id, novaPosicao: index })}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Mover para baixo"
                        disabled={index === questoes.length - 1 || move.isPending}
                        onClick={() =>
                          move.mutate({ id: questao.id, novaPosicao: index + 2 })
                        }
                      >
                        <ArrowDown className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Duplicar item"
                        disabled={duplicate.isPending}
                        onClick={() => duplicate.mutate(questao)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Excluir item"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(questao.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {questoes.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">
                    Adicione a primeira questão acima.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FormatoQuestao({
  questao,
  onChange,
}: {
  questao: Questao;
  onChange: (patch: Partial<Questao>) => void;
}) {
  if (questao.tipo === "mc") {
    return (
      <Select
        value={String(questao.qtd_alternativas ?? 5)}
        onValueChange={(value) => onChange({ qtd_alternativas: Number(value) })}
      >
        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {[2, 3, 4, 5, 6, 7].map((value) => (
            <SelectItem key={value} value={String(value)}>{value} alt.</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (questao.tipo === "num") {
    return (
      <Select
        value={String(questao.num_digitos ?? 3)}
        onValueChange={(value) => onChange({ num_digitos: Number(value) })}
      >
        <SelectTrigger className="h-8 w-28"><SelectValue /></SelectTrigger>
        <SelectContent>
          {[1, 2, 3, 4].map((value) => (
            <SelectItem key={value} value={String(value)}>{value} díg.</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <span className="text-muted-foreground">
      {questao.tipo === "ce" ? "C ou E" : "Correção manual"}
    </span>
  );
}

function DecimalInput({
  value,
  label,
  onChange,
}: {
  value: number;
  label: string;
  onChange: (value: number) => void;
}) {
  const formatted = formatDecimal(value);
  return (
    <Input
      key={formatted}
      className="h-8 min-w-20"
      inputMode="decimal"
      defaultValue={formatted}
      aria-label={label}
      onBlur={(event) => {
        const parsed = parseNonNegativeDecimal(event.currentTarget.value);
        if (parsed === null) {
          toast.error("Informe um valor igual ou maior que zero.");
          event.currentTarget.value = formatted;
          return;
        }
        event.currentTarget.value = formatDecimal(parsed);
        if (parsed !== value) onChange(parsed);
      }}
    />
  );
}

function GabaritoInput({
  questao,
  onChange,
}: {
  questao: Questao;
  onChange: (value: string | null) => void;
}) {
  if (questao.tipo === "disc") {
    return <span className="text-xs text-muted-foreground">Manual</span>;
  }

  if (questao.tipo === "mc" || questao.tipo === "ce") {
    return (
      <Select value={questao.gabarito ?? ""} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-24"><SelectValue placeholder="—" /></SelectTrigger>
        <SelectContent>
          {alternativas(questao).map((option) => (
            <SelectItem key={option} value={option}>{option}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  const digits = questao.num_digitos ?? 3;
  return (
    <Input
      key={`${questao.id}-${questao.gabarito ?? ""}-${digits}`}
      className="h-8 w-28"
      maxLength={digits}
      placeholder={"0".repeat(digits)}
      defaultValue={questao.gabarito ?? ""}
      onBlur={(event) => {
        const raw = event.currentTarget.value.replace(/\D/g, "");
        const value = raw ? raw.padStart(digits, "0").slice(-digits) : null;
        if (value !== questao.gabarito) onChange(value);
      }}
    />
  );
}

function GabaritoTab({ avaliacaoId }: { avaliacaoId: string }) {
  const questoesQuery = useQuery({
    queryKey: questoesKey(avaliacaoId),
    queryFn: () => listQuestoes(avaliacaoId),
  });
  const questoes = questoesQuery.data ?? [];
  const semGabarito = questoes.filter(
    (questao) => questao.tipo !== "disc" && !questao.anulada && !questao.gabarito,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold mb-2">Verificação do gabarito</h3>
        <div className="grid gap-2 text-sm sm:grid-cols-3">
          <span>Total: <strong>{questoes.length}</strong></span>
          <span>Sem gabarito: <strong className={semGabarito.length ? "text-destructive" : ""}>{semGabarito.length}</strong></span>
          <span>Anuladas: <strong>{questoes.filter((q) => q.anulada).length}</strong></span>
        </div>
        {semGabarito.length > 0 && (
          <p className="mt-2 text-sm text-destructive">
            Cadastre o gabarito das questões: {semGabarito.map((q) => q.numero).join(", ")}.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr><th className="px-3 py-2">Nº</th><th className="px-3 py-2">Tipo</th><th className="px-3 py-2">Gabarito</th><th className="px-3 py-2">Valor</th></tr>
          </thead>
          <tbody>
            {questoes.map((questao) => (
              <tr key={questao.id} className="border-t border-border">
                <td className="px-3 py-2 font-medium">{questao.numero}</td>
                <td className="px-3 py-2">{TIPO_LABEL[questao.tipo]}</td>
                <td className="px-3 py-2 font-mono">
                  {questao.tipo === "disc" ? "manual" : questao.anulada ? "— (anulada)" : questao.gabarito || <span className="text-destructive">faltando</span>}
                </td>
                <td className="px-3 py-2">{questao.valor}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FolhaTab({ avaliacao, questoes }: { avaliacao: Avaliacao; questoes: Questao[] }) {
  const queryClient = useQueryClient();
  const [orientation, setOrientation] = useState<AnswerSheetOrientation>(
    DEFAULT_ANSWER_SHEET_LAYOUT.orientation,
  );
  const [columns, setColumns] = useState(DEFAULT_ANSWER_SHEET_LAYOUT.columns);
  const [rowsPerColumn, setRowsPerColumn] = useState(DEFAULT_ANSWER_SHEET_LAYOUT.rowsPerColumn);
  const [identificationMode, setIdentificationMode] =
    useState<AnswerSheetIdentificationMode>("none");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [identifierDigitsOverride, setIdentifierDigitsOverride] = useState<number | null>(null);
  const hydratedModelIdRef = useRef<string | null>(null);
  const [preview, setPreview] = useState<{
    identification: IdentificacaoFolhaResposta | null;
    identificationMode: AnswerSheetIdentificationMode;
    identifierDigits: number;
    aluno: Aluno | null;
    eligibleStudents: Aluno[];
    persistenceUnavailable?: boolean;
  } | null>(null);

  const savedModel = useQuery({
    queryKey: ["firebase-modelo-folha", avaliacao.id],
    queryFn: () => getLatestAnswerSheetModel(avaliacao.id),
  });
  const students = useQuery({
    queryKey: alunosKey(avaliacao.turma_id ?? ""),
    queryFn: () =>
      avaliacao.turma_id ? listAlunosByTurma(avaliacao.turma_id) : Promise.resolve([]),
    enabled: Boolean(avaliacao.turma_id),
  });

  useEffect(() => {
    const model = savedModel.data;
    if (!model || hydratedModelIdRef.current === model.id) return;
    try {
      const restored = restoreAnswerSheetModel(model, avaliacao);
      setOrientation(restored.layout.orientation);
      setColumns(restored.layout.columns);
      setRowsPerColumn(restored.layout.rowsPerColumn);
      setIdentificationMode(restored.identification.mode);
      setIdentifierDigitsOverride(restored.identification.digits);
      hydratedModelIdRef.current = model.id;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível carregar o padrão salvo.");
    }
  }, [avaliacao, savedModel.data]);

  const derivedIdentifierDigits = determineIdentifierDigits(students.data ?? []);
  const identifierDigits = clampIdentifierDigits(identifierDigitsOverride ?? derivedIdentifierDigits);
  const eligibleStudents = (students.data ?? []).filter((student) =>
    isStudentEligibleForPrefilledSheet(student, identifierDigits),
  );
  const effectiveStudentId = selectedStudentId || eligibleStudents[0]?.id || "";
  const selectedStudent =
    eligibleStudents.find((student) => student.id === effectiveStudentId) ?? null;
  const maxColumns = orientation === "portrait" ? 4 : 6;
  const maxRows = orientation === "portrait" ? 35 : 25;
  const effectiveColumns = Math.min(maxColumns, Math.max(1, columns));
  const effectiveRows = Math.min(maxRows, Math.max(5, rowsPerColumn));
  const layout: AnswerSheetLayout = {
    columns: effectiveColumns,
    rowsPerColumn: effectiveRows,
    orientation,
  };

  const generateSheet = useMutation({
    mutationFn: () => {
      if (identificationMode === "prefilled" && !selectedStudent) {
        throw new Error("Selecione um aluno com matrícula numérica para gerar esta folha.");
      }
      return createOrGetAnswerSheet({
        avaliacao,
        questoes,
        alunoId: identificationMode === "prefilled" ? selectedStudent?.id : undefined,
        layout,
        identificationMode,
        identifierDigits,
      });
    },
    onSuccess: async (identification) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["firebase-modelo-folha", avaliacao.id] }),
        queryClient.invalidateQueries({ queryKey: ["answer-sheet-models", avaliacao.id] }),
      ]);
      setPreview({
        identification,
        identificationMode,
        identifierDigits,
        aluno: identificationMode === "prefilled" ? selectedStudent : null,
        eligibleStudents,
      });
      toast.success(`Folha ${identification.codigo} · versão ${identification.versao}.`);
    },
    onError: (error: Error) => {
      if (isAnswerSheetPersistenceUnavailable(error)) {
        setPreview({
          identification: null,
          identificationMode,
          identifierDigits,
          aluno: identificationMode === "prefilled" ? selectedStudent : null,
          eligibleStudents,
          persistenceUnavailable: true,
        });
        toast.warning("Prévia aberta. A persistência da folha ainda não está disponível.");
        return;
      }
      toast.error(error.message || "Não foi possível salvar a folha.");
    },
  });

  function changeOrientation(value: AnswerSheetOrientation) {
    setOrientation(value);
    if (value === "portrait" && columns > 4) setColumns(4);
    if (value === "landscape" && rowsPerColumn > 25) setRowsPerColumn(25);
  }

  function applyCompactDefault() {
    setOrientation(DEFAULT_ANSWER_SHEET_LAYOUT.orientation);
    setColumns(DEFAULT_ANSWER_SHEET_LAYOUT.columns);
    setRowsPerColumn(DEFAULT_ANSWER_SHEET_LAYOUT.rowsPerColumn);
  }

  if (preview) {
    return (
      <EmbeddedAnswerSheetPreview
        avaliacao={avaliacao}
        questoes={questoes}
        layout={layout}
        identification={preview.identification}
        identificationMode={preview.identificationMode}
        identifierDigits={preview.identifierDigits}
        aluno={preview.aluno}
        eligibleStudents={preview.eligibleStudents}
        persistenceUnavailable={preview.persistenceUnavailable}
        onBack={() => setPreview(null)}
      />
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px] xl:items-start">
      <section className="min-w-0 overflow-hidden rounded-lg border border-border bg-muted/30">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold">
              <LayoutGrid className="h-4 w-4" /> Prévia da folha
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              O bloco compacto acompanha automaticamente os controles ao lado.
            </p>
          </div>
          <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
            {effectiveColumns} × {effectiveRows} · até {effectiveColumns * effectiveRows} itens
          </span>
        </div>

        {questoes.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            Cadastre ao menos uma questão para visualizar a folha.
          </div>
        ) : (
          <div className="answer-sheet-inline-viewport max-h-[78vh] max-w-full overflow-auto">
            <div className="answer-sheet-export-root">
              <AnswerSheet
                avaliacao={avaliacao}
                questoes={questoes}
                aluno={identificationMode === "prefilled" ? selectedStudent : null}
                layout={layout}
                identificationMode={identificationMode}
                identifierDigits={identifierDigits}
              />
            </div>
          </div>
        )}
      </section>

      <aside className="space-y-4 xl:sticky xl:top-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">Configuração</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Escolha a identificação e o formato.
              </p>
            </div>
            <Button type="button" size="sm" variant="ghost" onClick={applyCompactDefault}>
              Usar padrão
            </Button>
          </div>

          <div className="mt-4 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Identificação</legend>
              <div className="grid gap-2">
                {(
                  [
                    ["none", "Sem identificação", "Somente os itens e as bolhas."],
                    ["blank", "Matrícula para preencher", "O aluno escreve e marca a matrícula."],
                    [
                      "prefilled",
                      "Matrícula já preenchida",
                      "Nome, dígitos e bolhas vêm preenchidos.",
                    ],
                  ] as const
                ).map(([value, label, description]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setIdentificationMode(value)}
                    className={`rounded-md border px-3 py-2 text-left transition ${
                      identificationMode === value
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted/50"
                    }`}
                    aria-pressed={identificationMode === value}
                  >
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {description}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {identificationMode === "blank" && (
              <div className="space-y-1.5">
                <Label htmlFor="sheet-blank-digits">Quantidade de algarismos da matrícula</Label>
                <Input
                  id="sheet-blank-digits"
                  type="number"
                  min={MIN_IDENTIFIER_DIGITS}
                  max={MAX_IDENTIFIER_DIGITS}
                  value={identifierDigits}
                  onChange={(event) =>
                    setIdentifierDigitsOverride(clampIdentifierDigits(Number(event.target.value)))
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Entre {MIN_IDENTIFIER_DIGITS} e {MAX_IDENTIFIER_DIGITS} dígitos.
                </p>
              </div>
            )}

            {identificationMode === "prefilled" && (
              <div className="space-y-1.5">
                <Label>Aluno exibido na prévia</Label>
                <Select value={effectiveStudentId} onValueChange={setSelectedStudentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o aluno" />
                  </SelectTrigger>
                  <SelectContent>
                    {eligibleStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.nome} · {student.matricula}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {students.isPending ? (
                  <p className="text-xs text-muted-foreground">Carregando alunos…</p>
                ) : eligibleStudents.length === 0 ? (
                  <p className="text-xs font-medium text-amber-700">
                    Nenhum aluno possui matrícula numérica compatível.
                  </p>
                ) : eligibleStudents.length < (students.data?.length ?? 0) ? (
                  <p className="text-xs text-amber-700">
                    Matrículas ausentes ou não numéricas serão ignoradas no pacote.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    A exportação em lote incluirá {eligibleStudents.length} aluno
                    {eligibleStudents.length === 1 ? "" : "s"}.
                  </p>
                )}
              </div>
            )}

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Distribuição</legend>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => changeOrientation("portrait")}
                  className={`flex flex-col items-center gap-2 rounded-md border px-3 py-3 text-sm transition ${
                    orientation === "portrait"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                  aria-pressed={orientation === "portrait"}
                >
                  <RectangleVertical className="h-6 w-6" /> Vertical
                </button>
                <button
                  type="button"
                  onClick={() => changeOrientation("landscape")}
                  className={`flex flex-col items-center gap-2 rounded-md border px-3 py-3 text-sm transition ${
                    orientation === "landscape"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                  aria-pressed={orientation === "landscape"}
                >
                  <RectangleHorizontal className="h-6 w-6" /> Horizontal
                </button>
              </div>
            </fieldset>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Colunas</Label>
                <Select
                  value={String(effectiveColumns)}
                  onValueChange={(value) => setColumns(Number(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxColumns }, (_, index) => index + 1).map((value) => (
                      <SelectItem key={value} value={String(value)}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sheet-rows">Itens/coluna</Label>
                <Input
                  id="sheet-rows"
                  type="number"
                  min={5}
                  max={maxRows}
                  value={effectiveRows}
                  onChange={(event) =>
                    setRowsPerColumn(
                      Math.min(maxRows, Math.max(5, Number(event.target.value) || 5)),
                    )
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-sm font-medium">
            {savedModel.isPending
              ? "Carregando padrão salvo…"
              : savedModel.data
                ? `Padrão atual: versão ${savedModel.data.versao}`
                : "Nenhum padrão salvo"}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Ao salvar, este formato passa a ser o padrão da avaliação e da próxima leitura.
          </p>
          <Button
            type="button"
            className="mt-4 w-full"
            onClick={() => generateSheet.mutate()}
            disabled={
              generateSheet.isPending ||
              savedModel.isPending ||
              questoes.length === 0 ||
              (identificationMode === "prefilled" && !selectedStudent)
            }
          >
            {generateSheet.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileText className="mr-2 h-4 w-4" />
            )}
            Salvar padrão e abrir folha
          </Button>
        </div>
      </aside>
    </div>
  );
}

type AnswerSheetExportState = "individual-pdf" | "individual-png" | "batch-pdf" | "batch-png";

function EmbeddedAnswerSheetPreview({
  avaliacao,
  questoes,
  aluno,
  layout,
  identification,
  identificationMode,
  identifierDigits,
  eligibleStudents,
  persistenceUnavailable = false,
  onBack,
}: {
  avaliacao: Avaliacao;
  questoes: Questao[];
  aluno?: Aluno | null;
  layout: AnswerSheetLayout;
  identification: IdentificacaoFolhaResposta | null;
  identificationMode: AnswerSheetIdentificationMode;
  identifierDigits: number;
  eligibleStudents: Aluno[];
  persistenceUnavailable?: boolean;
  onBack: () => void;
}) {
  const exportRootRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState<AnswerSheetExportState | null>(null);
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number } | null>(null);
  const isPrefilled = identificationMode === "prefilled";
  const busy = exporting !== null;

  async function exportIndividual(format: "pdf" | "png") {
    if (!exportRootRef.current || !identification) {
      toast.warning("Salve a folha antes de exportar.");
      return;
    }
    setExporting(`individual-${format}`);
    try {
      const title = `${avaliacao.titulo}-${aluno?.nome ?? "folha"}-${identification.codigo}`;
      if (format === "pdf") await exportAnswerSheetAsPdf(exportRootRef.current, title);
      else await exportAnswerSheetAsPng(exportRootRef.current, title);
      toast.success(format === "pdf" ? "PDF gerado com sucesso." : "PNG gerado com sucesso.");
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o arquivo.");
    } finally {
      setExporting(null);
    }
  }

  async function exportBatch(format: "pdf" | "png") {
    if (!identification || eligibleStudents.length === 0) {
      toast.warning("Nenhum aluno com matrícula numérica está disponível.");
      return;
    }
    setExporting(`batch-${format}`);
    setBatchProgress({ done: 0, total: eligibleStudents.length });
    try {
      const items: { fileName: string; element: ReactElement }[] = [];
      for (const student of eligibleStudents) {
        const sheet = await createOrGetAnswerSheet({
          avaliacao,
          questoes,
          alunoId: student.id,
          layout,
          identificationMode: "prefilled",
          identifierDigits,
        });
        items.push({
          fileName: `${avaliacao.titulo}-${student.nome}-${student.matricula}-${sheet.codigo}`,
          element: (
            <AnswerSheet
              avaliacao={avaliacao}
              questoes={questoes}
              aluno={student}
              layout={layout}
              identificationMode="prefilled"
              identifierDigits={identifierDigits}
              identification={{
                code: sheet.codigo,
                version: sheet.versao,
                qrPayload: sheet.qrPayload,
              }}
            />
          ),
        });
      }
      await batchExportAnswerSheetsAsZip({
        format,
        items,
        zipBaseName: `${avaliacao.titulo}-${format}`,
        onProgress: (done, total) => setBatchProgress({ done, total }),
      });
      toast.success(`Pacote com ${items.length} folhas gerado com sucesso.`);
    } catch (error) {
      console.error(error);
      toast.error("Não foi possível gerar o pacote da turma.");
    } finally {
      setExporting(null);
      setBatchProgress(null);
    }
  }

  function printAnswerSheet() {
    if (!identification) {
      toast.warning("Salve a folha antes de imprimir.");
      return;
    }
    document.body.classList.add("printing-answer-sheet");
    try {
      window.print();
    } finally {
      document.body.classList.remove("printing-answer-sheet");
    }
  }

  return (
    <div className="answer-sheet-inline-preview overflow-hidden rounded-lg border border-border bg-muted/30">
      <style>{`@media print { @page { size: auto; margin: 0; } }`}</style>
      <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card p-4">
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={busy}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
          <div>
            <div className="font-medium">{aluno ? `Folha de ${aluno.nome}` : "Folha genérica"}</div>
            <div className="text-xs text-muted-foreground">
              {layout.columns} coluna{layout.columns === 1 ? "" : "s"} · formato compacto
            </div>
            {identification && (
              <div className="mt-1 font-mono text-xs text-muted-foreground">
                {identification.codigo} · versão {identification.versao}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportIndividual("png")}
            disabled={busy || !identification}
          >
            {exporting === "individual-png" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileImage className="mr-2 h-4 w-4" />
            )}
            {isPrefilled ? "PNG deste aluno" : "Baixar PNG"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => void exportIndividual("pdf")}
            disabled={busy || !identification}
          >
            {exporting === "individual-pdf" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            {isPrefilled ? "PDF deste aluno" : "Baixar PDF"}
          </Button>
          {isPrefilled && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => void exportBatch("png")}
                disabled={busy || !identification || eligibleStudents.length === 0}
              >
                {exporting === "batch-png" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileImage className="mr-2 h-4 w-4" />
                )}
                PNGs da turma (.zip)
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void exportBatch("pdf")}
                disabled={busy || !identification || eligibleStudents.length === 0}
              >
                {exporting === "batch-pdf" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                PDFs da turma (.zip)
              </Button>
            </>
          )}
          <Button type="button" onClick={printAnswerSheet} disabled={busy || !identification}>
            <Printer className="mr-2 h-4 w-4" /> Imprimir
          </Button>
        </div>
      </div>

      {batchProgress && (
        <div className="no-print border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
          Gerando pacote… {batchProgress.done}/{batchProgress.total} alunos
        </div>
      )}
      {persistenceUnavailable && (
        <div className="no-print flex gap-3 border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-medium">Prévia temporária.</div>
            <p className="mt-0.5 text-amber-800">
              A persistência não está disponível; impressão e downloads permanecem bloqueados.
            </p>
          </div>
        </div>
      )}

      <div className="answer-sheet-inline-viewport max-w-full overflow-x-auto">
        <div ref={exportRootRef} className="answer-sheet-export-root">
          <AnswerSheet
            avaliacao={avaliacao}
            questoes={questoes}
            aluno={aluno}
            layout={layout}
            identificationMode={identificationMode}
            identifierDigits={identifierDigits}
            identification={
              identification
                ? {
                    code: identification.codigo,
                    version: identification.versao,
                    qrPayload: identification.qrPayload,
                  }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
function CorrecaoTab({ avaliacao }: { avaliacao: Avaliacao }) {
  const avaliacaoId = avaliacao.id;
  const turmaId = avaliacao.turma_id;
  const queryClient = useQueryClient();
  const questoesQuery = useQuery({ queryKey: questoesKey(avaliacaoId), queryFn: () => listQuestoes(avaliacaoId) });
  const alunosQuery = useQuery({ queryKey: alunosKey(turmaId ?? ""), queryFn: () => turmaId ? listAlunosByTurma(turmaId) : Promise.resolve([]), enabled: Boolean(turmaId) });
  const respostasQuery = useQuery({ queryKey: respostasKey(avaliacaoId), queryFn: () => listRespostasByAvaliacao(avaliacaoId) });
  const [alunoId, setAlunoId] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const active = alunoId ?? alunosQuery.data?.[0]?.id ?? null;
  const activeAluno = alunosQuery.data?.find((aluno) => aluno.id === active) ?? null;

  const answersByQuestion = useMemo(() => {
    const map = new Map<string, string>();
    respostasQuery.data?.filter((resposta) => resposta.aluno_id === active).forEach((resposta) => map.set(resposta.questao_id, resposta.resposta ?? ""));
    return map;
  }, [respostasQuery.data, active]);

  const save = useMutation({
    mutationFn: ({ questaoId, valor }: { questaoId: string; valor: string }) => {
      if (!turmaId || !active) throw new Error("Selecione uma turma e um aluno.");
      return saveResposta({ avaliacaoId, turmaId, alunoId: active, questaoId, resposta: valor || null });
    },
    onSuccess: async (saved) => {
      queryClient.setQueryData(respostasKey(avaliacaoId), (current: Awaited<ReturnType<typeof listRespostasByAvaliacao>> = []) => {
        const exists = current.some((item) => item.id === saved.id);
        return exists ? current.map((item) => item.id === saved.id ? saved : item) : [...current, saved];
      });
      await queryClient.invalidateQueries({ queryKey: respostasKey(avaliacaoId) });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const setStatus = useMutation({
    mutationFn: (status: StatusAvaliacao) => updateAvaliacao(avaliacao, { status }),
    onSuccess: async (updated) => {
      queryClient.setQueryData(avaliacaoKey(avaliacaoId), updated);
      await queryClient.invalidateQueries({ queryKey: ["avaliacoes"] });
      toast.success("Situação da avaliação atualizada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  let manualContent: ReactNode;
  if (!turmaId) manualContent = <p className="text-muted-foreground">Associe uma turma para registrar respostas.</p>;
  else if (!alunosQuery.data?.length) manualContent = <p className="text-muted-foreground">Cadastre alunos na turma.</p>;
  else if (!questoesQuery.data?.length) manualContent = <p className="text-muted-foreground">Cadastre as questões antes.</p>;
  else manualContent = (
    <div className="grid gap-4 md:grid-cols-[260px_1fr]">
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">Alunos</div>
        {alunosQuery.data.map((aluno) => {
          const filled = respostasQuery.data?.filter((r) => r.aluno_id === aluno.id && r.resposta).length ?? 0;
          return <button key={aluno.id} type="button" onClick={() => setAlunoId(aluno.id)} className={`w-full border-b border-border px-3 py-2 text-left text-sm last:border-0 hover:bg-muted/50 ${active === aluno.id ? "bg-muted" : ""}`}><div className="font-medium">{aluno.nome}</div><div className="text-xs text-muted-foreground">{filled}/{questoesQuery.data.length} respondidas</div></button>;
        })}
      </div>
      <div className="space-y-3">
        {activeAluno && <div className="flex items-center justify-between rounded-lg border border-border bg-card p-4"><div><div className="font-semibold">{activeAluno.nome}</div><div className="text-xs text-muted-foreground">Informe as respostas marcadas pelo aluno.</div></div><Button size="sm" variant="outline" disabled={setStatus.isPending} onClick={() => setStatus.mutate("corrigida")}>Marcar como corrigida</Button></div>}
        <div className="divide-y divide-border rounded-lg border border-border bg-card">
          {questoesQuery.data.map((questao) => {
            const value = answersByQuestion.get(questao.id) ?? "";
            const result = corrigirQuestao(questao, value);
            return <div key={questao.id} className="flex items-center gap-4 p-3"><div className="w-10 font-medium">{questao.numero}.</div><div className="flex-1"><RespostaInput questao={questao} value={value} onSubmit={(valor) => save.mutate({ questaoId: questao.id, valor })} /></div><div className="w-28 text-right text-xs">{questao.anulada ? <span className="text-muted-foreground">anulada</span> : !value ? <span className="text-muted-foreground">em branco</span> : <span className={`rounded-full px-2 py-0.5 ${result.situacao === "correta" ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}>{result.situacao === "correta" ? "✓ correta" : "✕ incorreta"}</span>}</div></div>;
          })}
        </div>
      </div>
    </div>
  );

  return <div className="space-y-6"><AnswerSheetUploadPanel avaliacao={avaliacao} alunos={alunosQuery.data ?? []} /><section className="overflow-hidden rounded-lg border border-border bg-card"><button type="button" className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-muted/40" onClick={() => setManualOpen((open) => !open)}><div><h2 className="text-lg font-semibold">Correção manual</h2><p className="text-sm text-muted-foreground">Expanda para conferir ou informar as respostas.</p></div><ChevronDown className={`h-5 w-5 transition-transform ${manualOpen ? "rotate-180" : ""}`} /></button>{manualOpen && <div className="border-t border-border p-4">{manualContent}</div>}</section></div>;
}

function RespostaInput({ questao, value, onSubmit }: { questao: Questao; value: string; onSubmit: (value: string) => void }) {
  if (questao.tipo === "disc") return <span className="text-xs text-muted-foreground">Correção discursiva na devolutiva do aluno.</span>;
  if (questao.tipo === "num") {
    const digits = questao.num_digitos ?? 3;
    return <Input key={`${questao.id}-${value}`} className="h-9 w-32 font-mono" defaultValue={value} maxLength={digits} placeholder={"0".repeat(digits)} onBlur={(event) => { const raw = event.currentTarget.value.replace(/\D/g, ""); const normalized = raw ? raw.padStart(digits, "0").slice(-digits) : ""; if (normalized !== value) onSubmit(normalized); }} />;
  }
  return <div className="flex flex-wrap gap-1">{alternativas(questao).map((option) => <button key={option} type="button" className={`h-8 w-8 rounded-full border text-sm font-semibold ${value === option ? "border-primary bg-primary text-primary-foreground" : "border-input hover:bg-muted"}`} onClick={() => onSubmit(value === option ? "" : option)}>{option}</button>)}<button type="button" className="ml-2 text-xs text-muted-foreground hover:text-foreground" onClick={() => onSubmit("")}>limpar</button></div>;
}

function DevolutivaTab({
  avaliacaoId,
  turmaId,
}: {
  avaliacaoId: string;
  turmaId: string | null;
}) {
  const alunosQuery = useQuery({
    queryKey: alunosKey(turmaId ?? ""),
    queryFn: () => (turmaId ? listAlunosByTurma(turmaId) : Promise.resolve([])),
    enabled: Boolean(turmaId),
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [feedbackQueue, setFeedbackQueue] = useState<string[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const alunos = alunosQuery.data ?? [];
  const allSelected = alunos.length > 0 && selectedIds.length === alunos.length;
  const someSelected = selectedIds.length > 0 && !allSelected;
  const activeStudentId = feedbackQueue?.[activeIndex] ?? null;
  const activeStudent = alunos.find((aluno) => aluno.id === activeStudentId) ?? null;

  function toggleStudent(studentId: string, checked: boolean) {
    setSelectedIds((current) =>
      checked
        ? current.includes(studentId)
          ? current
          : [...current, studentId]
        : current.filter((id) => id !== studentId),
    );
  }

  function toggleAllStudents() {
    setSelectedIds(allSelected ? [] : alunos.map((aluno) => aluno.id));
  }

  function startFeedback() {
    const queue = alunos
      .filter((aluno) => selectedIds.includes(aluno.id))
      .map((aluno) => aluno.id);
    if (queue.length === 0) return;
    setFeedbackQueue(queue);
    setActiveIndex(0);
  }

  if (activeStudentId && feedbackQueue) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" onClick={() => setFeedbackQueue(null)}>
              Voltar à lista
            </Button>
            <div>
              <div className="font-semibold">
                {activeStudent?.nome ?? "Aluno selecionado"}
              </div>
              <div className="text-xs text-muted-foreground">
                Aluno {activeIndex + 1} de {feedbackQueue.length}. Salve antes de avançar.
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={activeIndex === 0}
              onClick={() => setActiveIndex((current) => Math.max(0, current - 1))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={activeIndex === feedbackQueue.length - 1}
              onClick={() =>
                setActiveIndex((current) => Math.min(feedbackQueue.length - 1, current + 1))
              }
            >
              Próximo
            </Button>
          </div>
        </div>
        <StudentFeedbackEditor
          key={activeStudentId}
          assessmentId={avaliacaoId}
          studentId={activeStudentId}
          embedded
        />
      </div>
    );
  }

  if (!turmaId) {
    return (
      <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Associe uma turma à avaliação para preparar devolutivas.
      </p>
    );
  }

  if (alunosQuery.isPending) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando alunos…
      </div>
    );
  }

  if (alunosQuery.isError) {
    return <p className="text-sm text-destructive">{message(alunosQuery.error)}</p>;
  }

  if (alunos.length === 0) {
    return (
      <p className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
        Esta turma ainda não possui alunos cadastrados.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <div>
            <h2 className="font-semibold">Escolha os alunos</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Selecione uma pessoa, várias ou a turma inteira para preparar as devolutivas.
            </p>
          </div>
          <Button type="button" variant="outline" onClick={toggleAllStudents}>
            {allSelected ? "Limpar seleção" : "Selecionar toda a turma"}
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-muted-foreground">
              <tr>
                <th className="w-14 px-4 py-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAllStudents}
                    aria-label="Selecionar toda a turma"
                  />
                </th>
                <th className="px-4 py-3">Aluno</th>
                <th className="px-4 py-3">Matrícula</th>
                <th className="px-4 py-3">E-mail</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map((aluno) => {
                const checked = selectedIds.includes(aluno.id);
                return (
                  <tr
                    key={aluno.id}
                    className={`border-t border-border ${checked ? "bg-primary/5" : ""}`}
                  >
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => toggleStudent(aluno.id, value === true)}
                        aria-label={`Selecionar ${aluno.nome}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{aluno.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {aluno.matricula ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{aluno.email ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
        <span className="text-sm text-muted-foreground">
          {selectedIds.length === 0
            ? "Nenhum aluno selecionado."
            : `${selectedIds.length} aluno${selectedIds.length === 1 ? "" : "s"} selecionado${selectedIds.length === 1 ? "" : "s"}.`}
        </span>
        <Button type="button" disabled={selectedIds.length === 0} onClick={startFeedback}>
          Fazer devolutiva para {selectedIds.length === 1 ? "este aluno" : "estes alunos"}
        </Button>
      </div>
    </div>
  );
}

function RelatorioTab({ avaliacaoId, turmaId }: { avaliacaoId: string; turmaId: string | null }) {
  const questoesQuery = useQuery({ queryKey: questoesKey(avaliacaoId), queryFn: () => listQuestoes(avaliacaoId) });
  const alunosQuery = useQuery({ queryKey: alunosKey(turmaId ?? ""), queryFn: () => turmaId ? listAlunosByTurma(turmaId) : Promise.resolve([]), enabled: Boolean(turmaId) });
  const respostasQuery = useQuery({ queryKey: respostasKey(avaliacaoId), queryFn: () => listRespostasByAvaliacao(avaliacaoId) });

  if (!questoesQuery.data?.length || !alunosQuery.data?.length) return <p className="text-muted-foreground">Cadastre questões e alunos.</p>;

  const notas = alunosQuery.data.map((aluno) => ({ aluno, ...calcularNotaAluno(questoesQuery.data, (respostasQuery.data ?? []).filter((resposta) => resposta.aluno_id === aluno.id)) }));
  const values = notas.map((item) => item.nota).sort((a, b) => a - b);
  const media = values.reduce((sum, value) => sum + value, 0) / values.length;
  const middle = Math.floor(values.length / 2);
  const mediana = values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
  const aproveitamento = questoesQuery.data.map((questao) => {
    let correct = 0; let total = 0;
    for (const aluno of alunosQuery.data) {
      const response = respostasQuery.data?.find((item) => item.aluno_id === aluno.id && item.questao_id === questao.id);
      if (!response?.resposta) continue;
      total += 1;
      if (corrigirQuestao(questao, response.resposta).situacao === "correta") correct += 1;
    }
    return { questao, correct, total, percent: total ? Math.round((correct / total) * 100) : 0 };
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Média" value={media.toFixed(2)} />
        <Stat label="Mediana" value={mediana.toFixed(2)} />
        <Stat label="Maior" value={(values.at(-1) ?? 0).toFixed(2)} />
        <Stat label="Menor" value={(values[0] ?? 0).toFixed(2)} />
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3 font-semibold">Notas por aluno</div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2">Aluno</th>
              <th className="px-4 py-2">Nota</th>
              <th className="px-4 py-2">Acertos</th>
              <th className="px-4 py-2">Erros</th>
              <th className="px-4 py-2">Branco</th>
            </tr>
          </thead>
          <tbody>
            {notas.map((item) => (
              <tr key={item.aluno.id} className="border-t border-border">
                <td className="px-4 py-2">{item.aluno.nome}</td>
                <td className="px-4 py-2 font-semibold">{item.nota.toFixed(2)}</td>
                <td className="px-4 py-2">{item.acertos}</td>
                <td className="px-4 py-2">{item.erros}</td>
                <td className="px-4 py-2">{item.branco}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="border-b border-border px-4 py-3 font-semibold">
          % de acerto por questão
        </div>
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2">Nº</th>
              <th className="px-4 py-2">Conteúdo</th>
              <th className="px-4 py-2">Acertos</th>
              <th className="px-4 py-2">Aproveitamento</th>
            </tr>
          </thead>
          <tbody>
            {aproveitamento.map(({ questao, correct, total, percent }) => (
              <tr key={questao.id} className="border-t border-border">
                <td className="px-4 py-2 font-medium">{questao.numero}</td>
                <td className="px-4 py-2">{questao.conteudo ?? "—"}</td>
                <td className="px-4 py-2">
                  {correct}/{total}
                </td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="w-10 text-right text-xs">{percent}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border bg-card p-4"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-2xl font-bold">{value}</div></div>;
}

function parseNonNegativeDecimal(value: string): number | null {
  const parsed = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed * 100) / 100;
}

function formatDecimal(value: number): string {
  return String(Math.round(value * 100) / 100);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
