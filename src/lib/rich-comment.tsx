import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkBreaks from "remark-breaks";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";

import { remarkFeedbackDirectives } from "@/lib/rich-comment-directives";

const SAFE_EMBEDDED_IMAGE = /^data:image\/(?:png|jpeg|webp);base64,[a-z0-9+/]+={0,2}$/i;

function richCommentUrlTransform(value: string): string {
  if (value.length <= 8_500_000 && SAFE_EMBEDDED_IMAGE.test(value)) return value;
  return defaultUrlTransform(value);
}

export function RichComment({ value, className = "" }: { value: string; className?: string }) {
  return (
    <div className={`feedback-rich-comment ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkMath, remarkDirective, remarkBreaks, remarkFeedbackDirectives]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={richCommentUrlTransform}
        components={{
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer">
              {children}
            </a>
          ),
          img: ({ src, alt }) =>
            src ? (
              <img src={src} alt={alt || "Imagem do comentário"} crossOrigin="anonymous" />
            ) : (
              <span>{alt || "Imagem indisponível"}</span>
            ),
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
