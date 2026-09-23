# Onde paramos — 23/09/2026

Uma madrugada de trabalho, da fundação ao app no ar (21/09). Em 23/09, o plantão deixou de
ser uma tabela vazia: entra pela Escala, 2x/dia. Este arquivo é o ponto de retomada.

## O que está no ar

| Coisa | Onde | Estado |
|---|---|---|
| App | https://opec-atividades.vercel.app | no ar, login funcionando |
| Banco | Supabase `igzrrsqmweuritiqrmrh`, sa-east-1 | 21 migrations aplicadas |
| Login | Google restrito a `@livemode.com` | 1 conta ligada (a do Daniel) |
| Mockup | https://claude.ai/artifact/8xPnpgKwETbJKPFzdzfCFR | 7 artboards, referência visual |
| Importação da Escala | `/api/importar-escala`, 2x/dia via GitHub Actions | **código pronto, falta ligar** — ver "23/09" abaixo |

Rotas: `/entrar`, `/fora-do-time`, `/semana`, `/frente`, `/painel`, `/admin`, `/dock`.

## 23/09 — importação da Escala, pronta e ainda não ligada

`021` + `src/app/api/importar-escala` + `.github/workflows/importar-escala.yml`
(detalhes em `supabase/README.md`). Três passos manuais **do Daniel** faltam antes de rodar:

1. **`SUPABASE_SERVICE_ROLE_KEY` na Vercel do Atividades.** É a primeira vez que este app
   escreve pelo servidor — não existia ainda. Pegar em Supabase → `opec-atividades` →
   Settings → API → `service_role`, e rodar `vercel env add SUPABASE_SERVICE_ROLE_KEY
   production` (escopo `drobillotta-2740`) de dentro do repo.
2. **`CRON_SECRET` como secret do GitHub Actions** (repo `drobillotta-lm/opec-atividades`,
   Settings → Secrets and variables → Actions). O valor já foi gerado e já está na Vercel;
   falta só colar o mesmo valor lá — combinar comigo no chat, porque não há `gh` CLI
   disponível nesta máquina para automatizar.
3. **Deploy dos dois apps.** A Escala não está ligada ao Git (`npx vercel deploy --prod
   --yes` de dentro de `app/`); o Atividades também precisa subir com a rota nova.

**E, independente disso, não tem nada para importar ainda.** Todas as alocações
confirmadas de fixo na Escala são de 13–20/09 — antes do piso de 21/09 que o Atividades
conta. A rodada 22–28/09 tem escolhas pendentes em `/rodada.html` que o Daniel ainda não
aprovou (ver a memória do projeto `opec-escala`). A importação vai rodar e devolver zero
plantões até isso ser aprovado — não é bug.

## O que o banco tem hoje

| Tabela | Linhas |
|---|---|
| pessoas | 9 (7 fixas mais gestores) |
| frentes | 6 |
| mapa | 18 (setembro/2026) |
| competições | 46, sendo **2 ainda sem frente** |
| taxas | 7 |
| cadeia | 22 |
| eventos | 28, sendo **6 com entrega indefinida** |
| tarefas | 43, 2 entregues |
| sessões | 18 |
| ajustes de tempo | 1 |
| plantões | 0 — importação pronta (23/09), falta ligar e falta a Escala ter algo confirmado no piso |

## O que falta, em ordem

1. **Exceção na entrega.** Os campos `excecao` e `excecao_desc` existem na tabela e não têm
   entrada na tela. Hoje só dá para escrever em `obs`.
2. **Ajuste manual avulso.** A ação `ajustarTempo` existe; falta a entrada na tela. Só a
   entrega grava ajuste, com o motivo "tempo confirmado na entrega".
3. **Fechar a semana** reproduzindo os números do `fechar_semana.py`, e exportar o CSV no
   formato de `acompanhamento/registro/`. É o que tira a Bárbara do CSV.
4. **Painel sem competência fixa.** Hoje setembro/2026 está escrito no código.
5. **Admin: só pessoas e frentes continuam só leitura.** Classificar competição e resolver
   entrega já escrevem de verdade (`/admin/eventos`, 23/09) — Daniel e Yuri, os dois gestores.

## Armadilhas que já custaram tempo

- **O `?code` do OAuth cai em qualquer caminho.** Quando a `redirectTo` não está na lista de
  Redirect URLs, o Supabase joga a pessoa no Site URL com o `code` na query. O middleware
  desvia para `/auth/callback` antes de qualquer checagem de sessão, senão o code se perde.
- **Minuto não pode ser a fonte do tempo.** Arredondar a soma das sessões fazia o relógio
  "voltar" ao pausar e retomar. Corrigido na `020`: a view guarda segundos.
- **A janela do dock é outro documento.** Trocar o tema na aba não chega lá sozinho; existe
  um observador que espelha. Vale para qualquer coisa nova que dependa do `data-tema`.
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

## Combinado com o Daniel

Prefere tarefa a mais e corrigir depois a tarefa que não aparece. Por isso a classificação
das nove competições novas da `018` foi feita por palpite, com o raciocínio no comentário de
cada linha, em vez de travar a geração esperando confirmação. **Rever essa classificação é
um item aberto.**
