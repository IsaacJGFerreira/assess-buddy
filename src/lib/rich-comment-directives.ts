import type { Node } from "unist";
import { visit } from "unist-util-visit";

type DirectiveNode = Node & {
  type: "containerDirective" | "textDirective";
  name: string;
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
};

const CONTAINER_CLASSES: Record<string, string[]> = {
  feedbackalignleft: ["feedback-align-left"],
  feedbackaligncenter: ["feedback-align-center"],
  feedbackalignright: ["feedback-align-right"],
  feedbackimagesmallleft: ["feedback-image-size-small", "feedback-image-align-left"],
  feedbackimagesmallcenter: ["feedback-image-size-small", "feedback-image-align-center"],
  feedbackimagesmallright: ["feedback-image-size-small", "feedback-image-align-right"],
  feedbackimagemediumleft: ["feedback-image-size-medium", "feedback-image-align-left"],
  feedbackimagemediumcenter: ["feedback-image-size-medium", "feedback-image-align-center"],
  feedbackimagemediumright: ["feedback-image-size-medium", "feedback-image-align-right"],
  feedbackimagelargeleft: ["feedback-image-size-large", "feedback-image-align-left"],
  feedbackimagelargecenter: ["feedback-image-size-large", "feedback-image-align-center"],
  feedbackimagelargeright: ["feedback-image-size-large", "feedback-image-align-right"],
};

const TEXT_CLASSES: Record<string, string[]> = {
  feedbackunderline: ["feedback-underline"],
  feedbackcolorblack: ["feedback-color-black"],
  feedbackcolorred: ["feedback-color-red"],
  feedbackcolorblue: ["feedback-color-blue"],
  feedbackcolorgreen: ["feedback-color-green"],
  feedbackcolororange: ["feedback-color-orange"],
  feedbackcolorpurple: ["feedback-color-purple"],
};

export function remarkFeedbackDirectives() {
  return (tree: Node) => {
    visit(tree, (node) => {
      if (node.type !== "containerDirective" && node.type !== "textDirective") return;
      const directive = node as DirectiveNode;
      const classes =
        directive.type === "containerDirective"
          ? CONTAINER_CLASSES[directive.name]
          : TEXT_CLASSES[directive.name];
      if (!classes) return;

      directive.data ??= {};
      directive.data.hName = directive.type === "containerDirective" ? "div" : "span";
      directive.data.hProperties = { className: classes };
    });
  };
}
