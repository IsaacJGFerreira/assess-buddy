## Sistema de Folhas de Respostas — Plano de Construção

Projeto grande. Proponho entregar em fases, começando pelo MVP descrito na seção 20 do briefing. Antes de codar, preciso alinhar alguns pontos.

### Perguntas de escopo

1. **Autenticação e multiusuário**: o sistema é para um único professor (uso local) ou vários professores com login? Isso define se ativamos Lovable Cloud (banco + auth) desde já.
2. **Persistência**: começo com Lovable Cloud (Postgres, recomendado para dados de alunos/avaliações/gabaritos) ou prefere protótipo em `localStorage` primeiro?
3. **Escopo da Fase 1 (MVP)**: confirma que atacamos exatamente a seção 20 do briefing? (turmas/alunos, avaliações, MC + C/E + numérica 000–999, gabarito, PDF da folha, digitação manual, correção automática, relatórios individual/turma, folha de devolutiva).

### Fase 1 — MVP (o que vou construir primeiro)

**Modelo de dados (Lovable Cloud / Postgres)**
- `turmas` (nome, série, ano)
- `alunos` (nome, matrícula, chamada, turma_id)
- `avaliacoes` (título, disciplina, turma_id, data, valor_total, instruções, status, versões)
- `questoes` (avaliacao_id, número, tipo [`mc`|`ce`|`num`], alternativas, gabarito, valor, anulada, conteúdo)
- `respostas` (avaliacao_id, aluno_id, questao_id, resposta, situação, pontuação)
- `versoes_prova` (avaliacao_id, código, mapa de embaralhamento)

**Telas (rotas TanStack Start)**
- `/` painel: lista de avaliações com status, turma, média
- `/turmas` e `/turmas/$id` (CRUD + import CSV de alunos)
- `/avaliacoes/nova` wizard: dados gerais → questões → gabarito → revisão
- `/avaliacoes/$id` visão geral com abas: Configuração · Gabarito · Folhas · Correção · Relatórios
- `/avaliacoes/$id/folha` preview + geração de PDF (react-pdf ou impressão via `window.print` com CSS print)
- `/avaliacoes/$id/corrigir/$alunoId` digitação manual com atalhos de teclado
- `/avaliacoes/$id/relatorio` turma + drill-down por questão
- `/avaliacoes/$id/devolutiva/$alunoId` folha de devolutiva imprimível

**Funcionalidades principais Fase 1**
- Construtor de questões (adicionar, duplicar, reordenar, excluir)
- Validação: soma de valores = valor_total, todas com gabarito, sem lacunas de numeração
- Geração de PDF com: cabeçalho institucional, identificação do aluno, bolhas MC/CE, colunas C/D/U para numéricas 000–999, versão da prova, código
- Folha genérica OU personalizada por aluno
- Correção automática (comparação com gabarito, tratamento de anuladas, dupla marcação, em branco)
- Recalcular notas quando o gabarito muda + histórico de alterações
- Relatórios: média/mediana/max/min, % acerto por questão, distribuição por alternativa, ranking de conteúdos difíceis
- Devolutiva com símbolos ✓ ✕ — ! e espaço "Correção do aluno"

**Stack técnica**
- TanStack Start (já configurado) + TanStack Query
- Lovable Cloud (Postgres + Auth + RLS por professor)
- shadcn/ui + Tailwind (design system limpo, focado em impressão)
- `@react-pdf/renderer` para gerar PDFs das folhas e devolutivas
- CSV import via `papaparse`

**Design**
- Interface do professor: densa, tabular, cores neutras, foco em produtividade (atalhos de teclado na correção)
- Folha impressa: preto e branco puro, alto contraste, bolhas grandes, tipografia sóbria (Inter ou similar)

### Fase 2 (depois do MVP validado)
- Versões embaralhadas com mapeamento reverso
- Múltiplas alternativas configuráveis (A–C, A–D, A–E, custom)
- Certo/Errado no modelo CEBRASPE (erro anula acerto)
- Questões discursivas e resposta curta (correção manual + nota parcial)
- Bônus/anulada em massa, tolerância numérica, unidade de medida
- QR Code por aluno (biblioteca `qrcode`)
- Banco de modelos reutilizáveis
- Modo "correção pelo aluno" em 3 etapas
- Exportação CSV/planilha de resultados
- Comentários e observações do professor por questão

### Fase 3 (futuro)
- Leitura automática por câmera / scanner (OMR)
- Login para alunos verem sua devolutiva online
- Comparação de desempenho entre avaliações
- Integração com sistemas externos

### O que preciso de você para começar
Responda as 3 perguntas acima e eu começo pela Fase 1. Se quiser, já posso ativar o Lovable Cloud e montar o esqueleto (modelo de dados + navegação + tela de turmas) na primeira leva.
