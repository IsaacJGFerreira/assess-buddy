import type { CSSProperties } from "react";
import { QRCodeSVG } from "qrcode.react";

import { alternativas, type Aluno, type Avaliacao, type Questao } from "@/lib/domain";
import type { AnswerSheetLayout } from "@/lib/answer-sheet-layout";

interface AnswerSheetProps {
  avaliacao: Avaliacao;
  questoes: Questao[];
  aluno?: Aluno | null;
  layout: AnswerSheetLayout;
  identification?: AnswerSheetIdentification | null;
}

export interface AnswerSheetIdentification {
  code: string;
  version: number;
  qrPayload: string;
}

type SheetPage =
  | { kind: "main"; questions: Questao[]; numericQuestions: Questao[] }
  | { kind: "numeric"; questions: Questao[]; numericQuestions: Questao[] };

export function AnswerSheet({
  avaliacao,
  questoes,
  aluno,
  layout,
  identification,
}: AnswerSheetProps) {
  const pages = buildPages(questoes, layout);

  return (
    <div className="answer-sheet-document">
      {pages.map((page, index) => (
        <AnswerSheetPage
          key={`${page.kind}-${index}`}
          avaliacao={avaliacao}
          aluno={aluno}
          layout={layout}
          identification={identification}
          page={page}
          pageNumber={index + 1}
          pageCount={pages.length}
        />
      ))}
    </div>
  );
}

function buildPages(questoes: Questao[], layout: AnswerSheetLayout): SheetPage[] {
  const capacity = Math.max(1, layout.columns * layout.rowsPerColumn);
  const groups = chunk(questoes, capacity);
  if (groups.length === 0) groups.push([]);

  return groups.flatMap((questions) => {
    const numericQuestions = questions.filter((question) => question.tipo === "num");
    const numericOnMainPage = layout.columns < 6 ? numericQuestions.slice(0, 4) : [];
    const numericOverflow = layout.columns < 6 ? numericQuestions.slice(4) : numericQuestions;
    const supplements = chunk(numericOverflow, layout.orientation === "landscape" ? 8 : 6);

    return [
      { kind: "main", questions, numericQuestions: numericOnMainPage } as SheetPage,
      ...supplements.map((items) => ({
        kind: "numeric" as const,
        questions: [],
        numericQuestions: items,
      })),
    ];
  });
}

function AnswerSheetPage({
  avaliacao,
  aluno,
  layout,
  identification,
  page,
  pageNumber,
  pageCount,
}: {
  avaliacao: Avaliacao;
  aluno?: Aluno | null;
  layout: AnswerSheetLayout;
  identification?: AnswerSheetIdentification | null;
  page: SheetPage;
  pageNumber: number;
  pageCount: number;
}) {
  const isLandscape = layout.orientation === "landscape";
  const hasNumericPanel = page.numericQuestions.length > 0;
  const columns = Array.from({ length: layout.columns }, (_, column) =>
    page.questions.slice(column * layout.rowsPerColumn, (column + 1) * layout.rowsPerColumn),
  );
  const pageStyle = {
    "--sheet-width": isLandscape ? "297mm" : "210mm",
    "--sheet-height": isLandscape ? "210mm" : "297mm",
    "--sheet-columns": layout.columns,
  } as CSSProperties;

  return (
    <section
      className={`answer-sheet-page ${isLandscape ? "answer-sheet-landscape" : "answer-sheet-portrait"}`}
      style={pageStyle}
      data-page={pageNumber}
    >
      <AlignmentMarkers />

      <header className="answer-sheet-header">
        <div>
          <p className="answer-sheet-kicker">Folha de respostas</p>
          <h1>{avaliacao.titulo}</h1>
          <p>
            {avaliacao.disciplina || "Avaliação"}
            {avaliacao.data_aplicacao ? ` · ${avaliacao.data_aplicacao}` : ""}
            {` · Valor ${avaliacao.valor_total}`}
          </p>
        </div>
        <div className={`answer-sheet-code ${identification ? "has-qr-code" : ""}`}>
          {identification && (
            <QRCodeSVG
              className="answer-sheet-qr-code"
              value={`${identification.qrPayload}|V${identification.version}|P${pageNumber}`}
              size={64}
              level="M"
              bgColor="#ffffff"
              fgColor="#111111"
              title={`Folha ${identification.code}, versão ${identification.version}, página ${pageNumber}`}
            />
          )}
          <div className="answer-sheet-code-text">
            <span>Código da folha</span>
            <strong>
              {identification?.code ?? avaliacao.id.slice(0, 8).toUpperCase()}
            </strong>
            <small>
              {identification ? `Versão ${identification.version} · ` : ""}Página {pageNumber}
            </small>
          </div>
        </div>
      </header>

      <div className="answer-sheet-identification">
        <SheetField label="Nome do aluno" value={aluno?.nome} wide />
        <SheetField label="Turma" />
        <SheetField label="Matrícula" value={aluno?.matricula ?? undefined} />
        <SheetField label="Nº" value={aluno?.chamada?.toString()} />
      </div>

      <div className={`answer-sheet-body ${hasNumericPanel ? "has-numeric-panel" : ""}`}>
        {page.kind === "main" ? (
          <div className="answer-sheet-objective-panel">
            <div className="answer-sheet-section-title">Item / resposta</div>
            <div
              className="answer-sheet-columns"
              style={{ gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))` }}
            >
              {columns.map((items, column) => (
                <div className="answer-sheet-column" key={column}>
                  {items.map((question) => (
                    <QuestionRow
                      key={question.id}
                      question={question}
                      dense={layout.columns >= 5}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="answer-sheet-numeric-intro">
            <p className="answer-sheet-kicker">Complemento numérico</p>
            <h2>Respostas numéricas</h2>
            <p>Marque um algarismo em cada ordem indicada.</p>
          </div>
        )}

        {hasNumericPanel && (
          <aside
            className={`answer-sheet-numeric-panel ${page.kind === "numeric" ? "numeric-only" : ""}`}
          >
            {page.numericQuestions.map((question) => (
              <NumericCard key={question.id} question={question} />
            ))}
          </aside>
        )}
      </div>

      <footer className="answer-sheet-footer">
        <span>Preencha completamente uma única bolha por resposta.</span>
        <span>
          Página {pageNumber} de {pageCount}
        </span>
      </footer>
    </section>
  );
}

function AlignmentMarkers() {
  return (
    <>
      <span className="answer-sheet-marker marker-top-left" />
      <span className="answer-sheet-marker marker-top-right" />
      <span className="answer-sheet-marker marker-bottom-left" />
      <span className="answer-sheet-marker marker-bottom-right" />
    </>
  );
}

function SheetField({ label, value, wide }: { label: string; value?: string; wide?: boolean }) {
  return (
    <div className={wide ? "answer-sheet-field field-wide" : "answer-sheet-field"}>
      <span>{label}</span>
      <strong>{value ?? ""}</strong>
    </div>
  );
}

function QuestionRow({ question, dense }: { question: Questao; dense: boolean }) {
  return (
    <div className={`answer-sheet-question ${dense ? "is-dense" : ""}`}>
      <strong className="answer-sheet-question-number">{question.numero}</strong>
      {question.anulada ? (
        <span className="answer-sheet-question-note">Anulada</span>
      ) : question.tipo === "num" ? (
        <span className="answer-sheet-question-note">Numérica →</span>
      ) : (
        <div className="answer-sheet-bubbles">
          {alternativas(question).map((option) => (
            <Bubble key={option} label={option} dense={dense} />
          ))}
        </div>
      )}
    </div>
  );
}

function NumericCard({ question }: { question: Questao }) {
  const digits = Math.min(4, Math.max(1, question.num_digitos ?? 3));
  const labels = numericPlaceLabels(digits);

  return (
    <div className="answer-sheet-numeric-card">
      <div className="answer-sheet-numeric-title">Item {question.numero}</div>
      <div className="answer-sheet-numeric-grid">
        {labels.map((label) => (
          <div className="answer-sheet-numeric-column" key={label}>
            <strong>{label}</strong>
            {Array.from({ length: 10 }, (_, digit) => (
              <Bubble key={digit} label={String(digit)} dense />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function Bubble({ label, dense = false }: { label: string; dense?: boolean }) {
  return <span className={`answer-sheet-bubble ${dense ? "is-dense" : ""}`}>{label}</span>;
}

function numericPlaceLabels(digits: number): string[] {
  if (digits === 1) return ["U"];
  if (digits === 2) return ["D", "U"];
  if (digits === 3) return ["C", "D", "U"];
  return ["M", "C", "D", "U"];
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
