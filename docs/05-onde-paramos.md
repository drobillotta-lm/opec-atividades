# Onde paramos — 23/09/2026

Uma madrugada de trabalho, da fundação ao app no ar (21/09). Em 23/09, uma sessão inteira
de uso real: import da Escala ligado e testado ponta a ponta, bugs achados testando (login,
dock, tema, relógio compartilhado) corrigidos, Admin escreve de verdade (competição, frente
nova, evento avulso), busca/ajudar tarefa de outra pessoa, quadro kanban, e "atividade
desnecessária". Este arquivo é o ponto de retomada.

## O que está no ar

| Coisa | Onde | Estado |
|---|---|---|
| App | https://opec-atividades.vercel.app | no ar, login funcionando |
| Banco | Supabase `igzrrsqmweuritiqrmrh`, sa-east-1 | 25 migrations aplicadas |
| Login | Google restrito a `@livemode.com` | funcionando (Site URL da Supabase corrigida em 23/09) |
| Importação da Escala | `/api/importar-escala`, 2x/dia via GitHub Actions | ligada e testada — rodou de verdade |
| Decisão de entrega | Escala (`entrega.html`, fila do líder) | Atividades só lê, com link pra lá (23/09) |
| Mockup | https://claude.ai/artifact/8xPnpgKwETbJKPFzdzfCFR | desatualizado — não tem busca, quadro, nem criar frente |

Rotas: `/entrar`, `/fora-do-time`, `/semana`, `/frente`, `/kanban`, `/painel`, `/admin`,
`/admin/eventos`, `/dock`.

## O que o banco tem hoje

| Tabela | Linhas |
|---|---|
| pessoas | 9 (7 fixas mais gestores) |
| frentes | 6, sendo 5 ativas |
| mapa | 18 (setembro/2026) |
| competições | 52, sendo **6 ainda sem frente** — classificar em `/admin` |
| eventos | 365, sendo **98 sem frente** e **88 com entrega indefinida** (essa decisão é da Escala agora) |
| tarefas | 57, todas com `status` útil (nenhuma `na` ainda — a opção é nova) |
| plantões | 1 (Lucas, 29/09) — cresce conforme a Escala aprovar rodadas |

## O que falta, em ordem

1. **Ajuste manual avulso.** A ação `ajustarTempo` existe; falta a entrada na tela. Só a
   entrega grava ajuste, com o motivo "tempo confirmado na entrega".
2. **Fechar a semana** reproduzindo os números do `fechar_semana.py`, e exportar o CSV no
   formato de `acompanhamento/registro/`. É o que tira a Bárbara do CSV.
3. **Painel sem competência fixa.** Hoje setembro/2026 está escrito no código.
4. **Admin: só pessoas continua só leitura** (frentes já ganhou criação em 23/09).
5. **A competição duplicada por aspas escapadas.** `Programa "Quem Fez, Fez!" 2026`
   (classificada) e `"Programa ""Quem Fez, Fez!"" 2026"` (a mesma, vinda da Escala com
   aspas duplicadas, sem frente) são a mesma competição em duas linhas. Mesclar em
   `/admin` e, se voltar a acontecer, olhar a origem no lado da Escala.
6. **A tela do líder na Escala é muito nova.** `entrega.html` foi commitada e deployada
   por outra sessão bem no meio do dia 23/09 — vale conferir com o Yuri se está fluindo
   na prática antes de assumir que "linkar pra lá" resolve de verdade.

## Armadilhas que já custaram tempo

- **O `?code` do OAuth cai em qualquer caminho.** Quando a `redirectTo` não está na lista de
  Redirect URLs, o Supabase joga a pessoa no Site URL com o `code` na query. O middleware
  desvia para `/auth/callback` antes de qualquer checagem de sessão, senão o code se perde.
  Mordeu de verdade em 23/09: o Site URL da Supabase ainda apontava pra `localhost:3000`.
- **O middleware de sessão engole rota que se autentica sozinha.** `/api/importar-escala`
  não tem cookie nenhum (é o GitHub Actions chamando direto); sem exceção no middleware,
  toda chamada virava 307 pra `/entrar` antes do handler ver o `CRON_SECRET`.
- **`v_tempo_tarefa.sessao_aberta_desde` é da tarefa, não da pessoa.** Bateu na prática:
  o botão Pausar de uma pessoa mostrava "Em andamento" só porque outra cronometrava a
  mesma tarefa. `/semana` e `/dock` buscam `sessoes` direto pra "minha sessão aberta";
  `/kanban` é o único lugar que quer o agregado (visão de gestor), e mostra o nome de quem.
- **Cor de tema presa em hex cru vira caixa preta no tema claro.** Regra: cor que depende
  de tema é variável CSS (`--verde-fundo`, `--ambar-fundo`), nunca hex direto no className.
- **Document Picture-in-Picture fecha junto com a aba que abriu — é regra da API, sem
  contorno.** Trocado por `window.open` comum em 23/09: fica aberto o dia todo, perde o
  "sempre por cima" automático.
- **Evento novo não herdava a frente da competição já classificada** (`013` só propaga em
  `update` de `competicoes`, nunca no insert de um evento). 233 dos 365 eventos do import
  da Escala ficaram assim. Fechado na `024` com gatilho `before insert`.
- **`frentes.sigla` era lista fechada** (FI/OL/PR/CP/NA/KG) — bloqueava criar frente pela
  tela. Virou formato (`025`).
- **`sessoes` nunca checou dono da tarefa** — `minhas_sessoes` (RLS) só exige
  `pessoa_id = eu` desde a `003`. Ajudar tarefa de outra pessoa (`022`) só precisou abrir
  a leitura de `tarefas`.
- **"Atividade desnecessária" já era um status pronto.** `na` + `excecao` + `excecao_desc`
  existiam desde a fundação, `v_semana_frente` já contava `nao_aplicaveis`; só faltava o
  botão (23/09).
- **Frente pode ser exceção por evento** (`classificarEvento`), mas reclassificar a
  competição inteira depois sobrescreve isso sem avisar — `013` não tem guarda. Caso raro,
  não veio guarda por enquanto.
- **`opec-escala` está mudando rápido, e não é só eu quem mexe.** No meio da sessão de
  23/09, o repo tinha ~10 commits novos que eu não tinha puxado (fila de entrega do líder,
  SOFIA 2.0 check-in/out, trava de segurança, ajustes de La Liga e do Ingestor) — de
  alguém trabalhando em paralelo. `git fetch` antes de confiar no que leu de lá.
- **Os 6 fixos têm e-mail diferente em cada app.** `breis@` na Escala, `barbara@` aqui. O
  de-para de `importar-escala/route.ts` é por nome, hardcoded.
- **`plantoes` é um registro por pessoa e dia, não por evento.** `unique(pessoa_id, data)`
  é proposital: duas alocações no mesmo dia são o mesmo turno, não somam horas.
- **Vercel Hobby só deixa cron nativo rodar 1x/dia.** As duas rodadas (08h/20h) saem do
  GitHub Actions, não do `vercel.json`.
- **`vercel env pull` nunca devolve o valor de uma env tipo Secret.** Por isso a
  exportação da Escala usa um token próprio (`EXPORTAR_TOKEN`, distinto do `AGENTE_TOKEN`
  do n8n).
- **`gerar_tarefas` foi reescrita quatro vezes** (`008`, `012`, `015`, `017`). A versão
  viva é a v4: só evento `normal` com `entrega = true`, janela pela `cadeia`.
- **Semana não é "os eventos da semana".** É a tarefa cuja janela cruza a semana. Usar
  `tarefas_da_semana(inicio, fim)`.
- **Os offsets da janela são um palpite.** Deliberadamente generoso.
- **Não há carga de setembro até o dia 20.** O app conta a partir de 21/09.

## Combinado com o Daniel

Prefere tarefa a mais e corrigir depois a tarefa que não aparece. Por isso a classificação
das nove competições novas da `018` foi feita por palpite, com o raciocínio no comentário de
cada linha, em vez de travar a geração esperando confirmação. **Rever essa classificação é
um item aberto.**

Julia (setembro/2026): materiais de Fut Inter + roteiro de Olímpicos (mapa já correto,
líder não entra no próprio mapa — é papel separado de execução) + líder de Copas FIFA (já
no cadastro) + roteiro de tênis, que entra em Olímpicos quando a competição existir (ainda
não tem evento nenhum de tênis no sistema — nada a fazer até lá). Kings League é frente
nova de verdade (não é a `KG` que já existe, essa é outra coisa) — criar pela tela quando
o primeiro evento aparecer.
