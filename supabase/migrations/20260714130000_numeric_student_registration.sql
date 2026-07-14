-- Matrículas usadas pela leitura OMR precisam ser compostas somente por dígitos.
-- NOT VALID preserva cadastros antigos, mas a regra já vale para novos inserts e updates.
ALTER TABLE public.alunos
  ADD CONSTRAINT alunos_matricula_somente_numeros_check
  CHECK (matricula IS NULL OR matricula ~ '^[0-9]+$')
  NOT VALID;
