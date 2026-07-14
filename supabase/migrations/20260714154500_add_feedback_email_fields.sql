ALTER TABLE public.alunos
  ADD COLUMN IF NOT EXISTS email TEXT;

ALTER TABLE public.avaliacoes
  ADD COLUMN IF NOT EXISTS comentario_devolutiva TEXT;

ALTER TABLE public.questoes
  ADD COLUMN IF NOT EXISTS orientacao_correcao TEXT;

ALTER TABLE public.respostas_alunos
  ADD COLUMN IF NOT EXISTS nota_manual NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS feedback TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.alunos'::regclass
      AND conname = 'alunos_email_formato_check'
  ) THEN
    ALTER TABLE public.alunos
      ADD CONSTRAINT alunos_email_formato_check
      CHECK (
        email IS NULL
        OR email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.respostas_alunos'::regclass
      AND conname = 'respostas_alunos_nota_manual_check'
  ) THEN
    ALTER TABLE public.respostas_alunos
      ADD CONSTRAINT respostas_alunos_nota_manual_check
      CHECK (nota_manual IS NULL OR nota_manual >= 0);
  END IF;
END;
$$;

COMMENT ON COLUMN public.alunos.email IS
  'E-mail do aluno usado para o envio individual da devolutiva.';
COMMENT ON COLUMN public.avaliacoes.comentario_devolutiva IS
  'Comentário geral do professor exibido no PDF de devolutiva.';
COMMENT ON COLUMN public.questoes.orientacao_correcao IS
  'Orientação comum de revisão/correção exibida na devolutiva.';
COMMENT ON COLUMN public.respostas_alunos.nota_manual IS
  'Pontuação atribuída manualmente, especialmente para questões discursivas.';
COMMENT ON COLUMN public.respostas_alunos.feedback IS
  'Comentário individual do professor para a resposta do aluno.';

NOTIFY pgrst, 'reload schema';
