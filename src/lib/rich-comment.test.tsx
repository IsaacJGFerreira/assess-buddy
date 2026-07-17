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

test("renders a safe embedded image used during PDF capture", () => {
  const png = "data:image/png;base64,iVBORw0KGgo=";
  const html = renderRichCommentToHtml(`![Imagem incorporada](${png})`);

  assert.match(html, /src="data:image\/png;base64,iVBORw0KGgo="/);
});

test("does not allow an executable data URL", () => {
  const html = renderRichCommentToHtml("![Imagem](data:image/svg+xml;base64,PHN2Zz4=)");

  assert.doesNotMatch(html, /src="data:image\/svg\+xml/);
});

test("preserves line breaks and renders the safe formatting controls", () => {
  const html = renderRichCommentToHtml(`Linha 1
Linha 2

:feedbackunderline[texto sublinhado]

:feedbackcolorred[texto vermelho]

:::feedbackaligncenter
**Texto centralizado**
:::

:::feedbackimagesmallright
![Gráfico](https://example.com/grafico.png)
:::`);

  assert.match(html, /Linha 1<br\/>\nLinha 2/);
  assert.match(html, /class="feedback-underline"/);
  assert.match(html, /class="feedback-color-red"/);
  assert.match(html, /class="feedback-align-center"/);
  assert.match(html, /<strong>Texto centralizado<\/strong>/);
  assert.match(html, /class="feedback-image-size-small feedback-image-align-right"/);
});
