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
| `009_evento_pode_nascer_sem_frente.sql` | `eventos.frente_id` passa a aceitar nulo |
| `010_chave_do_evento_e_o_record_id.sql` | Tira a unicidade do Match ID, que não é chave |
| `011_tipo_do_evento_e_cadeia_por_competicao.sql` | `eventos.tipo`, cadeia própria por competição, atividade `compacto` |
| `012_gerar_tarefas_v2.sql` | Geração respeitando tipo, cadeia da competição e regra do escalado |
| `013_classificar_competicao_propaga_para_eventos.sql` | Classificar uma competição reclassifica os eventos dela |
| `014_entrega_comercial.sql` | `competicoes.entrega_padrao` e `eventos.entrega`, com os padrões medidos em setembro |
| `015_gerar_tarefas_v3_so_com_entrega.sql` | Só gera tarefa para evento com entrega |
| `016_janela_da_atividade.sql` | Cada atividade ganha janela relativa ao evento, e `tarefas_da_semana` |
| `017_gerar_tarefas_v4_com_janela.sql` | Geração recebe janela de trabalho, não janela de eventos |
| `018_competicoes_novas_de_3_semanas.sql` | 9 competições que o mapeamento do dimensionamento não conhece |
| `019_mais_tipos_de_evento.sql` | `[SEM NARRAÇÃO]` e `Pré Jogo` viram tipo próprio |
| `020_tempo_em_segundos_sem_arredondar.sql` | `v_tempo_tarefa` guarda segundos; o minuto nunca é a fonte |
| `021_importar_da_escala.sql` | `status_origem` aceita `'Manual'` (evento criado direto na Escala); `aplicar_previsao_entrega()`, a previsão da `014` virada função |
| `022_ajudar_tarefa_de_outra_pessoa.sql` | `le_tarefas` abre pra qualquer autenticado (buscar tarefa de outra pessoa); `escreve_tarefas` aceita quem tem sessão na tarefa, mesmo sem ser escalado |
| `023_search_path_da_previsao_de_entrega.sql` | Fecha o `search_path` mutável de `aplicar_previsao_entrega`, apontado pelo verificador de segurança |
| `024_evento_novo_herda_frente_da_competicao.sql` | Gatilho `before insert`: evento novo já nasce com a frente da competição, se ela já foi classificada — antes só propagava retroativo (013). Achado com o import da Escala: 233 dos 365 eventos ficaram sem frente por causa disso |
| `025_sigla_de_frente_deixa_de_ser_lista_fechada.sql` | `frentes.sigla` era uma lista fechada (FI/OL/PR/CP/NA/KG) — vira formato (2 a 6 letras), pra dar pra criar frente pela tela |
| `026_mapa_out_nov_dez.sql` | Mapa de outubro, novembro e dezembro do mesmo commit `a7a7f864` — a 005 só tinha trazido setembro, e outubro ficou sem escalado até 28/09 |
| `027_emails_reais_e_lider_de_nacional.sql` | E-mails dos 6 fixos passam a ser os da Escala (`breis@` etc.; os antigos eram palpite e quebravam o primeiro login); Juliana lidera Nacional |
| `028_desfazer_tarefa_de_evento_cancelado.sql` | `desfazer_tarefas_de_evento_cancelado()`: sem sessão nem ajuste a tarefa some, com tempo vira `na`/`cancelado`. Roda a cada sincronização |
| `029_evento_herda_frente_na_sincronizacao.sql` | `herdar_frente_da_competicao()`: evento que já existia sem frente quando a competição foi classificada por outro caminho. Roda a cada sincronização |
| `030_subtarefas.sql` | Sub-tarefas: `subtarefas` (título, dono, quem criou, status), `sessoes.subtarefa_id` opcional com gatilho de coerência, RLS, e `v_tempo_subtarefa`. `v_tempo_tarefa` não muda: o tempo da parte soma na tarefa-mãe |
| `031_atividade_sinc_auditoria.sql` | Atividade `sinc_auditoria` nos 4 checks, taxa 168 min desde 01/10 (teste do Yuri: 20% a menos que sinc + auditoria) |
| `032_cadeia_com_vigencia.sql` | `cadeia.vigente_de/vigente_ate` e `private.cadeia_vigente()`; FI/OL/PR/CP fecham sinc e auditoria em 30/09 e ganham `sinc_auditoria` em 01/10 |
| `033_dupla.sql` | `mapa.dupla_id` e `tarefas.dupla_id`; dupla escreve na tarefa e lê sessões/ajustes; desvio exclui a dupla; `v_mes_pessoa` meio a meio |
| `034_gerar_tarefas_v5_e_reaplicar_mapa.sql` | `gerar_tarefas` v5 (cadeia vigente + dupla), `desfazer_tarefas_fora_da_cadeia()`, `reaplicar_mapa()` |
| `035_mapa_outubro_teste_do_yuri.sql` | OL vira "Olímpicos + Tênis"; mapa de FI/OL/PR/CP out–dez refeito (outubro e CP do Yuri, FI/OL/PR nov/dez provisórios). Rodado depois: 243 apagadas, 113 criadas, 158 reescaladas |
| `035b_reaplicar_mapa_sem_ambiguidade.sql` | Corrige a `reaplicar_mapa` da 034 (coluna da CTE com o nome do parâmetro de saída) |
| `036_entrega_da_escala.sql` | `eventos.entrega_escala` (valor cru da Escala), `aplicar_entrega_da_escala()` (sim/não valem; indefinido desfaz decisão da Escala, nunca a do líder) e previsão v3, que reavalia o que ela mesma previu |
| `037_desfazer_tarefas_sem_entrega.sql` | `desfazer_tarefas_sem_entrega()`: espelho da 028 para evento que perdeu a entrega, e reabre quando ela volta; só do mês corrente em diante. Endurece a 036 (só `'indefinido'` explícito desfaz). Primeira rodada: 8 apagadas |
| `038_sincronizacoes.sql` | Log de cada sincronização (`relogio`/`botao`, resumo ou erro); só gestor lê, 30 dias |
| `039_atividades.sql` | Tabela `atividades` (código, rótulo, ativa) com as 8 atuais; os 4 checks de atividade viram FK. Atividade nova sai pela tela, sem migration |
| `040_organizar_funcoes.sql` | Funções do `/admin/organizar` (atividade, taxa, janela, mapa, tarefa a tarefa), só service role. `tarefas.dono_manual` e `tarefas.origem` (`cadeia`/`avulsa`): redirecionada não volta pro mapa e avulsa não é desfeita pela sincronização |
| `041_v_cadeia_atual.sql` | O que vale hoje por frente: cadeia em vigor, taxa, janela e o mapa do mês |
| `042_notch_pareamento.sql` | Notch nativo do Windows (`desktop/`): `notch_codigos` (código de uso único, 5 min) e `notch_dispositivos` (token por aparelho, revogável). Só sha256 guardado; escrita só pela service role |
| `043_notch_rapido_e_comecar_do_zero.sql` | Tarefa `registrada` (sem evento, título livre, frente opcional) e as funções `notch_*`: cada ação do notch numa chamada só |
| `044_varios_cronometros_e_notch_entrega.sql` | Vários cronômetros por pessoa (índice passa a `(pessoa_id, tarefa_id) where fim is null`), `notch_estado` v2 (listas `correndo`/`pausadas`/`proximas` da semana/`atrasadas`), `notch_pausar_tarefa`, `notch_entregar` |

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
- Função com temp table (`gerar_tarefas`, `_cand`) só uma vez por statement. A sincronização
  chama cada RPC numa chamada própria: gerar → cancelados → fora da cadeia → reaplicar mapa.
- **Só evento com entrega comercial vira atividade.** Desde 23/09, quem decide é o líder
  de frente **na Escala** (`entrega.html` de lá, fila própria por líder) — este app só lê
  `entrega`/`entrega_origem` depois que o import (`021`) sincroniza. Enquanto ninguém
  decide, o app prevê pelo padrão da competição; competição sem padrão deixa o evento
  esperando. `/admin/eventos` aqui é só visão, com link pra Escala.
- **Frente pode ser exceção por evento, não só por competição.** `eventos.frente_id`
  normalmente segue `competicoes.frente_id` (gatilho da `013`/`024`), mas dá pra
  classificar só um evento diferente do padrão da competição (`classificarEvento`,
  23/09) — cuidado: reclassificar a competição inteira depois **sobrescreve** essa
  exceção (`013` não tem guarda pra isso; não implementado porque o caso é raro).
- **"Atividade desnecessária" já era um status pronto (`na`), só faltava botão.**
  `v_semana_frente` já contava `nao_aplicaveis` e `excecoes` desde a `002`/`003`. Usa
  `status='na'` + `excecao='desnecessaria'` + `excecao_desc` livre (23/09).
- **A semana de uma pessoa não é "os eventos desta semana".** Materiais e roteiro abrem
  antes do evento, auditoria vence depois. Então a semana mistura evento da semana
  passada e da semana que vem. Use `tarefas_da_semana(inicio, fim)`, nunca filtre por
  data de evento.
- Os deslocamentos em `cadeia.abre_offset_dias` e `prazo_offset_dias` são um palpite
  inicial e generoso, a confirmar com os líderes. Melhor tarefa a mais do que a menos.
- Tipos de evento que não geram cadeia: reprise, gravação, externa, sem narração e
  pré-jogo. O tipo é derivado do texto do Match ID, porque a Matriz não tem campo próprio.
- **Não há carga de setembro até o dia 20.** Esse período é passado e ninguém cronometrou.
  O app conta a partir de 21/09. Eventos anteriores só entram se alguma janela alcançar.
- Nada que já tem tempo medido é apagado por mudança de regra. As limpezas das
  migrations 011 e 014 excluem tarefa com sessão ou ajuste.
- **`sessoes` nunca checou dono da tarefa** (`minhas_sessoes` só exige `pessoa_id = eu`,
  desde a `003`) — ajudar em conjunto (`022`) não precisou mexer em `sessoes`, só em
  `tarefas` (ler a de outra pessoa pra achar, escrever nela depois de ter sessão lá).
- **`v_tempo_tarefa.sessao_aberta_desde` é da tarefa, não da pessoa** (`min(inicio) where
  fim is null`, entre todas as sessões). Duas pessoas na mesma tarefa: se uma está
  rodando e a outra não, a tela da segunda ainda mostra "Em andamento" — o total de
  segundos é por tarefa de propósito, mas o rótulo de "quem está rodando agora" não
  distingue. Vira ruído só se as duas cronometrarem ao mesmo tempo; separado no tempo,
  não aparece.

## Sincronização com a Escala (021, atual)

Desde `021` o app não fala mais direto com o Airtable: a Escala (`opec-escala`) já ingere
a Matriz de hora em hora, com a classificação de elegibilidade da seção 4 do doc 03 dela.
Reimplementar essa leitura aqui só criaria duas fontes divergentes.

`src/app/api/importar-escala/route.ts` roda 2x/dia (08h e 20h BRT, ver
`.github/workflows/importar-escala.yml` — o Vercel Hobby só permite cron nativo 1x/dia,
o GitHub Actions faz de relógio), chama `POST /api/agent/exportar` na Escala com um token
próprio (`EXPORTAR_TOKEN` lá, `ESCALA_AGENTE_TOKEN` aqui — **não** o `AGENTE_TOKEN` que os
workflows n8n usam, para não arriscar quebrar os dois mexendo num token só) e:

- upserta `competicoes` (novas ficam sem frente, como sempre) e `eventos` por
  `airtable_record_id`, reclassificando `tipo` pelo mesmo regex das migrations `011`/`019`
  contra `jogo` (o texto que aqui vira `evento_id_origem`)
- marca `entrega`/`entrega_origem='escala'` a partir de `tem_entrega`, **sem nunca
  sobrescrever `entrega_origem='lider'`** — só uma decisão manual no Admin vence a Escala
- roda `aplicar_previsao_entrega()` para quem ainda não tem nenhuma decisão
- upserta `plantoes` dos 6 fixos (freela não entra — decisão de 21/09), mapeados **por
  nome**: o e-mail diverge entre os apps (`breis@` na Escala, `barbara@` aqui). Duas
  alocações no mesmo dia viram uma linha só (`unique(pessoa_id, data)`): é o mesmo turno,
  não dobra a carga
- chama `gerar_tarefas` na janela tocada

## Sincronizacao com o Airtable (histórico, pré-021)

A varredura direta abaixo foi usada manualmente até a `021`. Fica registrada porque a
classificação de `tipo` e os campos do Airtable que ela documenta continuam sendo os
mesmos que a Escala aplica antes de exportar — só o transporte mudou.

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
