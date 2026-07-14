ALTER TABLE public.questoes ADD COLUMN IF NOT EXISTS desconto_erro NUMERIC(6,2);
UPDATE public.questoes SET desconto_erro = 0 WHERE desconto_erro IS NULL;
ALTER TABLE public.questoes ALTER COLUMN desconto_erro SET DEFAULT 0, ALTER COLUMN desconto_erro SET NOT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.questoes'::regclass AND conname='questoes_desconto_erro_check') THEN
    ALTER TABLE public.questoes ADD CONSTRAINT questoes_desconto_erro_check CHECK (desconto_erro >= 0);
  END IF;
END; $$;
NOTIFY pgrst, 'reload schema';