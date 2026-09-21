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
| `007_competicoes_e_origem_airtable.sql` | Tabela `competicoes` (competição → frente) e os campos de origem do Airtable em `eventos` |
| `008_taxas_cadeia_e_geracao.sql` | Tabelas `taxas` e `cadeia`, e a função `gerar_tarefas` |

## Regras

- **Nunca editar uma migration já aplicada.** Mudança é migration nova, numerada.
- `mapa`, `eventos` e `plantoes` não têm policy de escrita de propósito: só entram por
  importação, que roda no servidor com a service role.
- A service role ignora RLS. Essa chave nunca vai para o cliente.
- Depois de mexer em policy, rodar o verificador de segurança do Supabase e conferir
  que volta limpo.
- Competição sem frente em `competicoes` não gera tarefa e aparece no Admin pedindo
  classificação. Nunca some em silêncio, que é o que o `gerar_semana.py` faz hoje.
- `gerar_tarefas(inicio, fim)` é idempotente e roda só com a service role.

## Sincronizacao com o Airtable

Base `appwE9LmmTxynTGFY`, tabela `tblpibvwAIGBQXr0H` (Matriz de Eventos LiveMode),
leitura apenas.

O filtro do conector exige `timeZone` em todo valor de data, e o fieldId vai como string
solta dentro de `operands`:

```json
{"operator":"and","operands":[
  {"operator":">=","operands":["fldCdKQpFps9nOK0z",{"mode":"exactDate","exactDate":"2026-09-21","timeZone":"America/Sao_Paulo"}]},
  {"operator":"<=","operands":["fldCdKQpFps9nOK0z",{"mode":"exactDate","exactDate":"2026-09-27","timeZone":"America/Sao_Paulo"}]}
]}
```

Campos usados:

| Field ID | Campo |
|---|---|
| `fldekFqFZH8RUPPQk` | Match ID |
| `flddMoEbOqSEQDUzw` | Status |
| `fldEZyzXTTzs6UMPc` | Competição formatada |
| `fldGlI8UhVvURezPg` | Detentor fórmula |
| `fldCdKQpFps9nOK0z` | Dia (para agrupamento) BRT |
| `fld8hthI7oI4MY5aP` | Início do Evento BRT |

Armadilhas confirmadas na base real:

- **`Início do Evento BRT` vem em UTC**, apesar do nome. Um evento às 22h30 de 25/09 em
  Brasília chega como `2026-09-26T01:30:00Z`. O agrupamento certo é por `Dia BRT`.
- **Campo vazio não vem como nulo, some do objeto.** Ler sempre com valor padrão.
- **Match ID não é chave.** É fórmula sobre os times: quando o confronto é "A definir"
  vários eventos ficam com o mesmo texto, e um cancelamento muda o texto. A chave é o
  record id.
- **`Last Modified` vem vazio na maioria dos registros**, então não dá para confiar nele
  como único gatilho de sincronização incremental. Ressincronizar a janela inteira é barato.
- Filtro por `Status` precisa do id da opção, não do nome.
