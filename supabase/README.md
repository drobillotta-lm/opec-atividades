# Banco

Projeto Supabase `opec-atividades`, região São Paulo (`sa-east-1`),
ref `igzrrsqmweuritiqrmrh`.

As migrations em `migrations/` são a fonte de verdade do schema e estão aplicadas
no projeto, em ordem. O modelo e as regras de acesso estão explicados em
`../docs/02-modelo-dados.md`.

| Migration | O que faz |
|---|---|
| `001_tabelas.sql` | As 8 tabelas, índices e o índice único de uma sessão aberta por pessoa |
| `002_views.sql` | Tempo por tarefa, fechamento semanal, mês por pessoa, taxa real |
| `003_rls.sql` | Permissões e o gatilho de primeiro login |
| `004_semear_pessoas_e_frentes.sql` | As 9 pessoas e as 6 frentes, do dimensionamento |
| `005_mapa_setembro.sql` | O mapa aprovado de setembro, 18 linhas |
| `006_funcoes_fora_da_api.sql` | Move as funções auxiliares para um schema que a API não expõe |

## Regras

- **Nunca editar uma migration já aplicada.** Mudança é migration nova, numerada.
- `mapa`, `eventos` e `plantoes` não têm policy de escrita de propósito: só entram por
  importação, que roda no servidor com a service role.
- A service role ignora RLS. Essa chave nunca vai para o cliente.
- Depois de mexer em policy, rodar o verificador de segurança do Supabase e conferir
  que volta limpo.
