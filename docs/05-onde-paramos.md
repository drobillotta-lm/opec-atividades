# Onde paramos — 28/09/2026

Revisão geral do projeto, uma semana depois de subir. O fato que reorganizou tudo: **o app
estava no ar e ninguém do time tinha entrado** — nem conseguiria, porque os e-mails dos seis
fixos eram um palpite. Este arquivo é o ponto de retomada; `01-decisoes.md` tem o porquê de
cada mudança de 28/09.

## O que está no ar

| Coisa | Onde | Estado |
|---|---|---|
| App | https://opec-atividades.vercel.app | no ar; **ligado ao Git desde 28/09** — `git push` na `main` publica sozinho |
| Banco | Supabase `igzrrsqmweuritiqrmrh`, sa-east-1 | 28 migrations, banco = repo |
| Login | Google restrito a `@livemode.com` | e-mails reais desde a `027` — só o Daniel entrou até hoje |
| Eventos, entrega, plantão | importados da Escala 2x/dia (`/api/importar-escala`, GitHub Actions) | funciona; **vai ser trocado por leitura direta** (abaixo) |
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

## O que falta, em ordem

1. **Ler a Escala direto** (`lbcvhgqxnchszqaudzui`, schema `escala`). Proposta:
   - O servidor do Atividades usa a service key da Escala (`ESCALA_SUPABASE_URL` +
     `ESCALA_SERVICE_KEY` na Vercel) e lê `escala.eventos`, `escala.alocacoes` (plantão
     confirmado dos fixos), `escala.frentes` (líderes) e `escala.competicoes`
     (`frente_codigo`, `entrega_padrao`). Sem rota HTTP, sem `EXPORTAR_TOKEN`.
   - `tarefas` continua apontando para o `eventos` local (chave `airtable_record_id`), então
     a leitura sincroniza a tabela local — mas de hora em hora, disparada pelo n8n logo
     depois do Ingestor da Escala (`:05`), mais um botão "Sincronizar agora" em `/admin`.
   - A classificação competição × frente passa a vir da Escala; o `/admin` daqui só cobre o
     que a Escala ainda não classificou.
   - Alternativa considerada: foreign table (`postgres_fdw`) — mais elegante, mas exige
     senha do banco da Escala no Vault e não elimina a tabela local por causa das chaves.
2. **Relatório de período + CSV** no formato de `acompanhamento/registro/` (item 20 do
   plano). `v_semana_frente` já tem os números; falta a tela e o arquivo.
3. **Painel: corte por frente.** A navegação por mês entrou em 28/09.
4. **Dock e sub-tarefas**: atalhos, posição lembrada, e sub-tarefas (escopo e cronômetro
   próprios, podem ser de outra pessoa, somam na tarefa-mãe — desenho no `01-decisoes.md`).
5. **Admin: pessoas** continua só leitura.
6. **Competição duplicada por aspas** (`Programa "Quem Fez, Fez!" 2026` × versão com aspas
   dobradas). **A origem é a Escala**: `escala.competicoes` tem a linha com as aspas
   dobradas. Corrigir lá; aqui, mesclar.
7. ~~Ligar a Vercel ao Git~~ — feito em 28/09. Precisou de dois passos manuais na conta do
   Daniel: Login Connection com o GitHub na Vercel, e instalar o app da Vercel no GitHub
   (`github.com/apps/vercel`) com acesso ao repositório. A Escala continua manual.
8. **Piloto.** Agora dá: e-mails certos, outubro gerado. Falta a página "o que o líder vê e
   o que ninguém vê" (item 24) e chamar as pessoas.

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
