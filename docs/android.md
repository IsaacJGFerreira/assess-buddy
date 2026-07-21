# Folha para Android

O aplicativo Android instalável vive no mesmo repositório da aplicação web. Ele usa o identificador
`br.com.fazendofisica.folha`, o nome **Folha** e o mesmo Firebase Authentication, Data Connect e
Firebase Storage já usados pela web. A segunda etapa da Missão Android acrescenta paridade para as
funções principais sem transformar as páginas desktop em um WebView reduzido.

## Arquitetura

A aplicação web continua sendo construída por TanStack Start, com SSR e a entrada de servidor em
`src/server.ts`. Nenhum arquivo desse fluxo foi substituído. A versão móvel tem outra entrada:

1. `mobile/index.html` carrega `src/mobile/main.tsx`;
2. `vite.mobile.config.ts` gera um bundle cliente em `dist-mobile`;
3. `capacitor.config.ts` aponta `webDir` para esse bundle local;
4. o Capacitor copia o bundle para o projeto `android/` durante a sincronização;
5. o WebView Android abre os arquivos empacotados no APK, sem `server.url` e sem apontar para uma URL
   remota.

O shell móvel reutiliza os tipos, as integrações Firebase e as regras de domínio existentes. O login
chama as mesmas funções de `src/integrations/firebase/auth.ts`; turmas, alunos, avaliações, questões,
folhas, correções e devolutivas usam os mesmos módulos de dados da web. Relatórios, importação de
alunos e preparação de devolutivas foram extraídos para módulos compartilhados. Não existe uma
tabela local, uma API móvel ou um segundo backend.

A sessão do Firebase Authentication usa IndexedDB e recua para `localStorage` quando necessário. O
estado sobrevive ao encerramento e à reabertura do aplicativo até que o usuário toque em **Sair**.
O plugin Network atualiza os estados online/offline e pausa consultas enquanto não há conexão. A
barra de status fica integrada ao layout, os recuos de área segura usam `safe-area-inset-*` e o botão
voltar retorna no histórico ou minimiza o aplicativo quando não existe uma tela anterior. Quando o
Android volta ao primeiro plano, as consultas ativas são revalidadas para trazer alterações feitas
na versão web.

## Funções disponíveis no Android

- autenticação por e-mail e senha e persistência da sessão;
- painel com atalhos, totais e atividade recente;
- criação, edição e exclusão de turmas e alunos, inclusive importação CSV comum;
- criação, edição e exclusão de avaliações;
- questões de múltipla escolha, certo ou errado, numéricas e discursivas;
- reordenação, duplicação, anulação e exclusão de questões;
- configuração da matrícula e do layout da folha de respostas;
- visualização da folha, modelos salvos e histórico de versões;
- upload comum de JPG, PNG e PDF, correção manual e notas discursivas;
- relatórios, configuração de comentários e geração de devolutivas em PDF;
- exclusões em cascata por meio dos mesmos serviços compartilhados;
- atualização dos mesmos registros entre Android e web.

A navegação usa cabeçalho compacto e barra inferior. Tabelas largas foram substituídas por cartões,
listas e seletores horizontalmente roláveis. Os controles possuem alvo mínimo de 48 px, formulários
usam texto de 16 px e a barra inferior desaparece quando o teclado reduz a altura útil. Os perfis de
360, 390, 412 e 430 px são cobertos pelos testes de responsividade.

## Prova de sincronização

Depois do login, a tela móvel lista as turmas do usuário com a consulta Data Connect já utilizada
pela web e configurada com política `SERVER_ONLY`. Ao criar uma turma, o fluxo:

1. envia a mutação `criarTurma` ao Data Connect;
2. relê a lista diretamente do servidor;
3. procura nessa resposta o ID retornado pela mutação;
4. só mostra **Sincronização confirmada** quando o mesmo registro aparece na releitura.

Para conferir manualmente, entre no Android e na web com o mesmo e-mail, crie uma turma no
aplicativo e abra **Turmas** na versão web. O nome, a série e o ano serão os mesmos. O aplicativo
também mostra o ID como referência técnica da verificação.

## Pré-requisitos

- Node.js 22 ou mais recente;
- npm;
- JDK 21, preferencialmente o JDK embutido no Android Studio;
- Android Studio 2025.2.1 ou mais recente, com Android SDK e Platform Tools;
- um emulador configurado ou um aparelho com depuração USB para instalar o build.

## Configuração do Firebase

Copie `.env.example` para `.env` e preencha as variáveis públicas `VITE_FIREBASE_*`. O build móvel
lê o mesmo arquivo e o mesmo projeto usados pelo build web. Valores com prefixo `VITE_` entram no
bundle cliente e, portanto, nunca podem conter client secret, service account, chave de assinatura,
token privado ou credencial de servidor.

O Data Connect gerado já aponta para o serviço `assess-buddy`, conector `app`, na região
`southamerica-east1`. Não crie outro conector ou banco para o Android.

O `google-services.json` não é necessário nesta etapa: Firebase Authentication, Data Connect e
Storage usam o SDK JavaScript compartilhado. Se uma etapa futura adotar um plugin Firebase nativo,
baixe esse arquivo no Firebase Console, coloque-o manualmente em `android/app/google-services.json`
e mantenha-o fora do Git.

No Firebase Console, confirme que o provedor **E-mail/senha** está habilitado. Se App Check estiver
em modo obrigatório, a aplicação precisa inicializar o App Check para o SDK JavaScript usado dentro
do Capacitor; registrar somente o pacote Android não autoriza essas requisições.

## Comandos

Instalação limpa das dependências:

```bash
npm run mobile:install
```

Desenvolvimento da entrada móvel no navegador:

```bash
npm run mobile:dev
```

Build somente do bundle móvel:

```bash
npm run mobile:build
```

Build do bundle e sincronização dos arquivos/plugins com Android:

```bash
npm run mobile:sync
```

Sincronização e abertura no Android Studio:

```bash
npm run android:open
```

Geração do APK de desenvolvimento pela linha de comando:

```bash
npm run android:build:debug
```

Instalação do APK de desenvolvimento em um emulador ou aparelho já conectado:

```bash
npm run android:install:debug
```

No Windows, se for executar o Gradle diretamente dentro de `android/`, use
`gradlew.bat assembleDebug` ou `gradlew.bat installDebug`.

## Abrir no Android Studio

1. Execute `npm run mobile:sync` na raiz do repositório.
2. Abra a pasta `android` no Android Studio, ou execute `npm run android:open`.
3. Aguarde o Gradle Sync e instale o SDK solicitado pelo Android Studio, se necessário.
4. Escolha o módulo `app` e um emulador ou aparelho.
5. Use **Run app**. O aplicativo instalado deve aparecer como **Folha**.

Sempre execute `npm run mobile:sync` depois de alterar TypeScript, CSS, HTML, configuração do
Capacitor ou plugins. Não edite os arquivos copiados em `android/app/src/main/assets/public`, pois
eles são gerados novamente a cada sincronização.

Para a validação manual de responsividade, use emuladores ou perfis redimensionáveis próximos de
360, 390, 412 e 430 px. Em cada largura, percorra **Painel**, **Turmas** e todas as seções de uma
avaliação; abra um formulário e o teclado, role a folha de respostas e confirme que nenhum botão,
diálogo ou campo fica inacessível.

## Segurança e arquivos locais

O `.gitignore` protege sobrescritas locais de ambiente, `local.properties`, `google-services.json`,
keystores, configurações de assinatura, builds e artefatos Android. O `.env` já acompanhado pelo
projeto foi preservado para não interromper a aplicação web e deve conter somente configuração
pública do cliente. Segredos de servidor ficam no Lovable Cloud ou no gerenciador de segredos da CI.
Se algum segredo confidencial tiver sido versionado no passado, ele deve ser revogado e substituído
no serviço de origem. Não reescreva o histórico conectado ao Lovable.

O Android também bloqueia tráfego HTTP em texto aberto e desativa backup do aplicativo. Keystore,
alias e senhas de release devem ficar no gerenciador de segredos da CI ou na máquina responsável
pela assinatura, nunca no repositório.

## Limites desta etapa

- Login e cadastro móveis cobrem e-mail/senha; o login Google da web não foi levado para o shell
  Android neste PR.
- Upload comum pelo seletor de arquivos continua disponível. Câmera, galeria e compartilhamento
  nativo permanecem para os próximos PRs.
- A devolutiva pode ser configurada, gerada e baixada. Envio pelo Gmail nativo aguarda a futura
  integração Google Android.
- A comprovação ao vivo exige variáveis Firebase válidas e uma conta de teste; elas não são
  versionadas.
- Ícones e splash atuais são os iniciais do Capacitor. A identidade final e a assinatura de release
  pertencem ao quarto PR.

Este trabalho pertence à issue central **#48 — Missão Android — Aplicativo Folha**.
