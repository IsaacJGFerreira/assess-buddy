import { useRef, useState, type ChangeEvent } from "react";
import { Bold, Heading3, ImagePlus, Italic, List, Loader2, Sigma } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { RichComment } from "@/lib/rich-comment";

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

  async function uploadImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(true);
    try {
      const url = await onUploadImage(file);
      const label = file.name.replace(/\.[^.]+$/, "") || "Imagem";
      const prefix = value && !value.endsWith("\n") ? "\n\n" : "";
      onChange(`${value}${prefix}![${label}](${url})\n`);
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
          disabled={disabled}
          onClick={() => insert("**", "**", "texto em negrito")}
        >
          <Bold />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          title="Itálico"
          aria-label="Inserir itálico"
          disabled={disabled}
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
          disabled={disabled}
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
          disabled={disabled}
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
          disabled={disabled}
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
          disabled={disabled}
          onClick={() => insert("\n\n$$\n", "\n$$\n", "\\frac{a}{b}")}
        >
          <Sigma />
          <span className="hidden sm:inline">Equação em bloco</span>
        </Button>
        <label className="ml-auto inline-flex h-8 cursor-pointer items-center gap-2 rounded-md px-3 text-xs font-medium hover:bg-accent hover:text-accent-foreground has-[:disabled]:pointer-events-none has-[:disabled]:opacity-50">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Imagem
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            disabled={disabled || uploading}
            onChange={(event) => void uploadImage(event)}
          />
        </label>
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
            disabled={disabled}
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
