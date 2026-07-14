ALTER TABLE public.questoes
  ADD COLUMN IF NOT EXISTS resposta_modelo TEXT,
  ADD COLUMN IF NOT EXISTS resposta_modelo_imagem_path TEXT;

COMMENT ON COLUMN public.questoes.resposta_modelo IS
  'Resposta-modelo em texto exibida no gabarito e na devolutiva da questão discursiva.';
COMMENT ON COLUMN public.questoes.resposta_modelo_imagem_path IS
  'Caminho da imagem da resposta-modelo no bucket devolutivas-modelo.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'devolutivas-modelo',
  'devolutivas-modelo',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Professor visualiza imagens das devolutivas'
  ) THEN
    CREATE POLICY "Professor visualiza imagens das devolutivas"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'devolutivas-modelo'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Professor envia imagens das devolutivas'
  ) THEN
    CREATE POLICY "Professor envia imagens das devolutivas"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'devolutivas-modelo'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Professor atualiza imagens das devolutivas'
  ) THEN
    CREATE POLICY "Professor atualiza imagens das devolutivas"
      ON storage.objects
      FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'devolutivas-modelo'
        AND (storage.foldername(name))[1] = auth.uid()::text
      )
      WITH CHECK (
        bucket_id = 'devolutivas-modelo'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Professor remove imagens das devolutivas'
  ) THEN
    CREATE POLICY "Professor remove imagens das devolutivas"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'devolutivas-modelo'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END;
$$;

NOTIFY pgrst, 'reload schema';
