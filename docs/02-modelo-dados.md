# Modelo de dados

Postgres no Supabase. Toda tabela tem `id uuid primary key default gen_random_uuid()`,
`created_at timestamptz default now()` e `updated_at timestamptz default now()`.

Nomes e valores espelham o dimensionamento de propósito, para que um CSV de lá e uma linha
daqui digam a mesma coisa.

## Tabelas

### `pessoas`
Espelha `config/pessoas.csv`. Ninguém é apagado: quem sai ganha `saida`.

```
nome            text not null
email           text not null unique          -- @livemode.com
nivel           text not null                 -- 'Analista Sr' | 'Analista Pl' | 'Estagiário'
h_dia           numeric not null              -- 8 ou 6
papel           text not null                 -- 'gestor' | 'lider' | 'membro'
entrada         date
saida           date
restrito_a      text[]                        -- ex.: {'NA'} para o Daniel
auth_user_id    uuid references auth.users    -- preenchido no primeiro login
```

### `frentes`
```
sigla     text not null unique   -- 'FI' | 'OL' | 'PR' | 'CP' | 'NA'
nome      text not null          -- 'Fut Inter', 'Olímpicos', ...
lider_id  uuid references pessoas
regime    text not null          -- 'rotacao_mensal' | 'rotacao_torneio' | 'dupla_fixa'
ativa     boolean not null default true
```

### `mapa`
Importado de `config/mapa_aprovado.csv`. **Somente escrita pela importação.**
```
frente_id      uuid references frentes not null
atividade      text not null      -- 'materiais'|'sincronizacao'|'roteiro'|'auditoria'
                                  -- |'materiais_sinc'|'roteiro_auditoria'
competencia    date not null      -- primeiro dia do mês
pessoa_id      uuid references pessoas not null
origem_commit  text               -- sha do dimensionamento de onde veio
importado_em   timestamptz not null default now()
unique (frente_id, atividade, competencia)
```

### `eventos`
Vem do export da Matriz. Um evento é competição mais data, não jogo individual.
```
evento_id_origem  text not null unique   -- ex.: 'La Liga 2026_2026-09-22'
competicao        text not null
data              date not null
frente_id         uuid references frentes not null
```

### `tarefas`
A unidade de trabalho: um evento cruzado com uma tarefa da cadeia.
```
evento_id            uuid references eventos not null
frente_id            uuid references frentes not null
atividade            text not null
competencia          date not null
escalado_id          uuid references pessoas not null    -- do mapa
responsavel_real_id  uuid references pessoas             -- quem fez; null enquanto pendente
estimativa_min       integer not null                    -- da taxa, não digitada
prazo_em             timestamptz not null                -- evento + 48h
status               text not null default 'pendente'
                     -- 'pendente'|'entregue'|'fora_do_prazo'|'na'
concluida_em         timestamptz
desvio_motivo        text
excecao              text
excecao_desc         text
obs                  text
unique (evento_id, atividade)
```

Um desvio de escala não é um campo: é `responsavel_real_id <> escalado_id`.

### `sessoes`
```
tarefa_id   uuid references tarefas not null
pessoa_id   uuid references pessoas not null
inicio      timestamptz not null
fim         timestamptz
motivo_fim  text   -- 'pausa'|'entrega'|'troca'|'retomada_apos_fechar'
```
Índice único parcial: `create unique index on sessoes (pessoa_id) where fim is null;`
Uma sessão aberta por pessoa. Trocar de tarefa fecha a atual com `'troca'`.

### `ajustes_tempo`
```
tarefa_id     uuid references tarefas not null
pessoa_id     uuid references pessoas not null
minutos_delta integer not null    -- pode ser negativo
motivo        text not null       -- obrigatório
```

### `plantoes`
Importado da Escala. Nunca editável aqui.
```
pessoa_id     uuid references pessoas not null
data          date not null
competicao    text
tipo          text not null      -- 'du' (4,5h) | 'fds' (h_dia da pessoa)
horas         numeric not null
importado_em  timestamptz not null default now()
```

## Views

**`v_tempo_tarefa`** — soma das sessões fechadas mais os ajustes, por tarefa.

**`v_semana_frente`** — o fechamento semanal que hoje sai do `fechar_semana.py`:
tarefas, entregues, pendentes, fora do prazo, desvios de escala, exceções.

**`v_mes_pessoa`** — por pessoa e competência: horas medidas, horas previstas (soma das
estimativas), desvio percentual, entregues, fora do prazo, desvios de escala.

**`v_taxa_real`** — por atividade e competência: média do tempo medido contra a taxa vigente.
É a view que diz se `config/taxas.yaml` ainda vale.

## Permissões (RLS)

Ligada em todas as tabelas. O papel vem de `pessoas.papel`, resolvido pelo `auth.uid()`.

| Tabela | membro | líder | gestor |
|---|---|---|---|
| `tarefas` | lê e escreve onde é `escalado_id` ou `responsavel_real_id` | lê e escreve todas das frentes que lidera | tudo |
| `sessoes`, `ajustes_tempo` | só as próprias | lê as da sua frente | tudo |
| `pessoas`, `frentes` | lê | lê | lê e escreve |
| `mapa`, `eventos`, `plantoes` | lê | lê | lê; escrita só pela importação |

A importação roda com service role, no servidor. Essa chave nunca vai para o cliente.

## Primeiro login

`auth.users` recebe o usuário do Google. Um trigger procura `pessoas` pelo e-mail e preenche
`auth_user_id`. Se não achar, nenhuma linha é criada e o app mostra a tela de fora do time.
Ninguém se cadastra sozinho.
