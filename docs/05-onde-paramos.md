# Onde paramos — 23/09/2026

Uma madrugada de trabalho, da fundação ao app no ar (21/09). Em 23/09, o app ganhou uma
sessão inteira de uso real: import da Escala ligado e testado ponta a ponta, três bugs
achados testando (login, dock, tema) já corrigidos, Admin escreve de verdade, e duas
funcionalidades novas (ajudar tarefa de outra pessoa, quadro kanban). Este arquivo é o
ponto de retomada.

## O que está no ar

| Coisa | Onde | Estado |
|---|---|---|
| App | https://opec-atividades.vercel.app | no ar, login funcionando |
| Banco | Supabase `igzrrsqmweuritiqrmrh`, sa-east-1 | 23 migrations aplicadas |
| Login | Google restrito a `@livemode.com` | funcionando (Site URL da Supabase corrigida em 23/09) |
| Importação da Escala | `/api/importar-escala`, 2x/dia via GitHub Actions | **ligada e testada** — rodou de verdade, 362 eventos + 1 plantão gravados |
| Mockup | https://claude.ai/artifact/8xPnpgKwETbJKPFzdzfCFR | 7 artboards, referência visual desatualizada (não tem busca nem quadro) |

Rotas: `/entrar`, `/fora-do-time`, `/semana`, `/frente`, `/kanban`, `/painel`, `/admin`,
`/admin/eventos`, `/dock`.

## O que o banco tem hoje

| Tabela | Linhas |
|---|---|
| pessoas | 9 (7 fixas mais gestores) |
| frentes | 6 |
| mapa | 18 (setembro/2026) |
| competições | 52, sendo **8 ainda sem frente** — classificar em `/admin` |
| eventos | 365, sendo **88 com entrega indefinida** — resolver em `/admin/eventos` |
| tarefas | 53 (2 entregues) |
| sessões | 27 |
| ajustes de tempo | 1 |
| plantões | 1 (Lucas, 29/09) — cresce conforme a Escala aprovar rodadas |

## O que falta, em ordem

1. **Exceção na entrega.** Os campos `excecao` e `excecao_desc` existem na tabela e não têm
   entrada na tela. Hoje só dá para escrever em `obs`.
2. **Ajuste manual avulso.** A ação `ajustarTempo` existe; falta a entrada na tela. Só a
   entrega grava ajuste, com o motivo "tempo confirmado na entrega".
3. **Fechar a semana** reproduzindo os números do `fechar_semana.py`, e exportar o CSV no
   formato de `acompanhamento/registro/`. É o que tira a Bárbara do CSV.
4. **Painel sem competência fixa.** Hoje setembro/2026 está escrito no código.
5. **Admin: só pessoas e frentes continuam só leitura.**
6. **A competição duplicada por aspas escapadas.** `Programa "Quem Fez, Fez!" 2026`
   (classificada) e `"Programa ""Quem Fez, Fez!"" 2026"` (a mesma, vinda da Escala com
   aspas duplicadas, sem frente) são a mesma competição em duas linhas. Mesclar em
   `/admin` e, se voltar a acontecer, olhar a origem no lado da Escala.

## Armadilhas que já custaram tempo

- **O `?code` do OAuth cai em qualquer caminho.** Quando a `redirectTo` não está na lista de
  Redirect URLs, o Supabase joga a pessoa no Site URL com o `code` na query. O middleware
  desvia para `/auth/callback` antes de qualquer checagem de sessão, senão o code se perde.
  **Mordeu de verdade em 23/09**: o Site URL da Supabase ainda apontava pra
  `localhost:3000` — corrigido em Authentication → URL Configuration.
- **O middleware de sessão engole rota que se autentica sozinha.** `/api/importar-escala`
  não tem cookie nenhum (é o GitHub Actions chamando direto); sem exceção no middleware,
  toda chamada virava 307 pra `/entrar` antes do handler ver o `CRON_SECRET`.
- **Minuto não pode ser a fonte do tempo.** Arredondar a soma das sessões fazia o relógio
  "voltar" ao pausar e retomar. Corrigido na `020`: a view guarda segundos.
- **`v_tempo_tarefa.sessao_aberta_desde` é da tarefa, não da pessoa.** Bateu na prática
  no mesmo dia: o botão Pausar de uma pessoa mostrava "Em andamento" só porque outra
  cronometrava a mesma tarefa. Corrigido: `/semana` e `/dock` agora buscam `sessoes`
  direto e calculam "minha sessão aberta" à parte do total agregado (que continua certo,
  soma todo mundo). `/kanban` é o único lugar que ainda quer o agregado — é visão de
  gestor, "alguém está nisso" é a pergunta certa lá, e agora mostra o nome de quem.
- **Cor de tema presa em hex cru vira caixa preta no tema claro.** `bg-[#13211b]` e
  companhia não mudavam com `data-tema`. Regra: cor que depende de tema é variável CSS
  (`--verde-fundo` etc.), nunca hex direto no className.
- **Document Picture-in-Picture fecha junto com a aba que abriu — é regra da API, sem
  contorno.** Trocado por `window.open` comum em 23/09: fica aberto o dia todo, perde o
  "sempre por cima" automático. Sem iframe nem mirror de tema mais — `/dock` é uma página
  igual a qualquer outra, o script anti-pisca do layout resolve sozinho.
- **`gerar_tarefas` foi reescrita quatro vezes** (`008`, `012`, `015`, `017`). Se mexer nela,
  a versão viva é a v4: só evento `normal` com `entrega = true`, janela pela `cadeia`.
- **Semana não é "os eventos da semana".** É a tarefa cuja janela cruza a semana. Usar
  `tarefas_da_semana(inicio, fim)`.
- **Os offsets da janela são um palpite.** Deliberadamente generoso. Quando o uso real
  mostrar que materiais abre antes ou depois disso, é uma linha de `update` na `cadeia`.
- **Os 6 fixos têm e-mail diferente em cada app.** `breis@` na Escala, `barbara@` aqui. O
  de-para de `importar-escala/route.ts` é por nome, hardcoded — não dá para casar por
  e-mail.
- **`plantoes` é um registro por pessoa e dia, não por evento.** `unique(pessoa_id, data)`
  é proposital: duas alocações no mesmo dia (aconteceu com a Bárbara em 13/09) são o mesmo
  turno, não somam horas.
- **Vercel Hobby só deixa cron nativo rodar 1x/dia.** As duas rodadas (08h/20h) saem do
  GitHub Actions, não do `vercel.json` — confirmado com `vercel teams ls` antes de tentar.
- **`vercel env pull` nunca devolve o valor de uma env tipo Secret** (vem como
  `[SENSITIVE]`), então não dá para copiar o `AGENTE_TOKEN` do n8n de um projeto pro outro
  por script. Por isso a exportação da Escala usa um token próprio (`EXPORTAR_TOKEN`,
  distinto do `AGENTE_TOKEN`) — também protege os 3 workflows do n8n de um token trocado
  por engano.
- **`sessoes` nunca checou dono da tarefa** — `minhas_sessoes` (RLS) só exige
  `pessoa_id = eu` desde a `003`. Ajudar tarefa de outra pessoa (`022`) só precisou abrir
  a leitura de `tarefas`, não mexer em `sessoes`.

## Combinado com o Daniel

Prefere tarefa a mais e corrigir depois a tarefa que não aparece. Por isso a classificação
das nove competições novas da `018` foi feita por palpite, com o raciocínio no comentário de
cada linha, em vez de travar a geração esperando confirmação. **Rever essa classificação é
um item aberto.**
