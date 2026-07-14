import { alternativas, type Aluno, type Avaliacao, type Questao } from "@/lib/domain";
import type { AnswerSheetLayout } from "@/lib/answer-sheet-layout";
import { buildAnswerSheetPages, type AnswerSheetPageDescriptor } from "@/lib/answer-sheet-pages";
import {
  clampIdentifierDigits,
  DEFAULT_IDENTIFIER_DIGITS,
  formatMatriculaForSheet,
  type AnswerSheetIdentificationMode,
} from "@/lib/answer-sheet-identification";

interface AnswerSheetProps {
  avaliacao: Avaliacao;
  questoes: Questao[];
  aluno?: Aluno | null;
  layout: AnswerSheetLayout;
  identification?: AnswerSheetIdentification | null;
  identificationMode?: AnswerSheetIdentificationMode;
  identifierDigits?: number;
}

export interface AnswerSheetIdentification {
  code: string;
  version: number;
  qrPayload: string;
}

export function AnswerSheet({
  questoes,
  aluno,
  layout,
  identificationMode = "none",
  identifierDigits = DEFAULT_IDENTIFIER_DIGITS,
}: AnswerSheetProps) {
  const pages = buildAnswerSheetPages(questoes, layout);
  const digits = clampIdentifierDigits(identifierDigits);
  const matricula =
    identificationMode === "prefilled" ? formatMatriculaForSheet(aluno?.matricula, digits) : null;
  const studentName = identificationMode === "prefilled" ? (aluno?.nome ?? null) : null;

  return (
    <div className="answer-sheet-document">
      {pages.map((page, index) => (
        <AnswerSheetPage
          key={`${page.kind}-${index}`}
          layout={layout}
          page={page}
          pageNumber={index + 1}
          pageCount={pages.length}
          identificationMode={identificationMode}
          identifierDigits={digits}
          matricula={matricula}
          studentName={studentName}
        />
      ))}
    </div>
  );
}

function AnswerSheetPage({
  layout,
  page,
  pageNumber,
  identificationMode,
  identifierDigits,
  matricula,
  studentName,
}: {
  layout: AnswerSheetLayout;
  page: AnswerSheetPageDescriptor;
  pageNumber: number;
  pageCount: number;
  identificationMode: AnswerSheetIdentificationMode;
  identifierDigits: number;
  matricula: string | null;
  studentName: string | null;
}) {
  const isLandscape = layout.orientation === "landscape";
  const hasNumericPanel = page.numericQuestions.length > 0;
  const columnQuestions = page.questions;
  const visibleColumnCount = Math.max(1, Math.min(layout.columns, columnQuestions.length || 1));
  const balancedRows = Math.min(
    layout.rowsPerColumn,
    Math.ceil(columnQuestions.length / visibleColumnCount),
  );
  const columns = Array.from({ length: visibleColumnCount }, (_, column) =>
    columnQuestions.slice(column * balancedRows, (column + 1) * balancedRows),
  );

  return (
    <section
      className={`answer-sheet-page ${isLandscape ? "answer-sheet-landscape" : "answer-sheet-portrait"}`}
      data-page={pageNumber}
    >
      <AlignmentMarkers />

      <div className={`answer-sheet-body ${hasNumericPanel ? "has-numeric-panel" : ""}`}>
        {identificationMode !== "none" && (
          <IdentifierCard
            digits={identifierDigits}
            matricula={matricula}
            pageNumber={pageNumber}
            studentName={studentName}
          />
        )}

        {page.kind === "main" && columnQuestions.length > 0 ? (
          <div className="answer-sheet-objective-panel">
            <div
              className="answer-sheet-columns"
              style={{ gridTemplateColumns: `repeat(${visibleColumnCount}, max-content)` }}
            >
              {columns.map((items, column) => (
                <div className="answer-sheet-column" key={column}>
                  {items.map((question) => (
                    <QuestionRow
                      key={question.id}
                      question={question}
                      dense={layout.columns >= 5}
                      pageNumber={pageNumber}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : page.kind === "numeric" ? (
          <span className="sr-only">Respostas numéricas</span>
        ) : null}

        {hasNumericPanel && (
          <aside
            className={`answer-sheet-numeric-panel ${page.kind === "numeric" || columnQuestions.length === 0 ? "numeric-only" : ""}`}
          >
            {page.numericQuestions.map((question) => (
              <NumericCard key={question.id} question={question} pageNumber={pageNumber} />
            ))}
          </aside>
        )}
      </div>
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

function QuestionRow({
  question,
  dense,
  pageNumber,
}: {
  question: Questao;
  dense: boolean;
  pageNumber: number;
}) {
  return (
    <div className={`answer-sheet-question ${dense ? "is-dense" : ""}`}>
      <strong className="answer-sheet-question-number">{question.numero}</strong>
      {question.anulada ? (
        <span className="answer-sheet-question-note">Anulada</span>
      ) : question.tipo === "disc" ? (
        <span className="answer-sheet-question-note">Discursiva</span>
      ) : question.tipo === "num" ? (
        <span className="answer-sheet-question-note">Numérica →</span>
      ) : (
        <div className="answer-sheet-bubbles">
          {alternativas(question).map((option) => (
            <Bubble
              key={option}
              label={option}
              dense={dense}
              pageNumber={pageNumber}
              question={question}
              value={option}
              kind="objective"
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NumericCard({ question, pageNumber }: { question: Questao; pageNumber: number }) {
  const digits = Math.min(4, Math.max(1, question.num_digitos ?? 3));
  const labels = numericPlaceLabels(digits);

  return (
    <div className="answer-sheet-numeric-card">
      <div className="answer-sheet-numeric-title">Item {question.numero}</div>
      <div className="answer-sheet-numeric-grid">
        {labels.map((label, digitIndex) => (
          <div className="answer-sheet-numeric-column" key={label}>
            <strong>{label}</strong>
            {Array.from({ length: 10 }, (_, digit) => (
              <Bubble
                key={digit}
                label={String(digit)}
                dense
                pageNumber={pageNumber}
                question={question}
                value={String(digit)}
                kind="numeric"
                digitIndex={digitIndex}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function IdentifierCard({
  digits,
  matricula,
  pageNumber,
  studentName,
}: {
  digits: number;
  matricula: string | null;
  pageNumber: number;
  studentName: string | null;
}) {
  return (
    <aside className="answer-sheet-identifier-card" aria-label="Matrícula">
      {studentName && (
        <div className="answer-sheet-identifier-name" title={studentName}>
          {studentName}
        </div>
      )}
      <div className="answer-sheet-identifier-title">Matrícula</div>
      <div className="answer-sheet-identifier-grid">
        {Array.from({ length: digits }, (_, digitIndex) => (
          <div className="answer-sheet-numeric-column" key={digitIndex}>
            <span
              className="answer-sheet-identifier-digit-box"
              aria-label={
                matricula
                  ? `Dígito ${digitIndex + 1} da matrícula`
                  : `Escreva o dígito ${digitIndex + 1} da matrícula`
              }
            >
              {matricula?.[digitIndex] ?? ""}
            </span>
            {Array.from({ length: 10 }, (_, digit) => (
              <Bubble
                key={digit}
                label={String(digit)}
                dense
                pageNumber={pageNumber}
                questionId="__matricula__"
                questionNumber={0}
                value={String(digit)}
                kind="identifier"
                digitIndex={digitIndex}
                filled={matricula?.[digitIndex] === String(digit)}
              />
            ))}
          </div>
        ))}
      </div>
    </aside>
  );
}

function Bubble({
  label,
  dense = false,
  pageNumber,
  question,
  questionId,
  questionNumber,
  value,
  kind,
  digitIndex,
  filled = false,
}: {
  label: string;
  dense?: boolean;
  pageNumber: number;
  question?: Questao;
  questionId?: string;
  questionNumber?: number;
  value: string;
  kind: "objective" | "numeric" | "identifier";
  digitIndex?: number;
  filled?: boolean;
}) {
  const resolvedQuestionId = question?.id ?? questionId;
  const resolvedQuestionNumber = question?.numero ?? questionNumber;
  return (
    <span
      className={`answer-sheet-bubble ${dense ? "is-dense" : ""} ${filled ? "is-prefilled" : ""}`}
      data-omr-bubble="true"
      data-omr-page={pageNumber}
      data-omr-question-id={resolvedQuestionId}
      data-omr-question-number={resolvedQuestionNumber}
      data-omr-kind={kind}
      data-omr-value={value}
      data-omr-digit-index={digitIndex}
      data-omr-prefilled={filled || undefined}
    >
      {label}
    </span>
  );
}

function numericPlaceLabels(digits: number): string[] {
  if (digits === 1) return ["U"];
  if (digits === 2) return ["D", "U"];
  if (digits === 3) return ["C", "D", "U"];
  return ["M", "C", "D", "U"];
}
