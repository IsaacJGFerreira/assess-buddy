CREATE TABLE IF NOT EXISTS public.gmail_connections (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  google_email TEXT NOT NULL,
  refresh_token_ciphertext TEXT NOT NULL,
  refresh_token_iv TEXT NOT NULL,
  scopes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.gmail_oauth_states (
  state_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expected_email TEXT NOT NULL,
  return_url TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gmail_oauth_states_user_id_idx
  ON public.gmail_oauth_states(user_id);
CREATE INDEX IF NOT EXISTS gmail_oauth_states_expires_at_idx
  ON public.gmail_oauth_states(expires_at);

ALTER TABLE public.gmail_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gmail_oauth_states ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.gmail_connections FROM anon, authenticated;
REVOKE ALL ON TABLE public.gmail_oauth_states FROM anon, authenticated;
GRANT ALL ON TABLE public.gmail_connections TO service_role;
GRANT ALL ON TABLE public.gmail_oauth_states TO service_role;

COMMENT ON TABLE public.gmail_connections IS
  'Autorização criptografada do Gmail usada exclusivamente pelas Edge Functions.';
COMMENT ON TABLE public.gmail_oauth_states IS
  'Estados OAuth de uso único e curta duração para autorização do Gmail.';

NOTIFY pgrst, 'reload schema';
