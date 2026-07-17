import { renderToStaticMarkup } from "react-dom/server";

import { RichComment } from "@/lib/rich-comment";

export function renderRichCommentToHtml(value: string): string {
  return renderToStaticMarkup(<RichComment value={value} />);
}
