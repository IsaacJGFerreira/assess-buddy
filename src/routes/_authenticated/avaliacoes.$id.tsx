import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { AnswerSheet } from "@/components/answer-sheet";
import { AnswerSheetUploadPanel } from "@/components/answer-sheet-upload-panel";
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
  createQuestoes,
  deleteQuestao,
  duplicateQuestao,
  getAvaliacao,
  listAlunosByTurma,
  listQuestoes,
  listRespostasByAvaliacao,
  moveQuestao,
  saveResposta,
  updateAvaliacao,
  updateQuestao,
  type Aluno,
  type Avaliacao,
  type Questao,
  type StatusAvaliacao,
  type TipoQuestao,
} from "@/lib/domain";

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

function FolhaTab({
  avaliacao,
  questoes,
}: {
  avaliacao: Avaliacao;
  questoes: Questao[];
}) {
  const alunosQuery = useQuery({
    queryKey: alunosKey(avaliacao.turma_id ?? ""),
    queryFn: () =>
      avaliacao.turma_id
        ? listAlunosByTurma(avaliacao.turma_id)
        : Promise.resolve([]),
    enabled: Boolean(avaliacao.turma_id),
  });

  const [alunoId, setAlunoId] = useState("");
  const [colunas, setColunas] = useState("2");
  const [linhas, setLinhas] = useState("35");
  const [orientacao, setOrientacao] =
    useState<"portrait" | "landscape">("portrait");
  const [previewOpen, setPreviewOpen] = useState(false);

  const maxColumns = orientacao === "portrait" ? 4 : 6;
  const maxRows = orientacao === "portrait" ? 35 : 25;

  const columns = Math.min(
    maxColumns,
    Math.max(1, Number(colunas) || 2),
  );

  const rowsPerColumn = Math.min(
    maxRows,
    Math.max(5, Number(linhas) || maxRows),
  );

  const aluno =
    alunosQuery.data?.find((item) => item.id === alunoId) ?? null;

  const layout = {
    columns,
    rowsPerColumn,
    orientation: orientacao,
  };

  if (previewOpen) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-muted/30">
        <div className="no-print flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card p-4">
          <div>
            <h2 className="font-semibold">
              {aluno ? `Folha de ${aluno.nome}` : "Folha genérica"}
            </h2>

            <p className="mt-1 text-xs text-muted-foreground">
              {columns} coluna{columns > 1 ? "s" : ""} · até{" "}
              {rowsPerColumn} itens por coluna ·{" "}
              {orientacao === "portrait" ? "vertical" : "horizontal"}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setPreviewOpen(false)}
            >
              Voltar à configuração
            </Button>

            <Button
              type="button"
              onClick={() => window.print()}
            >
              Imprimir
            </Button>
          </div>
        </div>

        <div className="answer-sheet-inline-viewport max-h-[78vh] max-w-full overflow-auto">
          <div className="answer-sheet-export-root">
            <AnswerSheet
              avaliacao={avaliacao}
              questoes={questoes}
              aluno={aluno}
              layout={layout}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div className="rounded-lg border border-border bg-card p-6">
        <FileText className="h-10 w-10 text-primary" />

        <h2 className="mt-4 text-xl font-semibold">
          Folha de respostas
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Visualize e imprima a folha sem sair desta aba.
        </p>

        <Button
          type="button"
          className="mt-5"
          disabled={questoes.length === 0}
          onClick={() => setPreviewOpen(true)}
        >
          Abrir prévia da folha
        </Button>

        {questoes.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Cadastre ao menos uma questão antes de abrir a prévia.
          </p>
        )}
      </div>

      <div className="space-y-4 rounded-lg border border-border bg-card p-4">
        <h3 className="font-semibold">Configuração rápida</h3>

        <div className="space-y-1.5">
          <Label>Orientação</Label>

          <Select
            value={orientacao}
            onValueChange={(value) => {
              const next = value as "portrait" | "landscape";
              setOrientacao(next);

              if (next === "landscape" && Number(linhas) > 25) {
                setLinhas("25");
              }
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="portrait">Vertical</SelectItem>
              <SelectItem value="landscape">Horizontal</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Colunas</Label>

            <Input
              type="number"
              min={1}
              max={maxColumns}
              value={colunas}
              onChange={(event) => setColunas(event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Itens/coluna</Label>

            <Input
              type="number"
              min={5}
              max={maxRows}
              value={linhas}
              onChange={(event) => setLinhas(event.target.value)}
            />
          </div>
        </div>

        {avaliacao.turma_id && (
          <div className="space-y-1.5">
            <Label>Aluno pré-preenchido</Label>

            <Select
              value={alunoId || "generic"}
              onValueChange={(value) =>
                setAlunoId(value === "generic" ? "" : value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="generic">
                  Folha genérica
                </SelectItem>

                {alunosQuery.data
                  ?.filter((item) =>
                    /^[0-9]+$/.test(item.matricula ?? "")
                  )
                  .map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.nome} · {item.matricula}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        )}
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

  return <div className="space-y-6"><div className="grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Média" value={media.toFixed(2)} /><Stat label="Mediana" value={mediana.toFixed(2)} /><Stat label="Maior" value={(values.at(-1) ?? 0).toFixed(2)} /><Stat label="Menor" value={(values[0] ?? 0).toFixed(2)} /></div><div className="overflow-hidden rounded-lg border border-border bg-card"><div className="border-b border-border px-4 py-3 font-semibold">Notas por aluno</div><table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="px-4 py-2">Aluno</th><th className="px-4 py-2">Nota</th><th className="px-4 py-2">Acertos</th><th className="px-4 py-2">Erros</th><th className="px-4 py-2">Branco</th><th className="px-4 py-2">Devolutiva</th></tr></thead><tbody>{notas.map((item) => <tr key={item.aluno.id} className="border-t border-border"><td className="px-4 py-2">{item.aluno.nome}</td><td className="px-4 py-2 font-semibold">{item.nota.toFixed(2)}</td><td className="px-4 py-2">{item.acertos}</td><td className="px-4 py-2">{item.erros}</td><td className="px-4 py-2">{item.branco}</td><td className="px-4 py-2"><a href={`/avaliacoes/${avaliacaoId}/devolutiva/${item.aluno.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">Ver devolutiva <ExternalLink className="h-3 w-3" /></a></td></tr>)}</tbody></table></div><div className="overflow-hidden rounded-lg border border-border bg-card"><div className="border-b border-border px-4 py-3 font-semibold">% de acerto por questão</div><table className="w-full text-sm"><thead className="bg-muted/50 text-left"><tr><th className="px-4 py-2">Nº</th><th className="px-4 py-2">Conteúdo</th><th className="px-4 py-2">Acertos</th><th className="px-4 py-2">Aproveitamento</th></tr></thead><tbody>{aproveitamento.map(({ questao, correct, total, percent }) => <tr key={questao.id} className="border-t border-border"><td className="px-4 py-2 font-medium">{questao.numero}</td><td className="px-4 py-2">{questao.conteudo ?? "—"}</td><td className="px-4 py-2">{correct}/{total}</td><td className="px-4 py-2"><div className="flex items-center gap-2"><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${percent}%` }} /></div><span className="w-10 text-right text-xs">{percent}%</span></div></td></tr>)}</tbody></table></div></div>;
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
