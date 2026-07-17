import ReactMarkdown from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";

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
        remarkPlugins={[remarkMath]}
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
