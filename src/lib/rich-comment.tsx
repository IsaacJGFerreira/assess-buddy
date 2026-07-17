import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";

import { remarkFeedbackDirectives } from "@/lib/rich-comment-directives";

export function RichComment({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  return (
    <div className={`feedback-rich-comment ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkDirective, remarkBreaks, remarkFeedbackDirectives]}
        rehypePlugins={[rehypeKatex]}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) => (
            <img src={src} alt={alt || "Imagem do comentário"} crossOrigin="anonymous" />
          ),
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
