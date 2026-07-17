/* eslint-disable react-refresh/only-export-components */
import { renderToStaticMarkup } from "react-dom/server";

import { RichComment } from "@/lib/rich-comment";
import {
  questionTypeLabel,
  type FeedbackQuestionAnalysis,
  type FeedbackStatusKey,
} from "@/lib/devolutiva-data";

export function renderFeedbackQuestionCard(analysis: FeedbackQuestionAnalysis): string {
  return renderToStaticMarkup(<FeedbackQuestionCard analysis={analysis} />);
}

function FeedbackQuestionCard({ analysis }: { analysis: FeedbackQuestionAnalysis }) {
  const { question, result, distribution, distributionAvailable, distributionTitle } = analysis;
  const generalComment = question.orientacao_correcao?.trim() ?? "";
  const specificComment = result.feedback.trim();
  const hasComment = Boolean(generalComment || specificComment);
  const isDiscursive = question.tipo === "disc";
  const statusIcon = statusSymbol(result.statusKey);

  return (
    <article className={`feedback-pdf-question-card feedback-status-${result.statusKey}`}>
      <header className="feedback-pdf-question-header">
        <div className="feedback-pdf-question-title">
          Questão {question.numero}
          <span>•</span>
          <small>{questionTypeLabel(question.tipo)}</small>
        </div>
        <div className="feedback-pdf-status-pill">
          <span className="feedback-pdf-status-icon">{statusIcon}</span>
          <strong>{result.status}</strong>
        </div>
      </header>

      <div className="feedback-pdf-answer-grid">
        <div>
          <span>Resposta do aluno:</span>
          <strong>{result.answer}</strong>
        </div>
        {isDiscursive ? (
          <div>
            <span>Nota manual:</span>
            <strong>
              {formatNumber(result.points)} de {formatNumber(Number(question.valor))}
            </strong>
          </div>
        ) : (
          <div>
            <span>Gabarito:</span>
            <strong>{result.expected}</strong>
          </div>
        )}
      </div>

      {question.conteudo?.trim() && (
        <div className="feedback-pdf-content-label">
          <span>Conteúdo:</span> {question.conteudo.trim()}
        </div>
      )}

      {isDiscursive && (result.expected || question.resposta_modelo_imagem_url) && (
        <section className="feedback-pdf-model-answer">
          <strong>Resposta-modelo</strong>
          {result.expected && <p>{result.expected}</p>}
          {question.resposta_modelo_imagem_url && (
            <img
              src={question.resposta_modelo_imagem_url}
              alt={`Resposta-modelo da questão ${question.numero}`}
              crossOrigin="anonymous"
            />
          )}
        </section>
      )}

      {!isDiscursive && (
        <div className={`feedback-pdf-lower-grid ${hasComment ? "has-comment" : ""}`}>
          <section className={`feedback-pdf-distribution feedback-pdf-distribution-${question.tipo}`}>
            <strong>{distributionTitle}</strong>
            {distributionAvailable ? (
              <div className="feedback-pdf-bars">
                {distribution.map((row) => (
                  <div key={row.label} className="feedback-pdf-bar-row">
                    <span className={`feedback-pdf-bar-label feedback-tone-${row.tone}`}>
                      {row.label}
                    </span>
                    <span className="feedback-pdf-bar-track">
                      <span
                        className={`feedback-pdf-bar-fill feedback-tone-${row.tone}`}
                        style={{ width: `${Math.max(row.percent, row.count > 0 ? 2 : 0)}%` }}
                      />
                    </span>
                    <strong>{row.percent}%</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="feedback-pdf-no-data">
                {question.anulada
                  ? "Estatísticas não se aplicam à questão anulada."
                  : "Dados da turma ainda indisponíveis."}
              </p>
            )}
          </section>
          {hasComment && (
            <FeedbackComment general={generalComment} specific={specificComment} />
          )}
        </div>
      )}

      {isDiscursive && hasComment && (
        <FeedbackComment general={generalComment} specific={specificComment} />
      )}
    </article>
  );
}

function FeedbackComment({ general, specific }: { general: string; specific: string }) {
  return (
    <aside className="feedback-pdf-comment">
      <div className="feedback-pdf-comment-title">
        <span>▤</span>
        <strong>Comentário do professor:</strong>
      </div>
      {general && <RichComment value={general} />}
      {specific && (
        <div className={general ? "feedback-pdf-specific-comment" : ""}>
          <RichComment value={specific} />
        </div>
      )}
    </aside>
  );
}

function statusSymbol(status: FeedbackStatusKey): string {
  if (status === "correct") return "✓";
  if (status === "incorrect") return "×";
  if (status === "blank") return "−";
  if (status === "manual") return "✎";
  if (status === "annulled") return "○";
  return "?";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(value);
}
