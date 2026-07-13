-- Persisted, immutable answer-sheet models and printable sheet identities.

CREATE TABLE public.modelos_folha_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  versao INT NOT NULL CHECK (versao > 0),
  colunas SMALLINT NOT NULL CHECK (colunas BETWEEN 1 AND 6),
  linhas_por_coluna SMALLINT NOT NULL CHECK (linhas_por_coluna BETWEEN 5 AND 35),
  orientacao TEXT NOT NULL CHECK (orientacao IN ('portrait', 'landscape')),
  snapshot JSONB NOT NULL CHECK (jsonb_typeof(snapshot) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (avaliacao_id, versao)
);

CREATE INDEX modelos_folha_avaliacao_idx
  ON public.modelos_folha_respostas(avaliacao_id, versao DESC);

GRANT SELECT, INSERT ON public.modelos_folha_respostas TO authenticated;
GRANT ALL ON public.modelos_folha_respostas TO service_role;
ALTER TABLE public.modelos_folha_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own answer sheet models"
  ON public.modelos_folha_respostas FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "create own answer sheet models"
  ON public.modelos_folha_respostas FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.folhas_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  modelo_id UUID NOT NULL REFERENCES public.modelos_folha_respostas(id) ON DELETE CASCADE,
  aluno_id UUID REFERENCES public.alunos(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL UNIQUE
    DEFAULT ('AB-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))),
  qr_payload TEXT GENERATED ALWAYS AS ('AB1|' || codigo) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX folhas_respostas_avaliacao_idx
  ON public.folhas_respostas(avaliacao_id, created_at DESC);

CREATE UNIQUE INDEX folhas_respostas_modelo_aluno_idx
  ON public.folhas_respostas(
    modelo_id,
    COALESCE(aluno_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

GRANT SELECT, INSERT ON public.folhas_respostas TO authenticated;
GRANT ALL ON public.folhas_respostas TO service_role;
ALTER TABLE public.folhas_respostas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own answer sheets"
  ON public.folhas_respostas FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "create own answer sheets"
  ON public.folhas_respostas FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE OR REPLACE FUNCTION public.criar_ou_obter_folha_respostas(
  p_avaliacao_id UUID,
  p_aluno_id UUID,
  p_colunas INT,
  p_linhas_por_coluna INT,
  p_orientacao TEXT,
  p_snapshot JSONB
)
RETURNS TABLE (
  modelo_id UUID,
  versao INT,
  folha_id UUID,
  codigo TEXT,
  qr_payload TEXT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID;
  v_turma_id UUID;
  v_modelo public.modelos_folha_respostas%ROWTYPE;
  v_folha public.folhas_respostas%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.' USING ERRCODE = '42501';
  END IF;

  IF p_colunas NOT BETWEEN 1 AND 6
    OR p_linhas_por_coluna NOT BETWEEN 5 AND 35
    OR p_orientacao NOT IN ('portrait', 'landscape')
    OR jsonb_typeof(p_snapshot) IS DISTINCT FROM 'object'
  THEN
    RAISE EXCEPTION 'Configuração da folha inválida.' USING ERRCODE = '22023';
  END IF;

  SELECT a.owner_id, a.turma_id
    INTO v_owner_id, v_turma_id
  FROM public.avaliacoes AS a
  WHERE a.id = p_avaliacao_id
  FOR UPDATE;

  IF NOT FOUND OR v_owner_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Avaliação não encontrada.' USING ERRCODE = '42501';
  END IF;

  IF p_aluno_id IS NOT NULL AND (
    v_turma_id IS NULL OR NOT EXISTS (
      SELECT 1
      FROM public.alunos AS aluno
      WHERE aluno.id = p_aluno_id
        AND aluno.owner_id = auth.uid()
        AND aluno.turma_id = v_turma_id
    )
  ) THEN
    RAISE EXCEPTION 'Aluno não pertence à turma da avaliação.' USING ERRCODE = '22023';
  END IF;

  SELECT modelo.*
    INTO v_modelo
  FROM public.modelos_folha_respostas AS modelo
  WHERE modelo.avaliacao_id = p_avaliacao_id
  ORDER BY modelo.versao DESC
  LIMIT 1;

  IF NOT FOUND
    OR v_modelo.colunas IS DISTINCT FROM p_colunas
    OR v_modelo.linhas_por_coluna IS DISTINCT FROM p_linhas_por_coluna
    OR v_modelo.orientacao IS DISTINCT FROM p_orientacao
    OR v_modelo.snapshot IS DISTINCT FROM p_snapshot
  THEN
    INSERT INTO public.modelos_folha_respostas (
      owner_id,
      avaliacao_id,
      versao,
      colunas,
      linhas_por_coluna,
      orientacao,
      snapshot
    )
    SELECT
      auth.uid(),
      p_avaliacao_id,
      COALESCE(MAX(modelo.versao), 0) + 1,
      p_colunas,
      p_linhas_por_coluna,
      p_orientacao,
      p_snapshot
    FROM public.modelos_folha_respostas AS modelo
    WHERE modelo.avaliacao_id = p_avaliacao_id
    RETURNING * INTO v_modelo;
  END IF;

  SELECT folha.*
    INTO v_folha
  FROM public.folhas_respostas AS folha
  WHERE folha.modelo_id = v_modelo.id
    AND folha.aluno_id IS NOT DISTINCT FROM p_aluno_id
  LIMIT 1;

  IF NOT FOUND THEN
    INSERT INTO public.folhas_respostas (
      owner_id,
      avaliacao_id,
      modelo_id,
      aluno_id
    )
    VALUES (
      auth.uid(),
      p_avaliacao_id,
      v_modelo.id,
      p_aluno_id
    )
    RETURNING * INTO v_folha;
  END IF;

  RETURN QUERY
  SELECT
    v_modelo.id,
    v_modelo.versao,
    v_folha.id,
    v_folha.codigo,
    v_folha.qr_payload;
END;
$$;

REVOKE ALL ON FUNCTION public.criar_ou_obter_folha_respostas(
  UUID, UUID, INT, INT, TEXT, JSONB
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.criar_ou_obter_folha_respostas(
  UUID, UUID, INT, INT, TEXT, JSONB
) TO authenticated, service_role;
