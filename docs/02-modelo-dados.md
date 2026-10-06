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
Importado de `config/mapa_aprovado.csv` (setembro) e, desde a `035`, do teste de outubro do
Yuri (`96838ab`, `entregaveis/`), com nov/dez de FI/OL/PR provisórios. **Somente escrita pela importação.**
```
frente_id      uuid references frentes not null
atividade      text not null      -- 'materiais'|'sincronizacao'|'roteiro'|'auditoria'
                                  -- |'materiais_sinc'|'roteiro_auditoria'|'compacto'|'sinc_auditoria'
competencia    date not null      -- primeiro dia do mês
pessoa_id      uuid references pessoas not null
dupla_id       uuid references pessoas           -- segunda pessoa do elo (033); null = sozinho
origem_commit  text               -- sha do dimensionamento de onde veio
importado_em   timestamptz not null default now()
unique (frente_id, atividade, competencia)
```

### `competicoes`
Cadastro, criado em `007`. Competição nova aparece na varredura do Airtable e fica sem
frente até alguém classificar; classificar propaga para os eventos dela, por trigger (`013`).
```
nome            text not null unique
frente_id       uuid references frentes      -- null = ainda não classificada
origem          text                         -- 'airtable' | 'manual'
entrega_padrao  text not null default 'lider_decide'   -- 'sim'|'nao'|'lider_decide'
ativa           boolean not null default true
```

### `taxas`
`config/taxas.yaml` com data de vigência (`008`). Medir para poder mudar é o ponto do app,
então a taxa não pode ser constante no código.
```
atividade   text not null
minutos     integer not null check (minutos > 0)
vigente_de  date not null
fonte       text                  -- ex.: 'medicao de campo jul/2026'
unique (atividade, vigente_de)
```
`private.taxa_min(atividade, data)` devolve a taxa vigente naquela data.

### `cadeia`
Qual cadeia cada frente executa por evento, e **quando** cada elo acontece (`008`, `011`, `016`).
```
frente_id          uuid references frentes not null
competicao_id      uuid references competicoes     -- exceção para uma competição só
atividade          text not null
ordem              integer not null
escalado_regra     text not null default 'mapa'
abre_offset_dias   integer not null default 0      -- dias relativos ao evento, negativo = antes
prazo_offset_dias  integer not null default 2
vigente_de         date not null default '2026-08-01'   -- (032)
vigente_ate        date                                 -- null = em vigor dali pra frente
```
A linha com `competicao_id` vence a linha genérica da frente. A cadeia de um evento é a que
está em vigor **na data do evento**: `private.cadeia_vigente(frente, competicao, data)`. Desde
01/10, FI, OL, PR e CP trocam `sincronizacao` + `auditoria` por `sinc_auditoria` (168 min,
janela −1 a +2); setembro segue com a cadeia antiga.

### `eventos`
Vem da varredura do Airtable. Um evento é competição mais data, não jogo individual.
```
evento_id_origem    text not null        -- rótulo legível, com índice não único (010)
airtable_record_id  text                 -- a chave de verdade: o record id do Airtable
competicao          text not null
competicao_id       uuid references competicoes
data                date not null
inicio_brt          timestamptz
frente_id           uuid references frentes      -- pode nascer null (009)
tipo                text not null default 'normal'
                    -- 'normal'|'reprise'|'gravacao'|'externa'|'sem_narracao'|'pre_jogo'
entrega             boolean              -- tem entrega comercial? null = indefinido
entrega_origem      text                 -- 'previsto'|'escala'|'lider'
entrega_escala      text                 -- valor cru do tem_entrega da Escala: 'sim'|'nao'|'indefinido' (036)
status_origem       text
detentor            text
last_modified       timestamptz          -- do Airtable, para varredura incremental
sincronizado_em     timestamptz
```
Só evento com `entrega = true` gera tarefa. Evento de tipo diferente de `normal` não gera
cadeia.

### `tarefas`
A unidade de trabalho: um evento cruzado com uma tarefa da cadeia.
```
evento_id            uuid references eventos not null
frente_id            uuid references frentes not null
atividade            text not null
competencia          date not null
escalado_id          uuid references pessoas not null    -- do mapa
dupla_id             uuid references pessoas             -- do mapa; dupla divide a tarefa (033)
origem               text not null default 'cadeia'      -- 'cadeia' | 'avulsa' (criada à mão, 040)
dono_manual          boolean not null default false      -- redirecionada à mão: reaplicar_mapa não mexe (040)
responsavel_real_id  uuid references pessoas             -- quem fez; null enquanto pendente
estimativa_min       integer not null                    -- da taxa, não digitada
abre_em              date not null                       -- evento + abre_offset_dias (016)
prazo_em             timestamptz not null                -- evento + prazo_offset_dias, fim do dia
status               text not null default 'pendente'
                     -- 'pendente'|'entregue'|'fora_do_prazo'|'na'
concluida_em         timestamptz
desvio_motivo        text
excecao              text
excecao_desc         text
obs                  text
unique (evento_id, atividade)
```

Um desvio de escala não é um campo: é `responsavel_real_id` diferente do escalado **e** da dupla.
A dupla lê as sessões e ajustes da tarefa e escreve nela como o escalado.

### `sessoes`
```
tarefa_id   uuid references tarefas not null
pessoa_id   uuid references pessoas not null
inicio      timestamptz not null
fim         timestamptz
motivo_fim  text   -- 'pausa'|'entrega'|'troca'|'retomada_apos_fechar'
```
Índice único parcial (044, 06/10): `create unique index on sessoes (pessoa_id, tarefa_id) where fim is null;`
Várias sessões abertas por pessoa (um cronômetro por tarefa, cada um somando tempo cheio), mas
só uma por (pessoa, tarefa). `'troca'` só acontece ao mudar de parte dentro da mesma tarefa.
Até a 043 era uma por pessoa e trocar de tarefa fechava a atual.

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

**`v_tempo_tarefa`** — soma das sessões fechadas mais os ajustes, por tarefa, **em segundos**
(`segundos_cronometro`, `minutos_ajuste`, `segundos_total`, `minutos_total` derivado, e
`sessao_aberta_desde`). O minuto nunca é a fonte: arredondar aqui fazia o relógio voltar
(`020`).

**`v_semana_frente`** — o fechamento semanal que hoje sai do `fechar_semana.py`:
tarefas, entregues, pendentes, fora do prazo, desvios de escala, exceções.

**`v_mes_pessoa`** — por pessoa e competência: horas medidas, horas previstas (soma das
estimativas), desvio percentual, entregues, fora do prazo, desvios de escala. Tarefa em dupla
conta **meio a meio** (previsto e medido) pros dois, a menos que um terceiro tenha feito (`033`).

**`v_taxa_real`** — por atividade e competência: média do tempo medido contra a taxa vigente.
É a view que diz se `config/taxas.yaml` ainda vale.

## Funções

| Função | O que faz |
|---|---|
| `gerar_tarefas(inicio, fim)` | Cria as tarefas dos eventos do período: só evento com `entrega = true` e `tipo = 'normal'`, uma tarefa por elo da `cadeia`, estimativa pela taxa vigente, janela pelos offsets, dupla do mapa. Está na v5 (`034`): cadeia pela `cadeia_vigente` |
| `desfazer_tarefas_fora_da_cadeia()` | Pendente do mês corrente em diante cuja atividade saiu da cadeia vigente: sem tempo some, com tempo vira `na`/`fora_da_cadeia` (`034`) |
| `reaplicar_mapa(competencia)` | Alinha escalado e dupla das pendentes sem tempo ao mapa do mês, só em elo `escalado_regra = 'mapa'`. Devolve reescaladas, sem mapa e divergentes com tempo (`034`/`035b`) |
| `aplicar_entrega_da_escala()` | Aplica `entrega_escala`: sim/não com origem `escala`; `indefinido` volta a null só se a decisão era da Escala; `lider` nunca muda (`036`/`037`) |
| `desfazer_tarefas_sem_entrega()` | Pendente do mês corrente em diante em evento sem entrega: sem tempo some, com tempo vira `na`/`sem_entrega`; reabre se a entrega volta (`037`) |
| `private.cadeia_vigente(frente, competicao, data)` | A cadeia em vigor na data; competição vence frente (`032`) |
| `tarefas_da_semana(inicio, fim)` | A semana de uma pessoa: tarefa cuja janela cruza a semana pedida, não os eventos da semana (`016`) |
| `private.taxa_min(atividade, data)` | A taxa vigente naquela data |
| `private.eu()`, `private.meu_papel()`, `private.sou_gestor()`, `private.lidero(frente)` | Quem está pedindo, usadas nas policies |
| `private.liga_conta()` | Trigger de primeiro login: acha `pessoas` pelo e-mail e preenche `auth_user_id` |
| `private.propaga_frente()` | Trigger: classificar a competição preenche a frente dos eventos dela (`013`) |

As funções de permissão vivem no schema `private` e ficam **fora da API** (`006`). Em
`public` elas viravam endpoint `/rpc/` no PostgREST; as policies continuam podendo chamá-las.

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
