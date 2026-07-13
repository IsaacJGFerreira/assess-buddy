-- Prepared answer-sheet scans uploaded for later QR and mark recognition.

CREATE TABLE public.digitalizacoes_folhas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  folha_id UUID REFERENCES public.folhas_respostas(id) ON DELETE SET NULL,
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE SET NULL,
  arquivo_original TEXT NOT NULL,
  mime_original TEXT NOT NULL CHECK (mime_original IN ('image/jpeg', 'image/png', 'application/pdf')),
  pagina_origem INT NOT NULL DEFAULT 1 CHECK (pagina_origem > 0),
  rotacao SMALLINT NOT NULL DEFAULT 0 CHECK (rotacao IN (0, 90, 180, 270)),
  recorte JSONB NOT NULL CHECK (jsonb_typeof(recorte) = 'object'),
  storage_path TEXT NOT NULL UNIQUE,
  largura_px INT NOT NULL CHECK (largura_px > 0),
  altura_px INT NOT NULL CHECK (altura_px > 0),
  tamanho_bytes BIGINT NOT NULL CHECK (tamanho_bytes > 0),
  status TEXT NOT NULL DEFAULT 'preparada'
    CHECK (status IN ('preparada', 'identificada', 'revisao', 'processada', 'erro')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX digitalizacoes_folhas_avaliacao_idx
  ON public.digitalizacoes_folhas(avaliacao_id, created_at DESC);

CREATE INDEX digitalizacoes_folhas_folha_idx
  ON public.digitalizacoes_folhas(folha_id)
  WHERE folha_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.digitalizacoes_folhas TO authenticated;
GRANT ALL ON public.digitalizacoes_folhas TO service_role;
ALTER TABLE public.digitalizacoes_folhas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own answer sheet scans"
  ON public.digitalizacoes_folhas FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "create own answer sheet scans"
  ON public.digitalizacoes_folhas FOR INSERT
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1
      FROM public.avaliacoes AS avaliacao
      WHERE avaliacao.id = digitalizacoes_folhas.avaliacao_id
        AND avaliacao.owner_id = auth.uid()
    )
    AND (
      digitalizacoes_folhas.folha_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.folhas_respostas AS folha
        WHERE folha.id = digitalizacoes_folhas.folha_id
          AND folha.avaliacao_id = digitalizacoes_folhas.avaliacao_id
          AND folha.owner_id = auth.uid()
      )
    )
    AND (
      digitalizacoes_folhas.aluno_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.alunos AS aluno
        WHERE aluno.id = digitalizacoes_folhas.aluno_id
          AND aluno.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "update own answer sheet scans"
  ON public.digitalizacoes_folhas FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (
    auth.uid() = owner_id
    AND EXISTS (
      SELECT 1
      FROM public.avaliacoes AS avaliacao
      WHERE avaliacao.id = digitalizacoes_folhas.avaliacao_id
        AND avaliacao.owner_id = auth.uid()
    )
    AND (
      digitalizacoes_folhas.folha_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.folhas_respostas AS folha
        WHERE folha.id = digitalizacoes_folhas.folha_id
          AND folha.avaliacao_id = digitalizacoes_folhas.avaliacao_id
          AND folha.owner_id = auth.uid()
      )
    )
    AND (
      digitalizacoes_folhas.aluno_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.alunos AS aluno
        WHERE aluno.id = digitalizacoes_folhas.aluno_id
          AND aluno.owner_id = auth.uid()
      )
    )
  );

CREATE POLICY "delete own answer sheet scans"
  ON public.digitalizacoes_folhas FOR DELETE
  USING (auth.uid() = owner_id);

CREATE TRIGGER trg_digitalizacoes_folhas_updated
  BEFORE UPDATE ON public.digitalizacoes_folhas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'folhas-digitalizadas',
  'folhas-digitalizadas',
  false,
  15728640,
  ARRAY['image/png']::TEXT[]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "read own prepared answer sheet images"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'folhas-digitalizadas'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "upload own prepared answer sheet images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'folhas-digitalizadas'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

CREATE POLICY "delete own prepared answer sheet images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'folhas-digitalizadas'
    AND (storage.foldername(name))[1] = auth.uid()::TEXT
  );

NOTIFY pgrst, 'reload schema';
