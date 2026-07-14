-- Add optional negative marking and reorder questions without breaking unique numbering.

ALTER TABLE public.questoes
  ADD COLUMN desconto_erro NUMERIC(6,2) NOT NULL DEFAULT 0
    CHECK (desconto_erro >= 0);

ALTER TABLE public.questoes
  ADD CONSTRAINT questoes_valor_nao_negativo CHECK (valor >= 0);

CREATE OR REPLACE FUNCTION public.mover_questao(
  p_questao_id UUID,
  p_nova_posicao INT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id UUID := auth.uid();
  v_avaliacao_id UUID;
  v_posicao_atual INT;
  v_nova_posicao INT;
  v_total INT;
BEGIN
  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Sessão inválida.' USING ERRCODE = '42501';
  END IF;

  SELECT questao.avaliacao_id
    INTO v_avaliacao_id
  FROM public.questoes AS questao
  WHERE questao.id = p_questao_id
    AND questao.owner_id = v_owner_id;

  IF v_avaliacao_id IS NULL THEN
    RAISE EXCEPTION 'Questão não encontrada.' USING ERRCODE = 'P0002';
  END IF;

  SELECT COUNT(*)::INT
    INTO v_total
  FROM public.questoes AS questao
  WHERE questao.avaliacao_id = v_avaliacao_id
    AND questao.owner_id = v_owner_id;

  v_nova_posicao := LEAST(v_total, GREATEST(1, COALESCE(p_nova_posicao, 1)));

  SELECT ordenada.posicao
    INTO v_posicao_atual
  FROM (
    SELECT questao.id,
           ROW_NUMBER() OVER (ORDER BY questao.numero, questao.created_at, questao.id)::INT AS posicao
    FROM public.questoes AS questao
    WHERE questao.avaliacao_id = v_avaliacao_id
      AND questao.owner_id = v_owner_id
  ) AS ordenada
  WHERE ordenada.id = p_questao_id;

  IF v_posicao_atual = v_nova_posicao THEN
    RETURN;
  END IF;

  -- Temporary negative positions make the unique (avaliacao_id, numero) constraint safe.
  WITH ordenadas AS (
    SELECT questao.id,
           ROW_NUMBER() OVER (ORDER BY questao.numero, questao.created_at, questao.id)::INT AS posicao
    FROM public.questoes AS questao
    WHERE questao.avaliacao_id = v_avaliacao_id
      AND questao.owner_id = v_owner_id
  )
  UPDATE public.questoes AS questao
  SET numero = -ordenadas.posicao
  FROM ordenadas
  WHERE questao.id = ordenadas.id;

  UPDATE public.questoes AS questao
  SET numero = CASE
    WHEN questao.id = p_questao_id THEN v_nova_posicao
    WHEN v_posicao_atual < v_nova_posicao
      AND -questao.numero > v_posicao_atual
      AND -questao.numero <= v_nova_posicao THEN -questao.numero - 1
    WHEN v_posicao_atual > v_nova_posicao
      AND -questao.numero >= v_nova_posicao
      AND -questao.numero < v_posicao_atual THEN -questao.numero + 1
    ELSE -questao.numero
  END
  WHERE questao.avaliacao_id = v_avaliacao_id
    AND questao.owner_id = v_owner_id;
END;
$$;

REVOKE ALL ON FUNCTION public.mover_questao(UUID, INT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mover_questao(UUID, INT) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
