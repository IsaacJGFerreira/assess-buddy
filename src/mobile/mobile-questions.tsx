import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Check, Copy, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  TIPO_LABEL,
  alternativas,
  createQuestoes,
  deleteQuestao,
  duplicateQuestao,
  moveQuestao,
  updateQuestao,
  type Questao,
  type TipoQuestao,
} from "@/lib/domain";

import { mobileQueryKeys } from "./mobile-query-keys";
import {
  MobileCard,
  MobileCardHeader,
  MobileEmpty,
  MobileNativeSelect,
  MobileStatusPill,
} from "./mobile-ui";
import { formatDecimal, parseNonNegativeDecimal } from "./mobile-utils";

const QUESTION_TYPES: Array<{ type: TipoQuestao; title: string; detail: string }> = [
  { type: "mc", title: "Múltipla escolha", detail: "Alternativas de A em diante" },
  { type: "ce", title: "Certo ou errado", detail: "Opções C e E" },
  { type: "num", title: "Numérica", detail: "Entre 1 e 4 dígitos" },
  { type: "disc", title: "Discursiva", detail: "Nota manual" },
];

export function MobileQuestions({
  assessmentId,
  questions,
  connected,
}: {
  assessmentId: string;
  questions: Questao[];
  connected: boolean;
}) {
  const queryClient = useQueryClient();
  const [quantities, setQuantities] = useState<Record<TipoQuestao, string>>({
    mc: "1",
    ce: "1",
    num: "1",
    disc: "1",
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: mobileQueryKeys.questions(assessmentId) });

  const add = useMutation({
    mutationFn: ({ type, quantity }: { type: TipoQuestao; quantity: number }) => {
      if (!Number.isInteger(quantity) || quantity < 1 || quantity > 100) {
        throw new Error("Informe uma quantidade inteira entre 1 e 100.");
      }
      const firstNumber = Math.max(0, ...questions.map((item) => item.numero)) + 1;
      return createQuestoes(
        assessmentId,
        Array.from({ length: quantity }, (_, index) => questionDefaults(type, firstNumber + index)),
      );
    },
    onSuccess: async (created, variables) => {
      queryClient.setQueryData<Questao[]>(mobileQueryKeys.questions(assessmentId), (current = []) =>
        [...current, ...created].sort((left, right) => left.numero - right.numero),
      );
      await refresh();
      toast.success(
        variables.quantity === 1
          ? "Questão adicionada."
          : `${variables.quantity} questões adicionadas.`,
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: ({ question, patch }: { question: Questao; patch: Partial<Questao> }) =>
      updateQuestao(question, patch),
    onSuccess: async (updated) => {
      queryClient.setQueryData<Questao[]>(mobileQueryKeys.questions(assessmentId), (current = []) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteQuestao,
    onSuccess: async ({ storageCleanupFailed }, questionId) => {
      queryClient.setQueryData<Questao[]>(mobileQueryKeys.questions(assessmentId), (current = []) =>
        current.filter((item) => item.id !== questionId),
      );
      await refresh();
      toast[storageCleanupFailed ? "warning" : "success"](
        storageCleanupFailed
          ? "Questão apagada; uma imagem vinculada não pôde ser removida."
          : "Questão, respostas, comentários e imagens apagados.",
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const duplicate = useMutation({
    mutationFn: (question: Questao) =>
      duplicateQuestao(question, Math.max(0, ...questions.map((item) => item.numero)) + 1),
    onSuccess: async (created) => {
      queryClient.setQueryData<Questao[]>(mobileQueryKeys.questions(assessmentId), (current = []) =>
        [...current, created].sort((left, right) => left.numero - right.numero),
      );
      await refresh();
      toast.success("Questão duplicada.");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const move = useMutation({
    mutationFn: ({ questionId, position }: { questionId: string; position: number }) =>
      moveQuestao(questions, questionId, position),
    onSuccess: async (reordered) => {
      queryClient.setQueryData(mobileQueryKeys.questions(assessmentId), reordered);
      await refresh();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const withoutAnswer = questions.filter(
    (item) => item.tipo !== "disc" && !item.anulada && !item.gabarito,
  ).length;

  function deleteQuestion(question: Questao) {
    if (
      window.confirm(
        `Apagar a questão ${question.numero}, suas respostas, comentários e imagens vinculadas?`,
      )
    ) {
      remove.mutate(question.id);
    }
  }

  return (
    <div className="mobile-stack">
      <MobileCard>
        <MobileCardHeader
          title="Adicionar questões"
          description="Escolha o tipo e quantas questões deseja criar de uma vez."
        />
        <div className="mobile-question-type-grid">
          {QUESTION_TYPES.map(({ type, title, detail }) => (
            <article key={type}>
              <strong>{title}</strong>
              <p>{detail}</p>
              <div>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  inputMode="numeric"
                  aria-label={`Quantidade de questões ${title}`}
                  value={quantities[type]}
                  onChange={(event) =>
                    setQuantities((current) => ({ ...current, [type]: event.target.value }))
                  }
                />
                <Button
                  type="button"
                  disabled={!connected || add.isPending}
                  onClick={() => add.mutate({ type, quantity: Number(quantities[type]) })}
                >
                  {add.isPending && add.variables?.type === type ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Plus />
                  )}
                  Adicionar
                </Button>
              </div>
            </article>
          ))}
        </div>
      </MobileCard>

      <div className="mobile-summary-strip">
        <span>
          <strong>{questions.length}</strong> questões
        </span>
        <span className={withoutAnswer ? "text-destructive" : "text-emerald-700"}>
          <strong>{withoutAnswer}</strong> sem gabarito
        </span>
        <span>
          <strong>{questions.filter((item) => item.anulada).length}</strong> anuladas
        </span>
      </div>

      {questions.length === 0 ? (
        <MobileEmpty>Adicione a primeira questão usando um dos cartões acima.</MobileEmpty>
      ) : (
        <div className="mobile-stack">
          {questions.map((question, index) => (
            <QuestionCard
              key={question.id}
              question={question}
              index={index}
              total={questions.length}
              disabled={!connected}
              moving={move.isPending}
              updating={update.isPending && update.variables?.question.id === question.id}
              deleting={remove.isPending && remove.variables === question.id}
              duplicating={duplicate.isPending && duplicate.variables?.id === question.id}
              onUpdate={(patch) => update.mutate({ question, patch })}
              onMove={(position) => move.mutate({ questionId: question.id, position })}
              onDuplicate={() => duplicate.mutate(question)}
              onDelete={() => deleteQuestion(question)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({
  question,
  index,
  total,
  disabled,
  moving,
  updating,
  deleting,
  duplicating,
  onUpdate,
  onMove,
  onDuplicate,
  onDelete,
}: {
  question: Questao;
  index: number;
  total: number;
  disabled: boolean;
  moving: boolean;
  updating: boolean;
  deleting: boolean;
  duplicating: boolean;
  onUpdate: (patch: Partial<Questao>) => void;
  onMove: (position: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  function changeType(value: TipoQuestao) {
    onUpdate({
      tipo: value,
      qtd_alternativas: value === "mc" ? 5 : value === "ce" ? 2 : null,
      num_digitos: value === "num" ? 3 : null,
      gabarito: null,
    });
  }

  function updateDecimal(field: "valor" | "desconto_erro", raw: string) {
    const parsed = parseNonNegativeDecimal(raw);
    if (parsed === null) {
      toast.error("Informe um número maior ou igual a zero.");
      return;
    }
    if (parsed !== question[field]) onUpdate({ [field]: parsed });
  }

  return (
    <article className="mobile-card mobile-question-card">
      <div className="mobile-question-header">
        <div>
          <span className="mobile-question-number">{question.numero}</span>
          <div>
            <h2>{TIPO_LABEL[question.tipo]}</h2>
            <p>{question.conteudo || "Sem conteúdo informado"}</p>
          </div>
        </div>
        {updating ? (
          <Loader2 className="animate-spin text-primary" />
        ) : question.anulada ? (
          <MobileStatusPill tone="warning">Anulada</MobileStatusPill>
        ) : question.tipo !== "disc" && !question.gabarito ? (
          <MobileStatusPill tone="danger">Sem gabarito</MobileStatusPill>
        ) : (
          <MobileStatusPill tone="success">
            <Check /> Pronta
          </MobileStatusPill>
        )}
      </div>

      <div className="mobile-form">
        <MobileNativeSelect
          label="Tipo"
          value={question.tipo}
          disabled={disabled || updating}
          onChange={(value) => changeType(value as TipoQuestao)}
        >
          {QUESTION_TYPES.map((item) => (
            <option key={item.type} value={item.type}>
              {item.title}
            </option>
          ))}
        </MobileNativeSelect>

        {question.tipo === "mc" && (
          <MobileNativeSelect
            label="Quantidade de alternativas"
            value={String(question.qtd_alternativas ?? 5)}
            disabled={disabled || updating}
            onChange={(value) => onUpdate({ qtd_alternativas: Number(value), gabarito: null })}
          >
            {[2, 3, 4, 5, 6, 7].map((value) => (
              <option key={value} value={value}>
                {value} alternativas
              </option>
            ))}
          </MobileNativeSelect>
        )}
        {question.tipo === "num" && (
          <MobileNativeSelect
            label="Quantidade de dígitos"
            value={String(question.num_digitos ?? 3)}
            disabled={disabled || updating}
            onChange={(value) => onUpdate({ num_digitos: Number(value), gabarito: null })}
          >
            {[1, 2, 3, 4].map((value) => (
              <option key={value} value={value}>
                {value} dígito{value === 1 ? "" : "s"}
              </option>
            ))}
          </MobileNativeSelect>
        )}

        <QuestionAnswerInput
          question={question}
          disabled={disabled || updating}
          onUpdate={onUpdate}
        />

        <div className="mobile-form-grid">
          <label className="mobile-field">
            <span className="text-sm font-medium">Valor</span>
            <Input
              key={`${question.id}-value-${question.valor}`}
              inputMode="decimal"
              defaultValue={formatDecimal(question.valor)}
              onBlur={(event) => updateDecimal("valor", event.currentTarget.value)}
            />
          </label>
          <label className="mobile-field">
            <span className="text-sm font-medium">Desconto por erro</span>
            <Input
              key={`${question.id}-discount-${question.desconto_erro}`}
              inputMode="decimal"
              defaultValue={formatDecimal(question.desconto_erro)}
              onBlur={(event) => updateDecimal("desconto_erro", event.currentTarget.value)}
            />
          </label>
        </div>

        <label className="mobile-field">
          <span className="text-sm font-medium">Conteúdo</span>
          <Input
            key={`${question.id}-content-${question.conteudo ?? ""}`}
            defaultValue={question.conteudo ?? ""}
            placeholder="Ex.: Cinemática"
            onBlur={(event) => {
              const content = event.currentTarget.value.trim() || null;
              if (content !== question.conteudo) onUpdate({ conteudo: content });
            }}
          />
        </label>

        <label className="mobile-checkbox-row">
          <Checkbox
            checked={question.anulada}
            disabled={disabled || updating}
            onCheckedChange={(checked) => onUpdate({ anulada: Boolean(checked) })}
          />
          <span>
            <strong>Questão anulada</strong>
            <small>Concede o valor integral na correção.</small>
          </span>
        </label>
      </div>

      <div className="mobile-question-actions">
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mover para cima"
          disabled={disabled || moving || index === 0}
          onClick={() => onMove(index)}
        >
          <ArrowUp />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label="Mover para baixo"
          disabled={disabled || moving || index === total - 1}
          onClick={() => onMove(index + 2)}
        >
          <ArrowDown />
        </Button>
        <Button
          type="button"
          variant="outline"
          aria-label="Duplicar questão"
          disabled={disabled || duplicating}
          onClick={onDuplicate}
        >
          {duplicating ? <Loader2 className="animate-spin" /> : <Copy />}
          Duplicar
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="text-destructive"
          aria-label="Apagar questão"
          disabled={disabled || deleting}
          onClick={onDelete}
        >
          {deleting ? <Loader2 className="animate-spin" /> : <Trash2 />}
          Apagar
        </Button>
      </div>
    </article>
  );
}

function QuestionAnswerInput({
  question,
  disabled,
  onUpdate,
}: {
  question: Questao;
  disabled: boolean;
  onUpdate: (patch: Partial<Questao>) => void;
}) {
  if (question.tipo === "disc") {
    return (
      <p className="mobile-field-hint">
        Questão discursiva: a nota será informada na correção manual.
      </p>
    );
  }

  if (question.tipo === "num") {
    const digits = question.num_digitos ?? 3;
    return (
      <label className="mobile-field">
        <span className="text-sm font-medium">Gabarito numérico</span>
        <Input
          key={`${question.id}-answer-${question.gabarito ?? ""}`}
          className="font-mono"
          inputMode="numeric"
          maxLength={digits}
          defaultValue={question.gabarito ?? ""}
          placeholder={"0".repeat(digits)}
          disabled={disabled}
          onBlur={(event) => {
            const raw = event.currentTarget.value.replace(/\D/g, "");
            const answer = raw ? raw.padStart(digits, "0").slice(-digits) : null;
            if (answer !== question.gabarito) onUpdate({ gabarito: answer });
          }}
        />
      </label>
    );
  }

  return (
    <fieldset className="mobile-field">
      <legend className="text-sm font-medium">Gabarito</legend>
      <div className="mobile-answer-options">
        {alternativas(question).map((option) => (
          <button
            type="button"
            key={option}
            className={question.gabarito === option ? "is-selected" : ""}
            disabled={disabled}
            onClick={() => onUpdate({ gabarito: question.gabarito === option ? null : option })}
          >
            {option}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function questionDefaults(type: TipoQuestao, number: number) {
  return {
    numero: number,
    tipo: type,
    valor: 1,
    desconto_erro: 0,
    anulada: false,
    qtd_alternativas: type === "mc" ? 5 : type === "ce" ? 2 : null,
    num_digitos: type === "num" ? 3 : null,
    gabarito: null,
    conteudo: null,
  };
}
