import { useRef, useState, type ChangeEvent } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading3,
  ImagePlus,
  Italic,
  List,
  Loader2,
  Palette,
  Pilcrow,
  Sigma,
  Underline,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RichComment } from "@/lib/rich-comment";

type Alignment = "left" | "center" | "right";
type ImageSize = "small" | "medium" | "large";
type TextColor = "black" | "red" | "blue" | "green" | "orange" | "purple";

export function RichCommentEditor({
  value,
  onChange,
  onUploadImage,
  disabled = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  disabled?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [uploading, setUploading] = useState(false);
  const [textColor, setTextColor] = useState<TextColor>("blue");
  const [imageSize, setImageSize] = useState<ImageSize>("medium");
  const [imageAlignment, setImageAlignment] = useState<Alignment>("center");

  function insert(before: string, after: string, placeholder: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selection = value.slice(start, end) || placeholder;
    const next = `${value.slice(0, start)}${before}${selection}${after}${value.slice(end)}`;
    const selectionStart = start + before.length;
    const selectionEnd = selectionStart + selection.length;

    onChange(next);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function insertPlain(content: string) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    const next = `${value.slice(0, start)}${content}${value.slice(end)}`;
    const cursor = start + content.length;

    onChange(next);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(cursor, cursor);
    });
  }

  function insertAligned(alignment: Alignment) {
    insert(
      `\n\n:::feedbackalign${alignment}\n`,
      "\n:::\n\n",
      alignment === "center"
        ? "Texto centralizado"
        : alignment === "right"
          ? "Texto alinhado à direita"
          : "Texto alinhado à esquerda",
    );
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const position = textareaRef.current?.selectionStart ?? value.length;
    setUploading(true);
    try {
      const url = await onUploadImage(file);
      const label =
        file.name.replace(/\.[^.]+$/, "").replace(/[[\]\\]/g, " ").trim() || "Imagem";
      const prefix = position > 0 && value[position - 1] !== "\n" ? "\n\n" : "";
      const suffix = position < value.length && value[position] !== "\n" ? "\n\n" : "\n";
      const block =
        `${prefix}:::feedbackimage${imageSize}${imageAlignment}\n` +
        `![${label}](${url})\n:::` +
        suffix;
      const next = `${value.slice(0, position)}${block}${value.slice(position)}`;
      onChange(next);
      window.requestAnimationFrame(() => {
        const cursor = position + block.length;
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(cursor, cursor);
      });
      toast.success("Imagem inserida no comentário.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Negrito"
          aria-label="Inserir negrito"
          disabled={disabled || uploading}
          onClick={() => insert("**", "**", "texto em negrito")}
        >
          <Bold />
          <span>Negrito</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Itálico"
          aria-label="Inserir itálico"
          disabled={disabled || uploading}
          onClick={() => insert("*", "*", "texto em itálico")}
        >
          <Italic />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Subtítulo"
          aria-label="Inserir subtítulo"
          disabled={disabled || uploading}
          onClick={() => insert("\n### ", "\n", "Subtítulo")}
        >
          <Heading3 />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Lista"
          aria-label="Inserir lista"
          disabled={disabled || uploading}
          onClick={() => insert("\n- ", "\n", "item")}
        >
          <List />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Equação no texto"
          aria-label="Inserir equação no texto"
          disabled={disabled || uploading}
          onClick={() => insert("$", "$", "x^2 + y^2")}
        >
          <Sigma />
          <span className="hidden sm:inline">Equação</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Equação destacada"
          aria-label="Inserir equação destacada"
          disabled={disabled || uploading}
          onClick={() => insert("\n\n$$\n", "\n$$\n", "\\frac{a}{b}")}
        >
          <Sigma />
          <span className="hidden sm:inline">Equação em bloco</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Sublinhar"
          disabled={disabled || uploading}
          onClick={() => insert(":feedbackunderline[", "]", "texto sublinhado")}
        >
          <Underline />
          <span>Sublinhar</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Novo parágrafo"
          disabled={disabled || uploading}
          onClick={() => insertPlain("\n\n")}
        >
          <Pilcrow />
          <span>Parágrafo</span>
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-muted/20 p-2">
        <span className="text-xs font-medium text-muted-foreground">Texto:</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Alinhar à esquerda"
          aria-label="Alinhar texto à esquerda"
          disabled={disabled || uploading}
          onClick={() => insertAligned("left")}
        >
          <AlignLeft />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Centralizar"
          aria-label="Centralizar texto"
          disabled={disabled || uploading}
          onClick={() => insertAligned("center")}
        >
          <AlignCenter />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Alinhar à direita"
          aria-label="Alinhar texto à direita"
          disabled={disabled || uploading}
          onClick={() => insertAligned("right")}
        >
          <AlignRight />
        </Button>
        <select
          value={textColor}
          disabled={disabled || uploading}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="Cor do texto"
          onChange={(event) => setTextColor(event.target.value as TextColor)}
        >
          <option value="black">Preto</option>
          <option value="red">Vermelho</option>
          <option value="blue">Azul</option>
          <option value="green">Verde</option>
          <option value="orange">Laranja</option>
          <option value="purple">Roxo</option>
        </select>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => insert(`:feedbackcolor${textColor}[`, "]", "texto colorido")}
        >
          <Palette /> Aplicar cor
        </Button>

        <span className="ml-1 text-xs font-medium text-muted-foreground sm:ml-4">Imagem:</span>
        <select
          value={imageSize}
          disabled={disabled || uploading}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="Tamanho da imagem"
          onChange={(event) => setImageSize(event.target.value as ImageSize)}
        >
          <option value="small">Pequena (35%)</option>
          <option value="medium">Média (60%)</option>
          <option value="large">Grande (100%)</option>
        </select>
        <select
          value={imageAlignment}
          disabled={disabled || uploading}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="Alinhamento da imagem"
          onChange={(event) => setImageAlignment(event.target.value as Alignment)}
        >
          <option value="left">À esquerda</option>
          <option value="center">Centralizada</option>
          <option value="right">À direita</option>
        </select>
        <label className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 text-xs font-medium shadow-sm hover:bg-accent hover:text-accent-foreground has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Inserir imagem no cursor
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(event) => void uploadImage(event)}
          />
        </label>
      </div>
      <div className="border-b border-border bg-muted/10 px-3 py-2 text-xs text-muted-foreground">
        Um Enter cria uma nova linha. Use “Parágrafo” para deixar uma linha em branco. A imagem é
        colocada na posição atual do cursor, então pode ficar antes, entre ou depois dos textos.
      </div>

      <div className="grid lg:grid-cols-2">
        <div className="border-b border-border lg:border-r lg:border-b-0">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Editor
          </div>
          <textarea
            ref={textareaRef}
            rows={12}
            className="min-h-72 w-full resize-y bg-background px-3 py-3 font-mono text-sm outline-none"
            value={value}
            disabled={disabled || uploading}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Escreva a resposta comentada. Você pode deixar esta questão em branco."
          />
        </div>
        <div className="min-h-72 bg-background">
          <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted-foreground">
            Pré-visualização
          </div>
          <div className="p-4">
            {value.trim() ? (
              <RichComment value={value} />
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum comentário nesta questão.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
