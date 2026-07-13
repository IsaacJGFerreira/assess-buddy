-- Ensure PostgREST sees the answer-sheet tables and RPC immediately after deploy.
NOTIFY pgrst, 'reload schema';
