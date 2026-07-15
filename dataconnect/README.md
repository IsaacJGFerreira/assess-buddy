# Firebase SQL Connect — Assess Buddy

Este diretório contém a nova base relacional do Assess Buddy no Firebase SQL Connect.

## Recursos configurados

- Projeto Firebase: `folha-502415`
- Serviço SQL Connect: `assess-buddy`
- Região: `southamerica-east1`
- Instância Cloud SQL: `assess-buddy-instance`
- Banco PostgreSQL: `assess-buddy-database`

## Estrutura

- `dataconnect.yaml`: vínculo com o serviço e a instância já criados no Firebase.
- `schema/schema.gql`: modelo relacional do produto.
- `app/connector.yaml`: configuração do conector e do SDK Web gerado.

## Segurança planejada

Todas as entidades pertencentes ao professor possuem `ownerUid`, preenchido com `auth.uid`. As operações do conector deverão sempre:

1. exigir `@auth(level: USER)`;
2. gravar o proprietário usando `ownerUid_expr: "auth.uid"`;
3. filtrar leituras, atualizações e exclusões usando `ownerUid: { eq_expr: "auth.uid" }`.

Nenhuma operação administrativa ou credencial do Gmail será exposta no SDK do navegador.

## Implantação

A implantação do esquema será feita somente após validação na branch de migração. O banco atual do Supabase continua sendo a produção até a conclusão das etapas de autenticação, operações, arquivos e funções.
