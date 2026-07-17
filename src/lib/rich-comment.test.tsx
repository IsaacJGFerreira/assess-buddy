import assert from "node:assert/strict";
import test from "node:test";

import { renderRichCommentToHtml } from "@/lib/rich-comment-renderer";

test("renders formatted text, equations and images", () => {
  const html = renderRichCommentToHtml(
    "**Ideia principal** com $x^2$ e ![Gráfico](https://example.com/grafico.png)",
  );

  assert.match(html, /<strong>Ideia principal<\/strong>/);
  assert.match(html, /class="katex"/);
  assert.match(html, /src="https:\/\/example.com\/grafico.png"/);
  assert.match(html, /alt="Gráfico"/);
});

test("does not render raw HTML from a comment", () => {
  const html = renderRichCommentToHtml("<script>alert('x')</script>Texto seguro");

  assert.doesNotMatch(html, /<script>/);
  assert.match(html, /Texto seguro/);
});
