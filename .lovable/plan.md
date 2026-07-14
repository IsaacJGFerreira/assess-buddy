# Devolutiva automática por e-mail

## O que será entregue

1. **Campo de e-mail do aluno** no cadastro (Turmas → aluno).
2. **Comentários por questão** que você escreve na avaliação, incluindo **orientação de correção** para questões discursivas (nota atribuída manualmente + feedback).
3. **Geração automática de PDF** da devolutiva por aluno (mesmo layout da tela atual `/devolutiva/:alunoId`), incluindo os comentários.
4. **Envio por e-mail** do PDF em anexo — um clique dispara para toda a turma (ou aluno individual). Usa a infraestrutura de e-mail gerenciada da Lovable (seu próprio domínio).

## Fluxo do usuário

```text
Avaliação corrigida
  → aba "Devolutiva"
    → escrever comentário geral + comentário por questão
    → para cada discursiva: nota manual (0–valor) + feedback
    → botão "Enviar devolutivas por e-mail"
      → gera PDF por aluno + envia
      → mostra status (enviado / suprimido / sem e-mail / erro) por aluno
```

## Mudanças no banco

- `alunos.email` (texto, opcional, validado).
- `questoes.comentario` (texto, opcional) — comentário do professor exibido na devolutiva.
- `respostas_alunos.nota_manual` (numérico, opcional) — usado para questões discursivas.
- `respostas_alunos.feedback` (texto, opcional) — comentário específico para aquela resposta do aluno (útil em discursivas).
- Nova tabela `envios_devolutiva` (aluno_id, avaliacao_id, email, status, erro, enviado_at) para histórico e evitar reenvios duplicados.

O cálculo de nota passa a somar `nota_manual` quando a questão é `disc`.

## Configuração de e-mail

- Requer domínio de e-mail configurado (Lovable Emails). Se ainda não estiver, abro o setup antes.
- Um template React Email de devolutiva com identidade do app (assunto: "Sua devolutiva — {{titulo}}").
- Envio server-side via `createServerFn` que: (a) verifica permissão, (b) gera o PDF no servidor a partir dos dados, (c) chama `sendTemplateEmail` com o PDF como link para download assinado do Storage (anexos não são suportados no envio gerenciado — o e-mail traz um link seguro com validade).
- PDF armazenado num bucket privado `devolutivas` com URL assinada de 30 dias.

## Detalhes técnicos

- Geração de PDF no servidor com `pdf-lib` + render simples do HTML → evita depender do navegador. Layout fiel ao print atual: cabeçalho, métricas, tabela questão-a-questão, comentários, seção "correção do aluno" para discursivas.
- Server function `enviarDevolutivas({ avaliacaoId, alunoIds? })` roda em lote sequencial, respeitando rate limit (aguarda `retryAfterSeconds` em 429).
- UI: nova aba/rota `_authenticated/avaliacoes.$id.devolutiva.tsx` (dashboard) — lista alunos, editor de comentários, botão de envio, tabela de status.
- Cadastro de aluno (Turmas): input de e-mail com validação; exibido na lista.

## Fora de escopo

- Envio recorrente / agendado.
- Anexos binários no e-mail (Lovable Emails não suporta anexos — usamos link assinado).
- Edição do PDF pelo usuário antes do envio (o PDF é gerado a partir dos dados salvos).

Confirma? Se sim, começo pelo domínio de e-mail (se necessário) e sigo pelas migrações.
