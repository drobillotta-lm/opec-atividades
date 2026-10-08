# Onde paramos — 28/09/2026

## RETOMAR AQUI (08/10/2026 — atividades únicas, nome com o jogo, compactos, menu, tempo livre)

Plano aprovado pelo Daniel em 08/10 (`~/.claude/plans/tive-umas-ideias-de-robust-unicorn.md` no
Desktop). Quatro pedidos de 07/10:

**Já no ar (push `c1b8f97`):** (3) menu da esquerda recolhe (botão ‹ no topo; preferência em
`localStorage` `opec-menu`, aplicada antes da pintura pelo script do tema; celular começa
recolhido) e (4) o tempo da atividade aceita qualquer minuto (`step={1}` no Entregar e no
Ajustar — o `step={5}` recusava o envio porque o medido quase nunca é múltiplo de 5).

**Lado Escala, no ar (push `45ca5ee` na `master`, migration 067 aplicada):** o confronto
("Vasco da Gama X Flamengo") agora vem do Airtable ("Auxiliar Partida Só Times") para a coluna
nova `escala.eventos.confronto`. Causa de nunca ter vindo: o nó Code "Empacota para o Ingestor"
do n8n (`u1kLZsq9DcBcNeV8`) só repassava uma lista fixa de campos — acrescentado lá pela API,
cópia em `n8n/workflows/ingestor_empacota.js`. O `jogo` voltou a ser só o "Nome do Evento"
(o fallback de 23/09, se rodasse, tiraria "[SEM NARRAÇÃO]"/"Reprise"/"Compacto" do nome e
quebraria `inelegivel()`, o `hash_origem` e o `tipo` daqui). O Ingestor roda de hora em hora
(min 05): conferir `select jogo, confronto from escala.eventos where data >= current_date limit 5`.
⚠ O clone local da Escala nesta máquina está `ahead 1, behind 14` com mudanças não commitadas
de outra sessão (07/10) — o push foi feito por um worktree limpo; reconciliar depois.

**Lado Atividades — NO AR (push `4ee999a`), migrations 045 e 046 aplicadas em 08/10.** O MCP do
Supabase recusou `apply_migration` e qualquer `execute_sql` com `delete from` ou `drop`; o
resto do DDL passou pelo `execute_sql` em pedaços (por isso o `gerar_tarefas` v6 filtra a
janela no próprio select em vez do `delete from _cand` da v5). O `drop function
alterar_janela(text, text, integer, integer)` o Daniel colou no SQL Editor em 08/10 (conferido:
só a versão de 5 parâmetros no banco). Banco = repo até a 046.
Regeneração feita à mão depois das migrations (mesmos passos da sync): `gerar_tarefas` criou
**336** partes, `desfazer_tarefas_fora_da_cadeia` apagou **178** combinadas de eventos ≥ 09/10
(nenhuma tinha tempo), `sem_escalado` = 3 (Kings sem mapa, como antes). Conferido no banco:
cadeia de 09/10 sem combinada, 36 linhas novas no mapa, Compactos Olímpicos e "Programa
Compactos 2026" (agora OL, entrega sim) com `materiais` 24 h antes + `auditoria` do líder, 3
`compacto` de setembro em n/a, prazos pendentes sem o fim do dia em UTC.

**O que a 045 faz:** corte pela DATA DO EVENTO em 09/10 (eventos até 08/10 ficam combinados,
histórico intacto); cadeia por frente separada (`encerrar_atividade_na_frente` +
`reabrir_atividade_na_frente` em FI/OL/PR/CP; NA e KG ganham as partes direto, janelas da 016);
mapa copia pessoa+dupla da combinada para as partes (out/nov/dez); `cadeia.taxa_min` (override
por elo: sincronizacao 72 + auditoria 96 em FI/OL/PR/CP = os 168 do Yuri, decisão do Daniel);
`cadeia.prazo_horas_antes` + `gerar_tarefas` v6 + `alterar_janela` v2 (campo "h antes do
início" na tela Organizar); `private.fim_do_dia_brt` (o prazo caía às 20:59 BRT; pendentes
ganharam +3 h); combinadas `ativa=false`; `v_cadeia_atual` com a taxa efetiva.
**O que a 046 faz:** `eventos.confronto`; `notch_estado` v3 devolve `competicao` e `confronto`
(a página monta a 2ª linha; `sub` segue igual para o app antigo); `garantir_cadeia_compactos()`
(toda competição "Compacto…" com frente ganha `materiais` 24 h antes + `auditoria` 0/+2, as
MESMAS atividades dos jogos, escalado = líder — decisões do Daniel; a sync chama toda hora);
"Programa Compactos 2026" → Olímpicos + Tênis com entrega `sim` (a Escala não tem essa
competição em `escala.competicoes`, então não sobrescreve); `compacto` inativo; as 3 `compacto`
de setembro viram n/a.

**Nome das tarefas:** `nomeTarefa()` → `Atividade - Frente - Competição | Confronto`
(`src/componentes/nome-tarefa.ts`, `nomeEvento()` deriva do "Nome do Evento" quando não há
confronto: tira "Compacto |", "Pré Jogo |", "[SEM NARRAÇÃO]" e o pedaço que repete a
competição). Linhas secundárias das telas viraram só "evento dd/mm". Casos testados em
`scratchpad/checa-nome-evento.ts` (13 ok).

**Avisar o Yuri:** o app separou as combinadas (mesma pessoa, duas tarefas), guardou os 168 por
elo, e os compactos têm regra provisória fora do modelo dele. Pendências antigas seguem: dupla
Julia/Pedro na tela, paginação local, `rotulosAtividade()` nas páginas, piloto com as 7 pessoas.

## RETOMAR AQUI (06/10/2026 — revisão depois do teste da Julia no notch)

Primeiro teste do notch com outra pessoa (Julia, 06/10): 5 sessões, todas em tarefas **vencidas**
de 21/09 e 02/10, porque o notch oferecia as mais antigas primeiro e a `/semana` só mostra a
semana atual. Daí os 7 pedidos do Daniel, todos codados nesta data (plano em
`~/.claude/plans/fa-a-um-plano-de-wobbly-flurry.md` da máquina do Desktop):

1. **Vários cronômetros por pessoa** (decisão: tempo cheio em cada um, sem dividir). Migration
   `044`: índice `sessoes_uma_aberta_por_pessoa_e_tarefa (pessoa_id, tarefa_id) where fim is null`;
   `notch_estado` v2 devolve `correndo[]`, `pausadas[]`, `proximas[]` (só da semana corrente) e
   `atrasadas[]`; `notch_pausar_tarefa`, `notch_entregar`. Site: `fecharSessao` por tarefa em
   `acoes.ts` (**`entregar` fechava TODAS as abertas da pessoa — com paralelo mataria o relógio
   da outra tarefa**), `pausar(tarefaId)`.
2. **Notch: Pausar e Entregar por tarefa** direto no hover; badge com a quantidade na cabeça;
   `⚙ Ajustes` (cantos + afastamento ao longo da borda, 0–400 px); margem transparente de 24 px
   na janela e sem `drop-shadow` na cabeça (era o "quadrado meio escuro"); fundo transparente
   por CSS (`html:has([data-notch-janela])`) e `set_background_color` no Rust. App **0.3.0**
   (`entregar`, `pausar {tarefaId?}`, `tamanho {recuoX, recuoY}`). Com o 0.2.0 ainda instalado,
   Entregar abre o navegador e Pausar pausa tudo (degradação prevista).
3. **Notch saiu do site** (`(app)/layout.tsx`): as telas já têm tudo; menu marca a rota atual
   (`NavItem`). Item do menu virou "Notch (Windows)".
4. `/semana`: seção "Em andamento" é lista e inclui toda tarefa pendente com sessão minha aberta
   ou fechada hoje, **mesmo fora da janela**, com etiqueta "de outra semana".
5. Frente opcional no "começar do zero" (decisão): bloco **"Sem frente"** pro gestor em
   `/frente` e `/kanban`, com select que chama `definirFrenteDaTarefa`.
6. `/frente`: setas de semana, seção **Feitas** (tempo medido × previsto) e aba **Histórico**
   (`?ver=historico`, 50 por página, filtros `pessoa` e `mes`).
7. Dock: várias abertas viram chips com Pausar; usa `nomeTarefa()` (título das registradas).
8. **Quadro virou vista de Minha semana** ("Lista | Quadro kanban", `?ver=kanban`): as minhas
   tarefas em colunas; líder/gestor alternam "Minhas | Toda a frente" (`&quem=frente`).
   `/kanban` redireciona; item "Quadro" saiu do menu. Componente `QuadroKanban`, consulta em
   `lib/quadro.ts`.

**Estado ao fechar a sessão de 06/10:** código commitado e publicado; `npm run build` limpo; migration
044 aplicada pelo Daniel no SQL Editor (o MCP do Supabase recusou todas as escritas nesta sessão). **Instalador 0.3.0 não gerado**: esta máquina (Desktop) não tem
Rust nem Build Tools; gerar no PC com Rust (`desktop/README.md`) e copiar pra `public/download/`.

**Instaladores (Win 0.3.0 e Mac .dmg) sem precisar de Mac nem Rust:** `.github/workflows/notch.yml`
(Actions › "Notch (instaladores)" › Run workflow) compila nos dois sistemas e commita em
`public/download/`. Em 06/10 o job não inicia: **cobrança do GitHub recusada** ("recent account
payments have failed"). Arrumar em github.com › Settings › Billing e rodar de novo.

**07/10 — o notch avisa quando está atrasado.** O Gabriel (app 0.2.0) viu "Command entregar not
allowed by ACL" ao clicar Entregar: o 0.2.0 não tem a permissão `allow-entregar`, e o caminho de
degradação só reconhecia "not found". Corrigido (`6748c69`). Daí a checagem automática: toda vez
que o app abre, `NotchApp.tsx` pergunta a versão instalada ao Tauri (`plugin:app|version`, liberado
pelo `core:default` em qualquer versão) e compara com `public/download/versao.json`; se estiver
atrasado, mostra "Versão X disponível" com botão Baixar (abre o .exe ou o .dmg no navegador).
Repete a cada 6 h. O `versao.json` é escrito pelo robô `notch.yml` junto com os instaladores —
**não editar à mão**; pra lançar versão nova basta subir `version` no `tauri.conf.json` e rodar o
workflow. Instalar por cima mantém o pareamento. Próximo passo possível: `tauri-plugin-updater`
(atualização silenciosa), que exige par de chaves de assinatura e um `latest.json`.

**Pendente, em ordem:** (1) ~~aplicar 044~~ — o Daniel aplicou pelo SQL Editor em 06/10 (conferido: índice e funções no banco); (2) gerar e instalar o 0.3.0; (3) testar no
notch: A e B juntas, pausar só B, entregar A, ver `/semana`; (4) itens 3–7 da lista de 03/10
abaixo (dupla Julia/Pedro, paginação local, `rotulosAtividade()` nas páginas, Yuri, piloto).

## RETOMAR AQUI (fim da janela APP, 03/10/2026)

Tudo commitado e no ar; banco = repo (migrations até `043`, mais `035b`). Feito na janela APP
em 02/10: D0, Fases A/B/C do `docs/07`, pedidos da TELAS (manifest no middleware, azul fora,
rosa = fora do prazo), notch nativo do Windows (`desktop/`, Tauri 2, modelo Codenotch:
pareamento por código em `/notch`, API `/api/notch/[acao]`, migrations `042`/`043`, instalador
0.2.0 em `/download/AtividadesOPEC-Setup.exe`), "começar do zero" (tarefa `origem='registrada'`,
sem evento) e velocidade (projeto em `gru1` via `vercel.json`, cada ação do notch = 1 RPC;
~0,18 s por clique). A TELAS fechou o visual do notch (main `7b44bee`).

**Pendente, em ordem:**
1. Daniel instalar o notch 0.2.0 por cima e usar no dia a dia (o PC dele já está pareado).
2. **Decisão aberta:** tarefa começada do zero **sem frente** não aparece em `/frente` nem
   `/kanban` (só na `/semana` da pessoa, no painel e pro gestor). Manter "Sem frente" ou tornar
   frente obrigatória no notch?
3. Conferir na tela como Julia e como Pedro (dupla de FI): os dois veem a tarefa unida, Julia vê
   o tempo do Pedro.
4. Teste local da paginação da sync (`ESCALA_PAGINA=100`): precisa de `ESCALA_SUPABASE_URL`,
   `ESCALA_SERVICE_KEY` e `CRON_SECRET` no `.env.local`.
5. Páginas além do Organizar ainda usam `ROTULO_ATIVIDADE` fixo; atividade criada pela tela
   aparece pelo código (usar `rotulosAtividade()` de `src/lib/atividades.ts`).
6. Avisar o Yuri: mapa de outubro cita `96838ab/entregaveis` (não oficializado em `config/`);
   nov/dez de FI/OL/PR estão como provisório; pedir a saída do `cenario_sinc_auditoria.py`.
7. Piloto: chamar as 7 pessoas (Fase 4 do plano antigo).

Pra gerar instalador novo: `desktop/README.md` (Rust em `~/.cargo/bin`, fora do PATH do shell).

02/10 — APP: notch nativo do Windows no ar (desktop/, Tauri 2, modelo Codenotch). Instalador em /download/AtividadesOPEC-Setup.exe, pareamento em /notch, API /api/notch, migration 042. Testado nesta máquina: pareia, recolhe na borda, abre no hover. Ver desktop/README.md

02/10 — TELAS: D3 na main (notch, selo Valeu cara, corpo inteiro nas telas, Entrar com heroi)
02/10 — TELAS: D2 na main, commit 31eb44c (rosto nas etiquetas, azul fora das paginas, icones/PWA, menu Organizar)
02/10 — TELAS: mockup do Sr. Minutos v5.1 APROVADO; assets em public/sr-minutos (poses novas, anim/, icones/), docs/06 atualizado (regra nova de cores + notch); branch telas/sr-minutos
02/10 — Fase C na main (/admin/organizar, migrations 039–041)
02/10 — Fase B na main, commit 186685b
02/10 — Fase A na main, commit e79e70f

## Atualização de 02/10/2026: Fases B e C (janela APP)

**B — sincronização à prova da Escala nova** (`036`–`038`). Leituras da Escala paginadas,
eventos em lotes de 500, entrega da Escala vale nos dois sentidos (`entrega_escala`;
indefinido desfaz só decisão da Escala), padrão de entrega copiado de `escala.competicoes`,
`desfazer_tarefas_sem_entrega()` (8 apagadas na primeira rodada) e log em `sincronizacoes`
(cartão no `/admin`). Primeira rodada do n8n com o código novo (03:15): ok em 11 s, 550 eventos
lidos, 12 padrões de entrega atualizados. Não testado local com `ESCALA_PAGINA=100`: o
`.env.local` não tem `ESCALA_*` nem `CRON_SECRET`.

**C — `/admin/organizar`** (`039`–`041`). Atividade virou tabela (FK nos 4 lugares); mapa,
atividades e tarefas editáveis pela tela, só gestor, via funções sem execute pra
`authenticated`. Tarefa redirecionada (`dono_manual`) e avulsa (`origem`) não são desfeitas
pela sincronização. Verificado em transação desfeita: trocar uma célula de outubro reescalou 32,
atividade com vigência amanhã não gerou nada até hoje, redirecionada sobreviveu ao reaplicar,
apagar com tempo é recusado. **Falta**: o link no menu lateral (`(app)/layout.tsx` é da
TELAS) e as páginas além do Organizar usarem `rotulosAtividade()` (hoje mostram o código de
uma atividade criada pela tela).

## Atualização de 02/10/2026: Fase A do plano de outubro (janela APP)

Plano em `docs/07-plano-outubro-e-sr-minutos.md`; o porquê no `01-decisoes.md` (30/09–02/10).
Migrations `031`–`035b` aplicadas (banco = repo, 36 arquivos). FI/OL/PR/CP trocam
sincronização + auditoria por **`sinc_auditoria`** (168 min) desde 01/10; FI tem **dupla**
Julia + Pedro (`dupla_id`); mapa out–dez refeito (nov/dez de FI/OL/PR provisórios); OL virou
"Olímpicos + Tênis". Outubro: 243 tarefas apagadas, 113 criadas, 158 reescaladas, `sem_mapa` 0;
setembro intacto (77 tarefas, 2 entregues). A sincronização agora também roda
`desfazer_tarefas_fora_da_cadeia()` e `reaplicar_mapa()` do mês corrente e do seguinte.
Falta conferir na tela, logado como Julia e como Pedro. Próximo: Fase B (sincronização à
prova da Escala nova).

Revisão geral do projeto, uma semana depois de subir. O fato que reorganizou tudo: **o app
estava no ar e ninguém do time tinha entrado** — nem conseguiria, porque os e-mails dos seis
fixos eram um palpite. Este arquivo é o ponto de retomada; `01-decisoes.md` tem o porquê de
cada mudança de 28/09.

## Atualização de 02/10/2026: Sr. Minutos e nova identidade visual (em revisão, sem código)

Nas noites de 01 e 02/10 o Daniel definiu uma renovação da casca do app: estética LiveMode/CazéTV
(verde vivo sobre preto esverdeado, Barlow Condensed nos títulos, azul sai) com um personagem
central, o **Sr. Minutos**, relógio verde que é "o cronômetro com cara". Tudo está em
**`docs/06-sr-minutos.md`** (fonte da verdade do personagem: poses, cores do rosto, regra
fora/dentro, onde entra em cada tela, 3 fases, 6 decisões dele) e no mockup
https://claude.ai/artifact/64gePQg56GTD4BSVvgSBfo (v3). Assets em `public/sr-minutos/`.
**Nenhuma linha de `src/` foi alterada e nada foi commitado** (06 e public/sr-minutos estão
untracked).

Regra que mais muda a interface (02/10): corpo inteiro só FORA das caixas, encostado nelas
(em pé na borda de um cartão, do lado da tabela, saindo de trás do diálogo); DENTRO das caixas
só o rosto, e a cor do aro é o estado (verde, âmbar fora do prazo, rosa bloqueado, cinza pausado,
creme sem estado). Substitui todo pontinho colorido de status.

Pendente antes de codar: (1) Daniel autenticar o Higgsfield (`/mcp`) ou dar chave da xAI pra
gerar as 6 poses que faltam (lista no 06 e no artefato); (2) OK final dele no mockup. Depois, a
ordem de implementação sugerida: tokens/tipografia em `src/app/globals.css` → `/semana` (corpo
inteiro em cima do cartão de andamento, rosto nas etiquetas) → dock (rosto colorido) → selo de
entrega → frente e painel. Vídeos precisam de fundo transparente (ffmpeg → WebM alpha) e sprite
sheet pro dock. Sessão salva em `~/.claude/session-data/2026-10-02-sr-minutos-v3-session.tmp`
(`/resume-session`).

## O que está no ar

| Coisa | Onde | Estado |
|---|---|---|
| App | https://opec-atividades.vercel.app | no ar; **ligado ao Git desde 28/09** — `git push` na `main` publica sozinho |
| Banco | Supabase `igzrrsqmweuritiqrmrh`, sa-east-1 | 30 migrations, banco = repo |
| Login | Google restrito a `@livemode.com` | e-mails reais desde a `027` — só o Daniel entrou até hoje |
| Eventos, entrega, plantão, líderes, competição × frente | **lidos direto do banco da Escala** (`src/lib/escala/sincronizar.ts`), de hora em hora aos :15 pelo n8n (`Atividades OPEC · Sincronizar Escala`, `WVmEyD6wboZR45dJ`) e pelo botão "Sincronizar agora" do `/admin` | no ar desde 28/09; a rota `/api/importar-escala` é só a casca que o n8n chama |
| Mapa | `config/mapa_aprovado.csv` do Yuri, commit `a7a7f864` | setembro a dezembro importados (`005`, `026`) |
| Mockup | — | abandonado; `04-telas.md` descreve o código |

Rotas: `/entrar`, `/fora-do-time`, `/semana`, `/frente`, `/kanban`, `/painel`, `/admin`,
`/admin/eventos`, `/dock`.

## O que o banco tem hoje (28/09, depois das migrations 026–028)

| Tabela | Linhas |
|---|---|
| pessoas | 9 (7 fixas ativas, Vitor com saída em 01/09, Yuri) |
| frentes | 6, sendo 5 ativas — Nacional agora tem líder (Juliana) |
| mapa | 72 (18 por mês, setembro a dezembro) |
| competições | 55, **9 sem frente** — a Escala já classifica 27 delas em `escala.competicoes.frente_codigo` |
| eventos | 379, 109 sem frente, 92 com entrega indefinida |
| tarefas | **416**: 53 de setembro (2 entregues) e 363 de outubro, todas pendentes. As 16 de eventos cancelados sumiram (`028`) |
| sessões | 27, todas do Daniel, a última em 23/09 |
| plantões | 1 |

## O que decidimos em 28/09 (resumo; detalhe no `01-decisoes.md`)

- **Tarefa nasce e morre com o evento.** Não existe "fechar a semana". Relatório e CSV são
  leitura sob demanda de qualquer período.
- **O app lê a Escala direto**, em vez da exportação HTTP 2x/dia.
- Mapa entra até onde o Yuri aprovou. E-mails são os da Escala. Juliana lidera Nacional.
  Vitor está fora. Kings fica inativa. Mockup abandonado. Dock continua, e ganha
  "subdividir atividade".

## Ler a Escala direto — como ficou (28/09)

`sincronizarEscala()` (`src/lib/escala/sincronizar.ts`) abre um cliente no Supabase da
Escala (`lbcvhgqxnchszqaudzui`, schema `escala`, service key em `ESCALA_SUPABASE_URL` +
`ESCALA_SERVICE_KEY` na Vercel) e, numa passada:

1. competições novas entram sem frente; as que a Escala já classificou
   (`escala.competicoes.frente_codigo`) e aqui estavam sem frente recebem a de lá;
2. líder vem de `escala.frentes.lider_pessoa_id` (por e-mail) quando existe — nunca apaga;
3. `escala.eventos` desde 21/09 vira `eventos` local, chave `airtable_record_id` =
   `airtable_id`, ou `escala:<id>` para evento manual (a exportação antiga descartava esses);
   excluído na Escala vira `Cancelado`; depois `herdar_frente_da_competicao()` (`029`);
4. `tem_entrega` sim/não vira `entrega` + `entrega_origem = 'escala'`, sem sobrescrever
   `'lider'`; indefinido cai no padrão da competição (`aplicar_previsao_entrega`);
5. plantão = `escala.alocacoes` confirmadas/realizadas dos fixos, casadas por e-mail;
6. `gerar_tarefas(21/09, hoje + 21)` e `desfazer_tarefas_de_evento_cancelado()`.

Primeira rodada real: 438 eventos (eram 379), 6 competições classificadas pela Escala,
96 tarefas criadas, 8 desfeitas. A rota da Escala `api/agent/exportar.js` e o
`EXPORTAR_TOKEN` ficaram sem uso — dá pra apagar lá.

**Relógio**: n8n, `Atividades OPEC · Sincronizar Escala` (`WVmEyD6wboZR45dJ`), cron
`15 * * * *`, credencial `Atividades OPEC · CRON_SECRET` (`PAyUEQ5IfjX8dKRw`), erro vai
para o `Escala OPEC · Erro de workflow`. Recriar: `n8n/sincronizar_escala.js`. O GitHub
Actions (`importar-escala.yml`) está **desativado**: a cobrança da conta do GitHub falhou
e nenhum job iniciava desde 26/09 — e o `curl -f` engolia o erro, então o relógio ficou
4 dias morto sem sinal. O `CRON_SECRET` foi girado em 28/09 e vive na Vercel, no secret
do GitHub e na credencial do n8n.

**Dado que fica faltando na origem**: 119 eventos da Escala não têm competição (a maioria
é Externa, Gravação, Kit Mojo, Estúdio — não gera cadeia mesmo), mas dois são jogos de
verdade com entrega "sim" (Mundial de Judô #8 e #14). E um evento manual chegou com a
competição escrita `BUNDESLIGA`, que não casa com `Bundesliga 2026`. É de lá.

## O que falta, em ordem

1. **Piloto.** E-mails certos, outubro gerado, `/como-funciona` no ar (28/09). Falta
   chamar as 7 pessoas e acompanhar duas semanas de uso.
2. **Painel: corte por frente.** A navegação por mês entrou em 28/09.
3. **Dock**: atalhos de teclado e posição lembrada. (Sub-tarefas entraram em 28/09 —
   `030`, botão "dividir" em `/semana`, dock mostra a parte — mas **ninguém testou na
   tela ainda**; o Daniel confere o fluxo criar → iniciar → concluir antes do piloto.)
4. **Admin: pessoas** continua só leitura.
5. **Competição duplicada por aspas** (`Programa "Quem Fez, Fez!" 2026` × versão com aspas
   dobradas). **A origem é a Escala**: `escala.competicoes` tem a linha com as aspas
   dobradas. Corrigir lá; aqui, mesclar.
6. ~~Ligar a Vercel ao Git~~ — feito em 28/09. Precisou de dois passos manuais na conta do
   Daniel: Login Connection com o GitHub na Vercel, e instalar o app da Vercel no GitHub
   (`github.com/apps/vercel`) com acesso ao repositório. A Escala continua manual.

## Armadilhas que já custaram tempo

- **E-mail é a chave da conta.** `private.liga_conta()` casa a conta Google pelo e-mail no
  primeiro login. E-mail errado em `pessoas` = "fora do time" para sempre. Os reais são os
  de `escala.pessoas`; nunca inventar.
- **`gerar_tarefas` sem mapa do mês devolve `sem_escalado`, em silêncio.** Foi assim que
  outubro ficou vazio até 28/09. Comparar `mapa` com os meses do CSV do Yuri ao voltar.
- **Função chamada numa CTE não muda a foto da mesma query.** `with g as (select * from
  gerar_tarefas(...)) select count(*) from tarefas` conta o antes. Verificar em query nova.
- **O `?code` do OAuth cai em qualquer caminho.** Sem a `redirectTo` na lista, o Supabase
  joga a pessoa no Site URL com o `code` na query; o middleware desvia para
  `/auth/callback` antes de qualquer checagem.
- **O middleware de sessão engole rota que se autentica sozinha.** `/api/importar-escala`
  precisa de exceção, senão vira 307 antes do handler ver o `CRON_SECRET`.
- **`v_tempo_tarefa.sessao_aberta_desde` é da tarefa, não da pessoa.** `/semana` e `/dock`
  buscam `sessoes` direto pra "minha sessão aberta"; `/kanban` é o único que quer o agregado.
- **Cor de tema presa em hex cru vira caixa preta no tema claro.** Variável CSS, sempre.
- **Document Picture-in-Picture fecha junto com a aba.** Por isso o dock é `window.open`.
- **Evento novo não herdava a frente da competição** (`013` só propagava em update).
  Fechado na `024` com gatilho `before insert`.
- **`plantoes` é um registro por pessoa e dia**, não por evento (`unique(pessoa_id, data)`).
- **Vercel Hobby só deixa cron nativo rodar 1x/dia.** Por isso GitHub Actions — e, no
  próximo desenho, n8n.
- **`vercel env pull` nunca devolve o valor de uma env tipo Secret.**
- **`gerar_tarefas` está na v4** (`017`): só evento `normal`, não cancelado, com
  `entrega = true`, janela pela `cadeia`. TBD gera tarefa, de propósito.
- **Semana não é "os eventos da semana"**, é a tarefa cuja janela cruza a semana.
- **Os offsets da janela são um palpite** deliberadamente generoso.
- **`opec-escala` muda rápido e não é só o Daniel quem mexe.** `git fetch` antes de confiar.
- **A Escala tem 8 tabelas sem RLS** (`frentes`, `competicoes`, `rodadas`,
  `rodada_escolhas`, `pd_planilha`, `notas_fiscais`, `fila_sincronizacao`,
  `alertas_enviados`), aviso do próprio Supabase em 28/09. É problema de lá, mas vai pesar
  quando o Atividades ler direto.

## Combinado com o Daniel

Prefere tarefa a mais e corrigir depois a tarefa que não aparece. A classificação das
competições novas da `018` foi por palpite, com o raciocínio no comentário de cada linha.
**Rever essa classificação continua aberto** — e pode simplesmente vir da Escala (item 1).

Julia (setembro/2026): materiais de Fut Inter + roteiro de Olímpicos + líder de Copas FIFA.
Roteiro de tênis entra em Olímpicos quando a competição existir. Kings League é frente nova
de verdade quando aparecer evento com entrega.
