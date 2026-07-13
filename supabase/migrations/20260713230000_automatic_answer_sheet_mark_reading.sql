-- Persist reviewed optical-mark readings and confirm them atomically as student answers.

ALTER TABLE public.digitalizacoes_folhas
  ADD COLUMN modelo_id UUID REFERENCES public.modelos_folha_respostas(id) ON DELETE SET NULL,
  ADD COLUMN pagina_modelo INT CHECK (pagina_modelo IS NULL OR pagina_modelo > 0),
  ADD COLUMN resultado_leitura JSONB
    CHECK (resultado_leitura IS NULL OR jsonb_typeof(resultado_leitura) = 'object'),
  ADD COLUMN confianca_leitura NUMERIC(5,4)
    CHECK (confianca_leitura IS NULL OR confianca_leitura BETWEEN 0 AND 1),
  ADD COLUMN processado_at TIMESTAMPTZ;

CREATE INDEX digitalizacoes_folhas_modelo_idx
  ON public.digitalizacoes_folhas(modelo_id)
  WHERE modelo_id IS NOT NULL;

DROP POLICY "update own answer sheet scans" ON public.digitalizacoes_folhas;

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
      digitalizacoes_folhas.modelo_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.modelos_folha_respostas AS modelo
        WHERE modelo.id = digitalizacoes_folhas.modelo_id
          AND modelo.avaliacao_id = digitalizacoes_folhas.avaliacao_id
          AND modelo.owner_id = auth.uid()
      )
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

CREATE OR REPLACE FUNCTION public.confirmar_leitura_folha(
  p_digitalizacao_id UUID,
  p_aluno_id UUID,
  p_modelo_id UUID,
  p_pagina INT,
  p_resultado JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID := auth.uid();
  v_avaliacao_id UUID;
  v_turma_id UUID;
  v_aluno_turma_id UUID;
  v_folha_aluno_id UUID;
  v_folha_modelo_id UUID;
  v_item JSONB;
  v_questao public.questoes%ROWTYPE;
  v_questao_id UUID;
  v_resposta TEXT;
  v_total_respostas INT := 0;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.' USING ERRCODE = '42501';
  END IF;
  IF p_pagina IS NULL OR p_pagina <= 0 THEN
    RAISE EXCEPTION 'Página do modelo inválida.' USING ERRCODE = '22023';
  END IF;
  IF p_resultado IS NULL
    OR jsonb_typeof(p_resultado) <> 'object'
    OR jsonb_typeof(p_resultado->'respostas') <> 'array' THEN
    RAISE EXCEPTION 'Resultado de leitura inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT digitalizacao.avaliacao_id,
         folha.aluno_id,
         folha.modelo_id
    INTO v_avaliacao_id, v_folha_aluno_id, v_folha_modelo_id
  FROM public.digitalizacoes_folhas AS digitalizacao
  LEFT JOIN public.folhas_respostas AS folha ON folha.id = digitalizacao.folha_id
  WHERE digitalizacao.id = p_digitalizacao_id
    AND digitalizacao.owner_id = v_owner_id;

  IF v_avaliacao_id IS NULL THEN
    RAISE EXCEPTION 'Digitalização não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  SELECT avaliacao.turma_id
    INTO v_turma_id
  FROM public.avaliacoes AS avaliacao
  WHERE avaliacao.id = v_avaliacao_id
    AND avaliacao.owner_id = v_owner_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Avaliação não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  PERFORM 1
  FROM public.modelos_folha_respostas AS modelo
  WHERE modelo.id = p_modelo_id
    AND modelo.avaliacao_id = v_avaliacao_id
    AND modelo.owner_id = v_owner_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Modelo da folha inválido.' USING ERRCODE = '22023';
  END IF;

  SELECT aluno.turma_id
    INTO v_aluno_turma_id
  FROM public.alunos AS aluno
  WHERE aluno.id = p_aluno_id
    AND aluno.owner_id = v_owner_id;
  IF NOT FOUND OR (v_turma_id IS NOT NULL AND v_aluno_turma_id <> v_turma_id) THEN
    RAISE EXCEPTION 'Aluno não pertence à turma desta avaliação.' USING ERRCODE = '22023';
  END IF;

  IF v_folha_aluno_id IS NOT NULL AND v_folha_aluno_id <> p_aluno_id THEN
    RAISE EXCEPTION 'A folha identificada pertence a outro aluno.' USING ERRCODE = '22023';
  END IF;
  IF v_folha_modelo_id IS NOT NULL AND v_folha_modelo_id <> p_modelo_id THEN
    RAISE EXCEPTION 'A versão selecionada não corresponde à folha identificada.' USING ERRCODE = '22023';
  END IF;

  FOR v_item IN
    SELECT value FROM jsonb_array_elements(p_resultado->'respostas')
  LOOP
    BEGIN
      v_questao_id := (v_item->>'questaoId')::UUID;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Identificador de questão inválido.' USING ERRCODE = '22023';
    END;
    v_resposta := NULLIF(btrim(v_item->>'valor'), '');

    SELECT *
      INTO v_questao
    FROM public.questoes AS questao
    WHERE questao.id = v_questao_id
      AND questao.avaliacao_id = v_avaliacao_id
      AND questao.owner_id = v_owner_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'A questão % não pertence à avaliação.', v_questao_id USING ERRCODE = '22023';
    END IF;

    IF v_resposta IS NOT NULL THEN
      v_resposta := upper(v_resposta);
      IF v_questao.tipo = 'mc' AND (
        v_resposta !~ '^[A-G]$'
        OR ascii(v_resposta) - ascii('A') + 1 > COALESCE(v_questao.qtd_alternativas, 5)
      ) THEN
        RAISE EXCEPTION 'Resposta inválida para a questão %.', v_questao.numero USING ERRCODE = '22023';
      ELSIF v_questao.tipo = 'ce' AND v_resposta NOT IN ('C', 'E') THEN
        RAISE EXCEPTION 'Resposta inválida para a questão %.', v_questao.numero USING ERRCODE = '22023';
      ELSIF v_questao.tipo = 'num' AND (
        v_resposta !~ '^[0-9]+$'
        OR length(v_resposta) <> COALESCE(v_questao.num_digitos, 3)
      ) THEN
        RAISE EXCEPTION 'Resposta inválida para a questão %.', v_questao.numero USING ERRCODE = '22023';
      END IF;
    END IF;

    INSERT INTO public.respostas_alunos (
      owner_id,
      avaliacao_id,
      aluno_id,
      questao_id,
      resposta
    )
    VALUES (
      v_owner_id,
      v_avaliacao_id,
      p_aluno_id,
      v_questao_id,
      v_resposta
    )
    ON CONFLICT (aluno_id, questao_id) DO UPDATE SET
      resposta = EXCLUDED.resposta,
      updated_at = now();

    v_total_respostas := v_total_respostas + 1;
  END LOOP;

  IF v_total_respostas = 0 THEN
    RAISE EXCEPTION 'Nenhuma resposta foi enviada para confirmação.' USING ERRCODE = '22023';
  END IF;

  UPDATE public.digitalizacoes_folhas
  SET aluno_id = p_aluno_id,
      modelo_id = p_modelo_id,
      pagina_modelo = p_pagina,
      resultado_leitura = p_resultado,
      confianca_leitura = LEAST(
        1,
        GREATEST(0, COALESCE((p_resultado->>'confiancaMedia')::NUMERIC, 0))
      ),
      status = 'processada',
      processado_at = now()
  WHERE id = p_digitalizacao_id
    AND owner_id = v_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirmar_leitura_folha(UUID, UUID, UUID, INT, JSONB)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.confirmar_leitura_folha(UUID, UUID, UUID, INT, JSONB)
  TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
