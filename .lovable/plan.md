# Fundação Firebase (Auth + Data Connect) — sem migrar dados

Objetivo desta etapa: iniciar o Firebase no front-end, autenticar por e-mail/senha e Google, observar sessão, proteger `/_authenticated` e preparar o cliente do Data Connect. Fluxos de dados de negócio (turmas, avaliações, respostas) e envio de e-mail via Gmail permanecem no Supabase até etapas seguintes.

## Premissas
- Banco Firebase inicia vazio; nenhuma migração de dados nesta etapa.
- Firebase Auth passa a ser a **fonte única de verdade da sessão** já nesta fase — o Supabase Auth atual será desligado do fluxo do usuário. Sem isso, teríamos duas sessões concorrentes (Supabase e Firebase) e a guarda de rota ficaria ambígua.
- Chamadas de dados que hoje usam `supabase` continuam funcionando enquanto o usuário estiver logado no Firebase, porque as tabelas Supabase seguirão acessíveis via chaves atuais até a próxima etapa. Onde houver RLS por `auth.uid()` do Supabase, isso deixará de funcionar assim que a sessão Supabase for descartada — mapeamos isso em "Riscos" e propomos mitigação.
- Data Connect: o schema `dataconnect/` (serviceId `assess-buddy`, connector `app`) já existe. O SDK JS gerado é esperado em `src/generated/dataconnect` (`@assess-buddy/dataconnect`) mas ainda não está no repo — a geração/instalação do SDK fica para o momento em que formos consumir queries; nesta etapa só preparamos o cliente base.

## Variáveis de ambiente (nova adição em `.env` / `.env.example`)
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_MESSAGING_SENDER_ID=  # opcional
VITE_FIREBASE_STORAGE_BUCKET=       # opcional
VITE_DATA_CONNECT_LOCATION=southamerica-east1
VITE_DATA_CONNECT_SERVICE_ID=assess-buddy
VITE_DATA_CONNECT_CONNECTOR_ID=app
```
As variáveis Supabase (`VITE_SUPABASE_*`) permanecem enquanto os módulos de dados/Gmail ainda dependerem delas.

## Arquivos a criar
- `src/integrations/firebase/client.ts` — inicializa `initializeApp` a partir das `VITE_FIREBASE_*`, exporta `firebaseApp` e `auth = getAuth(firebaseApp)`. Guarda contra reinit em HMR.
- `src/integrations/firebase/auth.ts` — helpers: `signInWithEmail`, `signUpWithEmail`, `signInWithGooglePopup` (usando `GoogleAuthProvider`), `signOut`, `onAuthChange(callback)`, `getCurrentUser()`.
- `src/integrations/firebase/dataconnect.ts` — cria e exporta uma instância única do Data Connect via `getDataConnect({ connector: 'app', service: 'assess-buddy', location: 'southamerica-east1' })` a partir de `firebase/data-connect`. Sem queries ainda; apenas o cliente pronto para consumo posterior. Inclui um `TODO` apontando para o SDK gerado em `src/generated/dataconnect` quando for gerado.
- `src/hooks/use-firebase-user.ts` — hook React que assina `onAuthStateChanged` e expõe `{ user, loading }`.

## Arquivos a modificar
- `.env` e `.env.example` — adicionar variáveis `VITE_FIREBASE_*` e as três `VITE_DATA_CONNECT_*`. Não remover as `VITE_SUPABASE_*` ainda.
- `package.json` — adicionar dependência `firebase` (SDK web modular). Nada removido.
- `src/routes/_authenticated/route.tsx` — trocar a checagem `supabase.auth.getUser()` no `beforeLoad` por espera na sessão do Firebase (`auth.authStateReady()` + `auth.currentUser`); trocar `signOut` para `firebaseSignOut`; manter o efeito do Gmail intacto (ainda depende de `user.email`, o que o `User` do Firebase também expõe). Manter `ssr: false`.
- `src/routes/auth.tsx` — substituir formulários e botão Google para usarem os helpers Firebase (`signInWithEmail`, `signUpWithEmail`, `signInWithGooglePopup`). Manter o fluxo de "marcar Gmail para setup pós‑login" (`markGmailSetupAfterGoogleLogin`) como está — a etapa Gmail continua Supabase‑backed nesta fase, portanto avaliar se o setup automático de Gmail é acionado apenas quando o Supabase estiver realmente integrado; se necessário, esconder o CTA de Gmail temporariamente (decisão registrada como TODO, não removeremos código do Gmail).
- `src/routes/__root.tsx` — trocar o `supabase.auth.onAuthStateChange` por `onAuthStateChanged` do Firebase para invalidar router/queries em SIGNED_IN/SIGNED_OUT/USER_UPDATED equivalentes.

## Arquivos intencionalmente NÃO alterados nesta etapa
- `src/integrations/supabase/*` (client, auth-attacher, auth-middleware, types) — permanecem para não quebrar módulos de dados/Gmail.
- `src/start.ts` — mantém `attachSupabaseAuth` (as server functions atuais que dependem dele continuam ativas). Um `functionMiddleware` equivalente para Firebase ID token entra em etapa futura quando houver server fns Firebase.
- `src/lib/gmail-sender.ts`, `supabase/functions/gmail-*` — inalterados.
- Rotas de negócio em `_authenticated/*` que fazem queries via `supabase` — inalteradas.

## Riscos de mistura entre duas autenticações
1. **Sessões concorrentes**: manter Supabase Auth ativo em paralelo geraria duas fontes de verdade. Mitigação: nesta etapa, o Supabase Auth deixa de ser usado pelo app (nem login, nem `getUser`). O `supabase` client continua sendo importado apenas para leitura/escrita de dados; sem sessão, ele opera como `anon`.
2. **RLS por `auth.uid()`**: qualquer política atual que exija usuário autenticado no Supabase deixará de aceitar as chamadas assim que descartarmos a sessão Supabase. Precisamos identificar antes de mergear quais tabelas exigem `authenticated`. Duas mitigações possíveis (a decidir na próxima etapa):
   - (a) Afrouxar temporariamente policies para permitir `anon` em leituras não sensíveis, ou
   - (b) Manter um "sign-in silencioso" de serviço no Supabase (não recomendado — reintroduz duas sessões).
   Recomendo (a) apenas onde já for público; caso contrário, aceitar que rotas de negócio ficarão quebradas até migrarem para Data Connect. Este risco precisa ser confirmado com você antes da implementação.
3. **Gmail OAuth**: o fluxo atual (`connectGmail`, edge functions `gmail-oauth`/`gmail-send`) casa o e-mail autorizado com `user.email` da sessão Supabase. Com Firebase, o `email` do usuário Google continua disponível, mas o backend `gmail-oauth` provavelmente identifica o professor pelo JWT do Supabase. Enquanto Gmail não for migrado, o CTA "Continuar com Google" pode disparar o setup Gmail sem que o backend reconheça o usuário. Mitigação: manter `markGmailSetupAfterGoogleLogin` porém desabilitar visualmente o fluxo Gmail (ou ignorar erros silenciosamente) até migrarmos Gmail. Registrado como TODO.
4. **Server functions Supabase-protegidas**: `requireSupabaseAuth` + `attachSupabaseAuth` continuam presentes. Sem sessão Supabase, qualquer server fn que dependa deles retornará 401. Precisamos listar essas server fns antes de prosseguir. Mitigação nesta etapa: não removê-las; assumir que ficam inacessíveis até migração.
5. **Prerender/SSR**: guarda `_authenticated` já é `ssr: false`, então `authStateReady` do Firebase é seguro no cliente. Nenhum loader público pode chamar código que dependa de Firebase Auth em SSR.
6. **HMR duplicando `initializeApp`**: mitigado por guarda no `client.ts` (`getApps().length ? getApp() : initializeApp(...)`).
7. **Data Connect sem SDK gerado**: se importarmos queries antes de rodar `firebase dataconnect:sdk:generate`, o build quebra. Mitigação: nesta etapa só preparamos `getDataConnect(...)`, sem importar do SDK gerado.

## Ordem segura de implementação
1. Adicionar variáveis `VITE_FIREBASE_*` e `VITE_DATA_CONNECT_*` em `.env.example` e pedir ao usuário para preencher `.env`.
2. Instalar `firebase` (dependência única).
3. Criar `src/integrations/firebase/client.ts` (init + guarda HMR) e `auth.ts` (helpers) — nenhuma rota consumindo ainda; app segue funcionando via Supabase.
4. Criar `src/hooks/use-firebase-user.ts` e `src/integrations/firebase/dataconnect.ts` (cliente base, sem queries).
5. Migrar `src/routes/auth.tsx` para Firebase (email/senha + Google popup). Testar login/cadastro no preview.
6. Migrar `beforeLoad` e `signOut` em `src/routes/_authenticated/route.tsx` para Firebase; ajustar efeito Gmail para não bloquear se o backend Gmail ainda estiver Supabase.
7. Trocar o assinante em `src/routes/__root.tsx` de `supabase.auth.onAuthStateChange` para `onAuthStateChanged` do Firebase.
8. Smoke test: login com e-mail/senha, login com Google, refresh em rota protegida, logout, e navegação para `/`.
9. Documentar (em `AGENTS.md` ou README de rotas) que rotas de negócio e Gmail permanecem Supabase-backed até etapas futuras, listando o que pode aparecer quebrado enquanto isso.

## Perguntas antes de partir para build
- Confirmar que aceitamos que rotas de negócio (`turmas`, `avaliacoes`, etc.) e o fluxo Gmail possam apresentar erros/leituras vazias até serem migradas — ou se prefere que eu proponha antes um levantamento das RLS/edge functions afetadas.
- Confirmar se o botão "Continuar com Google" deve continuar disparando o setup do Gmail nesta fase (arriscado) ou se devo desabilitar temporariamente (recomendado).
