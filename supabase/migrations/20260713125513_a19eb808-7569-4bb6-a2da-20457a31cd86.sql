
-- =========================
-- Enums
-- =========================
CREATE TYPE public.tipo_questao AS ENUM ('mc', 'ce', 'num');
CREATE TYPE public.status_avaliacao AS ENUM ('elaboracao','pronta','aplicada','em_correcao','corrigida','devolvida');

-- =========================
-- Utility: updated_at trigger
-- =========================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =========================
-- Profiles
-- =========================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT,
  escola TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile" ON public.profiles FOR ALL
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nome', NEW.email));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Turmas
-- =========================
CREATE TABLE public.turmas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  serie TEXT,
  ano INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.turmas TO authenticated;
GRANT ALL ON public.turmas TO service_role;
ALTER TABLE public.turmas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own turmas" ON public.turmas FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_turmas_updated BEFORE UPDATE ON public.turmas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Alunos
-- =========================
CREATE TABLE public.alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id UUID NOT NULL REFERENCES public.turmas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  matricula TEXT,
  chamada INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX alunos_turma_idx ON public.alunos(turma_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.alunos TO authenticated;
GRANT ALL ON public.alunos TO service_role;
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own alunos" ON public.alunos FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_alunos_updated BEFORE UPDATE ON public.alunos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Avaliações
-- =========================
CREATE TABLE public.avaliacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  turma_id UUID REFERENCES public.turmas(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  disciplina TEXT,
  data_aplicacao DATE,
  valor_total NUMERIC(6,2) NOT NULL DEFAULT 10,
  instrucoes TEXT,
  status public.status_avaliacao NOT NULL DEFAULT 'elaboracao',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX avaliacoes_owner_idx ON public.avaliacoes(owner_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.avaliacoes TO authenticated;
GRANT ALL ON public.avaliacoes TO service_role;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own avaliacoes" ON public.avaliacoes FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_avaliacoes_updated BEFORE UPDATE ON public.avaliacoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Questões
-- =========================
CREATE TABLE public.questoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  numero INT NOT NULL,
  tipo public.tipo_questao NOT NULL,
  -- MC: quantidade de alternativas (3-6). CE: 2. NUM: usa num_digitos.
  qtd_alternativas INT,
  num_digitos INT,
  gabarito TEXT,     -- ex.: 'C' | 'E' | 'V' | 'F' | '025'
  valor NUMERIC(6,2) NOT NULL DEFAULT 1,
  anulada BOOLEAN NOT NULL DEFAULT false,
  conteudo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (avaliacao_id, numero)
);
CREATE INDEX questoes_avaliacao_idx ON public.questoes(avaliacao_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.questoes TO authenticated;
GRANT ALL ON public.questoes TO service_role;
ALTER TABLE public.questoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own questoes" ON public.questoes FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_questoes_updated BEFORE UPDATE ON public.questoes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =========================
-- Respostas de alunos
-- =========================
CREATE TABLE public.respostas_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  avaliacao_id UUID NOT NULL REFERENCES public.avaliacoes(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES public.alunos(id) ON DELETE CASCADE,
  questao_id UUID NOT NULL REFERENCES public.questoes(id) ON DELETE CASCADE,
  resposta TEXT,        -- pode ser vazia = em branco
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (aluno_id, questao_id)
);
CREATE INDEX resp_avaliacao_idx ON public.respostas_alunos(avaliacao_id);
CREATE INDEX resp_aluno_idx ON public.respostas_alunos(aluno_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.respostas_alunos TO authenticated;
GRANT ALL ON public.respostas_alunos TO service_role;
ALTER TABLE public.respostas_alunos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own respostas" ON public.respostas_alunos FOR ALL
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);
CREATE TRIGGER trg_resp_updated BEFORE UPDATE ON public.respostas_alunos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
