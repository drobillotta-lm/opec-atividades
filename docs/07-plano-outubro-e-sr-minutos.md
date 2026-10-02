# Adaptar o Atividades OPEC: teste de outubro (Yuri), Escala de 28/09 e Sr. Minutos — em DUAS janelas

Repo: `C:\Users\Daniel\Projetos\opec-atividades` (main = `683c7b0`; **3 itens não commitados da sessão do Sr. Minutos**: `docs/05` modificado, `docs/06-sr-minutos.md` e `public/sr-minutos/` novos). Banco `igzrrsqmweuritiqrmrh`, 30 migrations. App em https://opec-atividades.vercel.app, push na `main` publica em produção; push em qualquer branch gera **preview** (a Vercel está ligada ao Git).

Este plano é executado por **duas sessões do Claude Code em paralelo**: a janela **APP** (dados, sincronização, tela Organizar) e a janela **TELAS** (identidade visual, Sr. Minutos, geração de poses). A seção "Duas janelas" define quem mexe em quê e onde elas se encontram. Os dois prompts de abertura estão no fim do arquivo.

## Contexto

Três coisas mudaram embaixo do app, e nenhuma está no código ainda.

**1. O Yuri: novo desenho de tarefas a partir de 01/10 (teste).** Mensagem de 30/09 no grupo + tabela "Quem faz o quê em outubro" + commit `96838ab` em `ymuanes/opec-dimensionamento` (02/10 00:42). O commit **não altera `config/`**: o modelo novo está em `entregaveis/` e em `decisoes/log.md`; o README dele lista como pendência oficializar em `mapa_aprovado.csv`. Premissas que valem pra nós:
- `sincronizacao` + `auditoria` viram **uma tarefa** em FI, OL, PR, CP, **com 20% menos horas que a soma** → taxa provisória **168 min** (0,8 × 210). Janela = união: evento −1 a +2.
- Em **Fut Inter** a tarefa unida é **dupla analista + estagiário, metade das horas cada**: Julia + Pedro em outubro. Eles dividem entre si; o app não decide. (No modelo do Yuri a metade do estagiário fica no slot `FI,sincronizacao`; aqui vira `dupla_id` da `FI,sinc_auditoria`.)
- **Copas FIFA**: mesmo trio até dezembro (Juliana roteiro, Bárbara sinc+auditoria, Gabriel materiais). **Nacional** igual (Juliana materiais_sinc, Daniel roteiro_auditoria). Olímpicos vira **"Olímpicos + Tênis"**. Líder não executa a própria frente (o app avisa, não bloqueia).
- Mapa de outubro: FI materiais Lucas / roteiro Bárbara / sinc_auditoria Julia+Pedro · OL materiais Bárbara / roteiro Pedro / sinc_auditoria Juliana · PR materiais Julia / roteiro Lucas / sinc_auditoria Gabriel · CP materiais Gabriel / roteiro Juliana / sinc_auditoria Bárbara.
- Nov/dez de FI/OL/PR: em aberto. **Decisão do Daniel (02/10): replicar outubro como provisório.** (O `entregaveis/cenario_sinc_auditoria.py` do Yuri imprime a proposta out–dez; pedir a saída a ele troca o provisório pelo real.)
- Plantão: 1 por fim de semana por pessoa, folga custa o dia inteiro; dia útil 4,5h. Daniel: até 1/3 do tempo na OPEC (anotado; o painel não usa capacidade ainda).
- Divergência de premissa a registrar, fora deste plano: o modelo do Yuri conta materiais e sincronização **por rodada/série/bloco**; o app gera tudo **por evento**. A taxa medida aqui não é comparável 1:1 com a de lá até alinhar isso.

Estado do banco: outubro já tem **566 tarefas pendentes geradas com o mapa e a cadeia antigos** (1 com sessão). Setembro (53 tarefas, 27 sessões do Daniel) é histórico e não muda.

**2. A Escala (migrations 047–066, 23 a 28/09).** Nada renomeado ou removido. `tem_entrega` pode ser trocado pelo líder a qualquer hora, inclusive depois da tarefa existir (16 tarefas de outubro já estão em evento sem entrega) e `indefinido` é ignorado pelo sync; `escala.competicoes.entrega_padrao` é o padrão oficial; 550 eventos desde 21/09 e +~100/semana sem paginação (PostgREST corta em 1000 em silêncio, quebra em novembro); todo plantão confirmado desde 21/09 é de freela, então `plantoes` com 1 linha está certo; o resumo do sync é descartado pelo botão (`acoes.ts:191-196`). Roteiro por evento e folgas: **depois do piloto** (Daniel).

**3. Sr. Minutos e nova identidade (sessão paralela, 01–02/10).** Conceito em `docs/06-sr-minutos.md`, mockup v3 em https://claude.ai/artifact/64gePQg56GTD4BSVvgSBfo, assets em `public/sr-minutos/` (6 poses PNG transparentes + rosto em 5 cores, 764 KB; originais JPG/MP4 em `originais/`, 6,1 MB). Seis decisões do Daniel: nome "Sr. Minutos" sempre; férias sem cigarro; bravo/furioso só no dock; dois temas (Noite padrão, Mostrador); selo "Valeu cara" em toda entrega; **fora/dentro** (corpo inteiro só fora das caixas, encostado nelas; dentro só o rosto, cor do aro = estado). Paleta derivada do personagem, Barlow Condensed nos títulos, azul sai. **Pendências dele**: OK final no mockup v3; login do Higgsfield (`/mcp`) ou chave xAI pras 6 poses que faltam; vídeos com fundo transparente + sprite do dock.

---

## Duas janelas em paralelo

### Trilhas

| | Janela **APP** | Janela **TELAS** |
|---|---|---|
| Onde trabalha | clone principal `C:\Users\Daniel\Projetos\opec-atividades`, branch `main` | worktree `C:\Users\Daniel\Projetos\opec-atividades-telas`, branch `telas/sr-minutos` |
| Faz | D0 (se ainda não feito) → **A** → **B** → **C** | D0 (se chegar primeiro) → **D1** → **D4** (em paralelo) → **D2** → **D3** |
| Banco | **só ela** aplica migrations (Supabase MCP `apply_migration`) e versiona em `supabase/migrations/` | nunca toca banco nem migrations |
| Deploy | push na `main` = produção | push na branch = preview `https://opec-atividades-git-telas-sr-minutos-drobillotta-2740.vercel.app`; entra na `main` só nos marcos |
| Dev local | `npm run dev` na porta 3000 | `npm run dev -- -p 3001` |

### Quem é dono de quê (a outra janela não edita)

**APP:** `supabase/**`, `src/lib/**` (inclui `semana.ts`, `tipos.ts`, `escala/*`, `supabase/*`), `src/app/api/**`, `src/app/(app)/acoes.ts`, `src/app/(app)/admin/**`, `src/middleware.ts`, `n8n/**`, `docs/01`, `02`, `03`, `04`, `05`, `supabase/README.md`, `README.md`. Na Fase A ela também faz as edições **de dado** (`dupla_id` nos selects e no texto "Julia + Pedro") em `semana/page.tsx`, `frente`, `kanban`, `dock`, `Cronometro.tsx`, `admin/eventos`.

**TELAS:** `src/app/globals.css`, `src/app/layout.tsx`, `src/componentes/Tema.tsx`, `src/componentes/SrMinutos.tsx` (novo), `public/sr-minutos/**`, `docs/06`, `src/app/entrar/**`, `src/app/fora-do-time/**`, `src/app/(app)/como-funciona/**`, `src/app/(app)/layout.tsx` (sidebar/logo). A partir de D2, as edições **visuais** em `semana/page.tsx`, `frente`, `kanban`, `painel`, `dock`, `Cronometro.tsx`, `Partes.tsx`, `ClassificarFrente.tsx`.

Os arquivos de página são compartilhados no tempo, não no espaço: APP mexe neles na Fase A (hoje) e TELAS só começa D2 **depois que a Fase A está na `main`**. Na Fase C, APP cria `admin/organizar/**` usando só classes de token já existentes (nada de hex cru, nada de `azul-*`), então a tela herda a identidade nova sozinha quando D1 entrar.

### Pontos de sincronia (em ordem)

1. **D0 antes de tudo.** Os arquivos do Sr. Minutos estão soltos no clone principal; o worktree só os enxerga depois de commitados. Quem abrir primeiro faz D0 (commit + push). A outra confere: `git fetch && git ls-tree origin/main docs/06-sr-minutos.md` devolve a linha → feito.
2. **D1 pode entrar na `main` a qualquer momento** com o OK do Daniel na preview: só toca `globals.css`, `layout.tsx`, `Tema.tsx`, que APP não edita. Os tokens `--azul*` ficam **apelidados pra família verde** em D1; a renomeação das 28 classes `azul-*` espalhadas pelas páginas fica pra D2 (evita conflito com a Fase A).
3. **D2 só depois da Fase A na `main`.** TELAS confere com `git fetch && git ls-tree origin/main supabase/migrations/ | grep 035_` e rebaseia (`git rebase origin/main`) antes de começar.
4. **D3 só depois do OK final do Daniel no mockup v3** (ou v4, se as poses novas chegarem antes). Pode correr em paralelo com a Fase C: os arquivos não se cruzam.
5. **Entrar na `main`** (TELAS, em cada marco D1/D2/D3): `git fetch origin && git rebase origin/main` → `npm run build` limpo → `git push origin telas/sr-minutos` (preview) → Daniel bate a tela → `git push origin telas/sr-minutos:main` (fast-forward; se recusar, APP empurrou algo: rebase de novo). APP, antes de cada commit: `git pull --ff-only`.
6. **Aviso entre janelas**: o marco entra como uma linha no topo de `docs/05-onde-paramos.md` ("02/10 — Fase A na main, commit X") feito por quem concluiu; a outra janela lê no `git fetch`. Se a ferramenta `ListAgents`/`SendMessage` enxergar a outra sessão local, mandar a mesma linha por ali também. Em último caso, o Daniel repassa.

### Preview e login (TELAS)
- A preview tem `NEXT_PUBLIC_SUPABASE_*` mas **não** tem `SUPABASE_SERVICE_ROLE_KEY`, `ESCALA_*` nem `CRON_SECRET` (`vercel env ls`, 02/10). Serve pra bater `/entrar`, `/semana`, `/frente`, `/kanban`, `/painel`, `/dock`, `/como-funciona`; `/admin` e "Sincronizar agora" só funcionam em produção ou local.
- Se o login falhar na preview ou em `localhost:3001` por redirect, o Daniel adiciona em Supabase → Authentication → URL Configuration → Redirect URLs: `http://localhost:3001/**` e `https://opec-atividades-git-*-drobillotta-2740.vercel.app/**`.
- `.env.local` não é versionado: TELAS copia do clone principal (`copy ..\opec-atividades\.env.local .`). `node_modules` idem: `npm ci` no worktree.

### Esta janela, depois do OK neste plano
Só duas coisas e para: (1) copia este plano para `docs/07-plano-outubro-e-sr-minutos.md` no clone principal, sem commit (APP commita no D0 junto com o resto); (2) atualiza a memória `project_opec_app_atividades.md` com o protocolo das duas janelas. Daí o Daniel fecha esta janela e abre as duas com os prompts do fim do arquivo.

---

## Fase A — Cadeia nova, dupla e mapa de outubro (APP; migrations 031–035)

### 031 `atividade_sinc_auditoria.sql`
- Alargar os 4 checks (`taxas`, `cadeia`, `tarefas`, `mapa`) com `'sinc_auditoria'`, copiando o `do $$ foreach` de `011:4-16`. (Na Fase C o check vira tabela `atividades`.)
- `insert into taxas ('sinc_auditoria', 168, '2026-10-01', 'premissa do Yuri 30/09: 20% a menos que sincronizacao+auditoria (0,8 x 210); commit 96838ab do dimensionamento')`.

### 032 `cadeia_com_vigencia.sql`
- `cadeia.vigente_de date not null default '2026-08-01'`, `vigente_ate date null`, check `vigente_ate >= vigente_de`; recriar os índices únicos parciais de `011:29-30` incluindo `vigente_de`.
- `private.cadeia_vigente(p_frente_id, p_competicao_id, p_data) returns setof cadeia`: competição vence frente (regra hoje duplicada em `016` e `017`), só linhas em vigor na data.
- Fechar `sincronizacao` e `auditoria` em `2026-09-30` para FI/OL/PR/CP (linhas sem `competicao_id`); inserir `sinc_auditoria` ordem 2, offsets −1/+2, `vigente_de 2026-10-01` nas quatro. NA, KG e `compacto` não mudam.

### 033 `dupla.sql`
- `mapa.dupla_id` e `tarefas.dupla_id` (uuid null → pessoas), check `dupla_id <> pessoa_id/escalado_id`, índice parcial `tarefas (dupla_id, competencia)`.
- Recriar `escreve_tarefas` (`022:17-29`) com `dupla_id = private.eu()`.
- **Recriar `le_sessoes` e `le_ajustes`** (`006:81-84`): escalado e dupla enxergam todas as sessões/ajustes da tarefa. Sem isso a Julia não vê o tempo do Pedro (`v_tempo_tarefa` é `security_invoker`, `020:12`).
- `v_semana_frente`: desvio = `responsavel_real_id <> escalado_id and is distinct from dupla_id`.
- `v_mes_pessoa` (drop + create): tarefa em dupla conta **meio a meio** (previsto e medido) pros dois; sem dupla, igual a hoje. `v_taxa_real` não muda.

### 034 `gerar_tarefas_v5_e_reaplicar_mapa.sql`
- `gerar_tarefas` v5 = diff mínimo sobre `017`: `cross join lateral private.cadeia_vigente(e.frente_id, e.competicao_id, e.data) c` no lugar do `join cadeia ... or ...`; carrega `dupla_id` do mapa (null quando `escalado_regra='lider'`). Retorno igual.
- `desfazer_tarefas_fora_da_cadeia()`: pendente cuja atividade não está na cadeia vigente na data do evento (usa `t.frente_id`). Segurança de `028`: sem sessão, ajuste **nem subtarefa** → apaga; com tempo → `na`, `excecao='fora_da_cadeia'`. Setembro não é tocado.
- `reaplicar_mapa(p_competencia date) returns (reescaladas, sem_mapa, divergentes_com_tempo)`: alinha `escalado_id/dupla_id` das pendentes sem tempo ao mapa atual, só em elo `escalado_regra='mapa'`.
- Temp tables com nomes próprios (`_cand`, `_fora`, `_alvo`); cada função chamada **uma vez por statement** (`05-onde-paramos.md:101`).

### 035 `mapa_outubro_teste_do_yuri.sql`
- `update frentes set nome='Olímpicos + Tênis' where sigla='OL'`.
- `delete from mapa` de FI/OL/PR/CP em `2026-10-01`, `11-01`, `12-01` (a `026` usou `on conflict do nothing`; NA fica).
- Outubro conforme a tabela (18 linhas, dupla Julia+Pedro em FI), `origem_commit = 'ymuanes/opec-dimensionamento 96838ab entregaveis/atribuicoes_outubro.html (teste de outubro, nao oficializado em config/)'`.
- Nov/dez: CP = trio fixo (mesma origem); FI/OL/PR = **cópia de outubro**, `origem_commit = 'provisorio: replicado de outubro por decisao do Daniel 02/10, a confirmar com o Yuri'`.
- Executar em statements separados, nesta ordem: `desfazer_tarefas_fora_da_cadeia()` → `gerar_tarefas('2026-09-21', current_date + 21)` → `reaplicar_mapa('2026-10-01')`.

### Código da Fase A
- `src/lib/tipos.ts:20` `dupla_id: string | null`.
- `src/lib/semana.ts:69-77` rótulo `sinc_auditoria: "Sincronização e auditoria"`; helper `escaladosDe(nomePor, escaladoId, duplaId)` → `"Julia + Pedro"`.
- `src/app/(app)/semana/page.tsx` `:15-18,:33` select `dupla_id`; `:26` busca inclui `dupla_id.in.(...)`; `:61` `.or(escalado_id.eq.X,dupla_id.eq.X,responsavel_real_id.eq.X)`; `:232,:284,:344` `duplaId`/`euId` pro diálogo; `:445` `escaladosDe`.
- `src/app/(app)/semana/Cronometro.tsx:48-59,:113-116` "Quem fez" default = eu se sou escalado ou dupla; rótulos `(escalado)/(dupla)`.
- `src/app/(app)/acoes.ts:51,:66` select `dupla_id`; fallback de `quemFez`.
- `frente/page.tsx:26,:40,:74,:85`, `kanban/page.tsx:25,:98,:118-119`, `dock/page.tsx:17-19,:27`, `admin/eventos/page.tsx:38,:96,:107`: select `dupla_id`, desvio exclui dupla, Escalado mostra o par. **Só o dado; nada de estilo** (é da TELAS).
- `src/lib/escala/sincronizar.ts` passo 7 (`:209-215`): depois de `gerar_tarefas`, `desfazer_tarefas_fora_da_cadeia()` e `reaplicar_mapa` pro mês corrente e o seguinte; campos novos no `ResumoSincronizacao` (`:32-41`).
- Docs: `01-decisoes.md` (entrada 30/09–02/10), `02-modelo-dados.md`, `supabase/README.md`, `05-onde-paramos.md` (+ a linha de marco "Fase A na main").

---

## Fase B — Sincronização à prova da Escala nova (APP; migrations 036–038)

### `src/lib/escala/sincronizar.ts`
- **Paginação**: helper `tudo(passo, montar)` que recebe a fábrica da query e varre `.range()` em páginas de 1000 com `order(...).order("id")`. Nas 5 leituras (`:73-84`). Upsert de eventos (`:161`) em lotes de 500.
- **Entrega v2**: o upsert grava o valor cru em `eventos.entrega_escala` (coluna nova); some o `.in(chaves)` de `:173`. SQL `aplicar_entrega_da_escala()`: `sim`→true/`escala`; `nao`→false/`escala`; `indefinido`/null → **só se** `entrega_origem='escala'` volta a null/null. Depois `aplicar_previsao_entrega()` v3 (cobre `null` **e** `'previsto'`).
- **Padrão vem da Escala**: no passo 1 copiar `escala.competicoes.entrega_padrao` pro local (`014` aceita `sim/nao/lider_decide`; com `entrega_termos_sim` fica `lider_decide`).
- **`desfazer_tarefas_sem_entrega()`**: espelho de `028` com `e.entrega is not true`; mais um statement que **reabre** (`na/sem_entrega` → `pendente`) quando a entrega volta a true. Chamar no passo 7.
- **Log**: tabela `sincronizacoes (id, iniciada_em, terminada_em, disparo relogio|botao, ok, resumo jsonb, erro)`; `sincronizarEscala(disparo)` envelopa o corpo atual, grava resumo ou erro, apaga > 30 dias. Resumo ganha `lidos{...}`, `eventos_sem_competicao`, `padroes_entrega_atualizados`, `entrega{sim,nao,indefinido}`, `sem_entrega{...}`, `fora_da_cadeia`, `reaplicadas`, `duracao_ms`.
- `route.ts`: `export const maxDuration = 120`; chama `sincronizarEscala("relogio")`. `acoes.ts:191` chama `sincronizarEscala("botao")`.

### Migrations B
- 036 `entrega_da_escala.sql`; 037 `desfazer_tarefas_sem_entrega.sql` (+ `select * from desfazer_tarefas_sem_entrega();`); 038 `sincronizacoes.sql` (RLS `select` só gestor, sem policy de escrita).

### Admin (`src/app/(app)/admin/page.tsx`)
- Cartão "Última sincronização" lendo `sincronizacoes`. Linha fixa sob plantões: "Desde 21/09 o plantão é dos freelas; fixo em plantão é exceção." Header `:39` usa `terminada_em`.

---

## Fase C — "Organizar": mapa, atividades e tarefas pela tela (APP; migrations 039–041)

Rota `/admin/organizar`, só gestor, três abas. Padrão de server action de `acoes.ts` (`pessoa.papel !== "gestor"` como em `:193`) e de componente client de `ClassificarFrente.tsx`. **Só classes de token** (`bg-superficie`, `border-linha`, `text-tinta-*`, `bg-verde`…), nada de hex nem `azul-*`.

### 039 `atividades.sql`
- Tabela `atividades (codigo pk, rotulo, ativa, criado_em)` semeada com as 8 atuais; os 4 checks viram FK. RLS: leitura autenticado, escrita gestor. `ROTULO_ATIVIDADE` passa a vir do banco (server, cache por request), objeto atual como fallback.

### 040 `organizar_funcoes.sql`
- `criar_atividade(codigo, rotulo, minutos, frentes sigla[], abre_offset, prazo_offset, vigente_de)`; `encerrar_atividade_na_frente(...)` / `reabrir…`; `alterar_taxa(...)`; `alterar_janela(...)`; `definir_mapa(...)` = upsert + `reaplicar_mapa`; `limpar_mapa(...)`; `copiar_mapa(de, para, origem)`.
- Micro: `redirecionar_tarefa(tarefa_id, escalado_id, dupla_id, motivo)`, `alterar_tarefa(tarefa_id, prazo_em, estimativa_min, motivo)`, `criar_tarefa_avulsa(evento_id, atividade, escalado_id, dupla_id, prazo_em, estimativa_min)`, `apagar_tarefa(tarefa_id)` só sem tempo (guarda de `028`).
- Todas `security definer` + `revoke`, chamadas pelas actions com checagem de gestor.

### 041 `v_cadeia_atual.sql`
- Por frente: atividades vigentes hoje, taxa vigente, janela, quem está no mapa do mês (com dupla e `origem_commit`).

### Tela `/admin/organizar`
- **Mapa**: grade frente × atividade vigente, seletor de mês, célula = pessoa + dupla, badge "provisório"; "Salvar", "Copiar do mês anterior", "Reaplicar agora"; aviso quando líder está na própria frente.
- **Atividades**: por frente com vigência, taxa, janela e `v_taxa_real` ao lado; "Nova atividade", "Encerrar a partir de", "Alterar taxa/janela".
- **Tarefas**: busca por semana/frente/pessoa/evento; redirecionar, ajustar prazo/estimativa, desnecessária, apagar (só sem tempo), "criar tarefa neste evento".
- Link no `/admin` e no menu.

---

## Fase D — Sr. Minutos e a identidade LiveMode/CazéTV (TELAS)

Fonte da verdade: `docs/06-sr-minutos.md` + mockup v3. Nada disto toca regra de negócio. Ordem combinada com o Daniel pro personagem: mockup → OK → código; só D1 vai direto pro código, porque as decisões de tema já estão fechadas.

### D0. Guardar o que a outra sessão deixou solto (quem abrir primeiro)
- Commit de `docs/05-onde-paramos.md` (seção de 02/10), `docs/06-sr-minutos.md`, `public/sr-minutos/*.png` e `docs/07-plano-outubro-e-sr-minutos.md` (cópia deste plano).
- `public/sr-minutos/originais/` (6,1 MB de JPG/MP4) **fora do git** via `.gitignore`: o app não usa, e os originais estão em `C:\Users\Daniel\Claude\Projects\asssets gerenciamento`. Entram só os derivados (WebM/sprite) quando existirem.

### D1. Tokens, tipografia e os dois temas (sem personagem) — pode ir direto
- `src/app/globals.css:12-69`: trocar os **valores** das variáveis cruas pela tabela do `docs/06` (Noite padrão / Mostrador claro) **mantendo os nomes** (`--fundo`, `--superficie*`, `--tinta-*`, `--linha*`, `--verde*`, `--ambar*`, `--rosa`). Acrescentar `--creme`, `--verde-ink` (hoje `text-[#07120d]` cru em 7 lugares), `--rosa-fundo`, `--ambar-borda`, e um token pro `bg-[#252b35]` de `painel/page.tsx:65`. **Nesta fase `--azul*` continuam existindo, apelidados pra verde/neutro** (ex.: `--azul: var(--verde)`, `--azul-fundo: var(--elevado)`), pra nenhuma página precisar mudar agora.
- Tipografia: `src/app/layout.tsx:2-7` ganha `Barlow_Condensed` (700/800) como `--font-barlow`; `@theme inline` ganha `--font-display`. Os títulos trocam de fonte via regra global em `globals.css` (`h1`, `.titulo-pagina`) pra não editar as páginas ainda.
- Temas: `Tema.tsx` mantém `data-tema` e a chave `opec-tema`; rótulos "Noite" e "Mostrador"; **padrão vira Noite** (o `scriptAntiPisca` deixa de seguir o sistema sem escolha). Ícones sol/lua ficam.
- Marco: preview → OK do Daniel → entra na `main`.

### D2. O rosto dentro das caixas — depois da Fase A na `main`
- Renomear as 28 classes `azul-*` nas páginas pra verde/neutro conforme o papel e apagar os apelidos `--azul*`; barras: medido = creme, previsto = traço verde, estourou = âmbar (painel `:56,:66`, dock `:128`); títulos de página com `font-display uppercase tracking-tight`; `text-[#07120d]` → `text-verde-ink`.
- Novo `src/componentes/SrMinutos.tsx`: `<Rosto estado="verde|ambar|rosa|cinza|creme" tamanho={14|18|22} />` e `<Corpo pose="apontando|joinha|bravo|furioso|triste|ferias" fala?; lado? />` (absoluto, 150 px desktop / 110 celular, `pointer-events-none`, balão só com `fala`).
- Mapa estado → cor (Daniel confere no mockup): verde = em andamento, entregue no prazo, "abre hoje"; cinza = pausada; âmbar = prazo venceu pendente e `fora_do_prazo`; rosa = `na`; creme = ainda não abriu.
- Trocar os pontinhos: `semana/page.tsx:199` e `Etiqueta` (`:491-504`), `kanban:138`, `dock:103`; logo da sidebar em `(app)/layout.tsx`; `/frente` "quem fez": sem resposta → rosto âmbar + texto, desvio → rosto verde + "desvio"; tiles do painel: rosto verde/âmbar (±15%). Cor nunca sozinha.
- Marco: preview → OK → `main`.

### D3. O corpo inteiro fora das caixas — depois do OK final no mockup
- `/entrar`: herói apontando com "Bora marcar hora?", título "Planejado contra executado." em Barlow. `/fora-do-time`: triste.
- `/semana`: apontando em pé no canto do cartão "Em andamento" (`:196`) com balão por regra fixa (próxima tarefa que abre ou vence hoje); sem andamento, na borda da primeira seção. Estados vazios (`Vazio`, `:506`): triste (semana sem sessão) / férias (nada aberto hoje) com os textos do mockup. Prazo vencido aqui é só etiqueta âmbar.
- `/frente`: apontando na borda da tabela, sem frase. `/painel`: em pé no cartão da taxa mais defasada (>15%) com balão comentando a taxa. `/como-funciona`: narrador fixo na lateral.
- Dock: recolhido = rosto colorido + relógio (96×30); expandido = rosto no cartão; **só aqui** bravo (vence hoje sem sessão) e furioso (já venceu), pequenos, sem frase.
- Selo "Valeu cara" no `DialogoEntrega` (`Cronometro.tsx:42`): overlay 3 s, joinha de fora da borda; atrasada → "Valeu cara. Fechou, mesmo atrasada."; `prefers-reduced-motion` respeitado; não persiste nada.
- Se a Fase C já estiver na `main`, aplicar rosto/corpo em `/admin/organizar` também.
- Marco: preview → OK → `main`. Depois disso o time pode ser convidado.

### D4. Assets que faltam (paralelo com tudo; é onde o Daniel "bate a tela")
- 6 poses (sentado na borda, debruçado, espiando de trás, andando de perfil, deitado, pendurado): Daniel autentica o Higgsfield (`/mcp` → claude.ai Higgsfield) ou fornece `XAI_API_KEY`; descrições prontas no `docs/06` e no artefato. Tratar com o pipeline da sessão anterior (flood fill pelas bordas + quantize; script `.py` rodado com `python -X utf8`, nunca heredoc) e salvar em `public/sr-minutos/`.
- Encaixar no mockup (sentado no cartão de andamento, debruçado na tabela, espiando atrás do diálogo e do dock) e republicar como v4 **no mesmo link**; o OK do Daniel no v3/v4 libera D3.
- Vídeos: ffmpeg colorkey → WebM VP9 alpha + MP4 fallback; sprite sheet PNG (8–12 quadros) pro dock. Entram nos estados vazios e no dock quando prontos.

### Fica pra depois do piloto
Roteiro por evento; folgas em `/semana` e `/frente`; tarefa avulsa sem evento; mapa com troca no meio do mês; capacidade/fração OPEC do Daniel no painel; mesclar `Programa "Quem Fez, Fez!"` duplicada e os 119 eventos sem competição (origem é a Escala). Avisar o Yuri: nosso mapa de outubro cita o `96838ab/entregaveis`; `Mundial de Judô #8/#14` e `BUNDESLIGA` (manual) estão sem competição na Escala.

---

## Verificação

**Antes da Fase A (guardar):**
```sql
select count(*), count(*) filter (where status='entregue'), max(updated_at) from tarefas where competencia='2026-09-01';
select t.id, t.status, t.escalado_id from tarefas t where exists (select 1 from sessoes s where s.tarefa_id=t.id) or exists (select 1 from ajustes_tempo a where a.tarefa_id=t.id) order by 1;
select f.sigla, t.atividade, p.nome, count(*) from tarefas t join frentes f on f.id=t.frente_id join pessoas p on p.id=t.escalado_id where t.competencia='2026-10-01' and t.status='pendente' group by 1,2,3 order by 1,2,3;
```
**Depois da Fase A:** as duas primeiras devolvem o mesmo. `sincronizacao/auditoria` pendentes de outubro em FI/OL/PR/CP = 0. Outubro por frente×atividade×escalado×dupla bate com a tabela do Yuri. `private.cadeia_vigente(FI, null, '2026-09-25')` → 4 linhas; `'2026-10-02'` → 3. `taxas` tem `sinc_auditoria = 168`. `v_mes_pessoa` outubro: Julia e Pedro com 84 min previstos por tarefa de FI. `reaplicar` com `sem_mapa=0`. Advisor de segurança limpo. Na tela: `/semana` como Julia e como Pedro mostram a tarefa unida; Pedro inicia → Julia vê o tempo; `/frente` mostra "Julia + Pedro" sem desvio.

**Fase B:** local com `ESCALA_SUPABASE_URL=https://lbcvhgqxnchszqaudzui.supabase.co`, `ESCALA_SERVICE_KEY` copiada à mão, `CRON_SECRET` qualquer: `curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/importar-escala | jq`. Paginação: uma rodada com `PAGINA=100` e `resumo.lidos.eventos` = `count(*)` na Escala desde 21/09. Depois: `sincronizacoes` com as 3 últimas; `entrega_escala × entrega × entrega_origem`; `tarefas` com `excecao='sem_entrega'`; `competicoes.entrega_padrao` igual à Escala. Produção: push, "Sincronizar agora", cartão novo.

**Fase C:** trocar uma célula de outubro → `reescaladas > 0` e a tarefa muda de dono em `/semana` da pessoa; criar atividade de teste com `vigente_de` amanhã e ver só eventos de amanhã em diante gerarem; redirecionar uma tarefa e conferir `obs`; copiar outubro → novembro e ver badge "provisório". Membro comum recebe erro nas actions.

**Fase D:** `npm run build` limpo; `grep -rn "#[0-9a-fA-F]\{6\}" src --include=*.tsx` não acha nada; `/semana` e `/dock` nos dois temas sem caixa preta; preferência `opec-tema` antiga respeitada; `prefers-reduced-motion` desliga selo e pulso; Lighthouse acessibilidade ≥ 95 em `/semana`; nenhum corpo inteiro cobre texto ou botão em 1280 px e em 390 px; imagens com `alt=""` e dimensões fixas. OK do Daniel no mockup registrado no `01-decisoes.md` antes de D3.

---

## Prompts para as duas janelas novas

Abrir as duas no Claude Code, cada uma na pasta indicada. Colar o prompt inteiro como primeira mensagem.

### Janela 1 — APP (abrir em `C:\Users\Daniel\Projetos\opec-atividades`)

```
Você é a janela APP do projeto Atividades OPEC. Há outra janela do Claude Code (TELAS) trabalhando em paralelo neste mesmo repo, num worktree separado e na branch telas/sr-minutos. O plano completo, aprovado por mim hoje, está em C:\Users\Daniel\.claude\plans\cara-entao-o-yuri-greedy-wadler.md (cópia em docs/07-plano-outubro-e-sr-minutos.md). Leia ele inteiro, depois docs/05-onde-paramos.md, antes de qualquer coisa.

Sua trilha, nesta ordem: D0 (se ainda não estiver na main) → Fase A → Fase B → Fase C. Você é a única janela que aplica migrations no Supabase (projeto igzrrsqmweuritiqrmrh, via MCP apply_migration) e as versiona em supabase/migrations/. Trabalha direto na main; push na main publica em produção, e hoje só eu uso o app.

Você é dona de: supabase/**, src/lib/**, src/app/api/**, src/app/(app)/acoes.ts, src/app/(app)/admin/**, src/middleware.ts, n8n/**, docs/01 a 05, supabase/README.md, README.md. Na Fase A você também faz as edições DE DADO (dupla_id nos selects, "Julia + Pedro" no texto) em semana/page.tsx, frente, kanban, dock, Cronometro.tsx e admin/eventos, sem mexer em estilo.

Nunca edite: src/app/globals.css, src/app/layout.tsx, src/componentes/Tema.tsx, src/componentes/SrMinutos.tsx, public/sr-minutos/**, docs/06, src/app/entrar/**, src/app/fora-do-time/**, src/app/(app)/como-funciona/**, src/app/(app)/layout.tsx. Isso é da TELAS. Na Fase C, a tela /admin/organizar usa só classes de token já existentes (bg-superficie, border-linha, text-tinta-*, bg-verde...), nada de hex cru e nada de azul-*, pra herdar a identidade nova sozinha.

Regras de convivência: git pull --ff-only antes de cada commit (a TELAS empurra pra main nos marcos dela). Ao concluir a Fase A, escreva uma linha no topo de docs/05-onde-paramos.md ("02/10 — Fase A na main, commit X") e commite: a TELAS espera isso pra começar o D2. Se ListAgents mostrar a outra sessão local, mande a mesma linha por SendMessage. Antes de rodar a 035, guarde o resultado das três consultas "Antes da Fase A" do plano; depois, confira as de "Depois da Fase A". Setembro não pode mudar. Temp table dentro de função: cada função chamada uma vez por statement.

Comece agora: git pull --ff-only; se docs/06-sr-minutos.md ainda não estiver em origin/main, faça o D0 (commit de docs/05, docs/06, public/sr-minutos/*.png e docs/07, com public/sr-minutos/originais/ no .gitignore) e push. Depois entre na Fase A. Me avise em uma linha a cada migration aplicada e ao fim de cada fase, com os números da verificação.
```

### Janela 2 — TELAS (abrir em `C:\Users\Daniel\Projetos\opec-atividades`; ela mesma cria o worktree)

```
Você é a janela TELAS do projeto Atividades OPEC. Há outra janela do Claude Code (APP) trabalhando em paralelo na main deste repo, cuidando de banco, sincronização e da tela de admin. O plano completo, aprovado por mim hoje, está em C:\Users\Daniel\.claude\plans\cara-entao-o-yuri-greedy-wadler.md (cópia em docs/07-plano-outubro-e-sr-minutos.md). Leia ele inteiro, depois docs/05-onde-paramos.md (seção de 02/10), docs/06-sr-minutos.md e o mockup v3 em https://claude.ai/artifact/64gePQg56GTD4BSVvgSBfo (ferramenta Artifact, action read). A sessão anterior sobre o personagem está salva em ~/.claude/session-data/2026-10-02-sr-minutos-v3-session.tmp; leia também.

Sua trilha: D0 (só se a APP ainda não tiver feito) → D1 → D4 em paralelo → D2 → D3. Você nunca toca banco, migrations, src/lib/**, src/app/api/**, acoes.ts, src/app/(app)/admin/**, n8n/** nem docs/01 a 05 (exceto a linha de marco no topo do 05). Você é dona de: src/app/globals.css, src/app/layout.tsx, src/componentes/Tema.tsx, src/componentes/SrMinutos.tsx (novo), public/sr-minutos/**, docs/06, src/app/entrar/**, src/app/fora-do-time/**, src/app/(app)/como-funciona/**, src/app/(app)/layout.tsx; e, a partir do D2, das edições visuais em semana, frente, kanban, painel, dock, Cronometro.tsx, Partes.tsx e ClassificarFrente.tsx.

Setup, nesta ordem: git fetch; se docs/06-sr-minutos.md não estiver em origin/main (git ls-tree origin/main docs/06-sr-minutos.md vazio), faça o D0 você mesma no clone principal e dê push na main. Depois: git worktree add ..\opec-atividades-telas -b telas/sr-minutos origin/main; cd ..\opec-atividades-telas; npm ci; copie ..\opec-atividades\.env.local pra cá; npm run dev -- -p 3001. Push na branch gera preview em https://opec-atividades-git-telas-sr-minutos-drobillotta-2740.vercel.app (a preview só tem as variáveis públicas do Supabase: serve pra bater todas as telas menos /admin). Se o login falhar em localhost:3001 ou na preview, me peça pra adicionar http://localhost:3001/** e https://opec-atividades-git-*-drobillotta-2740.vercel.app/** nas Redirect URLs do Supabase.

Pontos de sincronia: D1 pode entrar na main assim que eu aprovar a preview (só toca globals.css, layout.tsx e Tema.tsx; os tokens --azul* ficam apelidados pra verde nessa fase, a renomeação das classes é no D2). D2 só começa depois que a APP escrever "Fase A na main" no topo de docs/05 (confira com git fetch && git ls-tree origin/main supabase/migrations/ | grep 035_) e você rebasear. D3 só depois do meu OK final no mockup. Pra entrar na main: git fetch origin && git rebase origin/main → npm run build limpo → push da branch → eu bato a tela → git push origin telas/sr-minutos:main (fast-forward; se recusar, rebase de novo). Depois de cada marco, uma linha no topo de docs/05.

Como trabalhar comigo: aqui é onde eu vou bater tela e gerar as imagens do personagem em paralelo. Pro personagem a ordem é mockup → meu OK → código; só o D1 vai direto pro código. Pras 6 poses que faltam eu preciso autenticar o Higgsfield (/mcp) ou te dar uma chave da xAI; quando eu fizer isso, gere, trate (flood fill pelas bordas + quantize, script .py com python -X utf8, nunca heredoc), salve em public/sr-minutos/ e republique o mockup como v4 no mesmo link. Cor sempre em variável CSS, nunca hex cru nas páginas (hex cru vira caixa preta no tema claro). Corpo inteiro nunca cobre texto nem botão; dentro das caixas só o rosto, com a cor dizendo o estado.

Comece agora pelo setup e pelo D1. Me mande o link da preview assim que o D1 estiver no ar e me diga em uma linha o que mudou.
```
