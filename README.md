# OPEC · Atividades

App web onde cada pessoa da OPEC vê as tarefas que o mapa do mês deu a ela, registra o que
de fato executou e quanto tempo levou, e o líder de cada frente compara o planejado com o
executado.

**Ele não decide alocação.** Quem faz o quê continua sendo decidido em
[`ymuanes/opec-dimensionamento`](https://github.com/ymuanes/opec-dimensionamento): o solver
propõe, o Yuri aprova em `config/mapa_aprovado.csv`. Este app lê esse mapa e devolve o que
aconteceu de verdade.

## Por que existe

Hoje o acompanhamento vive em `acompanhamento/registro/*_sem_*.csv`, no repo de
dimensionamento. A coluna `responsavel_real` é preenchida à mão pelo líder de cada frente,
semana a semana. Esse é o trabalho que o app elimina — e, de quebra, passa a medir o tempo
real de cada tarefa, que hoje é uma taxa fixa medida uma única vez em julho de 2026.

## Estado

Fase 0. Nenhum código de aplicação ainda. O que existe:

| Onde | O quê |
|---|---|
| `docs/00-visao.md` | O produto em uma página |
| `docs/01-decisoes.md` | Decisões com data, no formato de ADR |
| `docs/02-modelo-dados.md` | Schema Postgres e regras de acesso |
| `docs/03-plano.md` | Fases 1 a 4 |
| `docs/04-telas.md` | As 7 telas e o link do mockup |
| `docs/99-fontes.md` | De onde veio cada coisa |
| `docs/fontes/` | O material de origem, preservado |

## Stack

Next.js + TypeScript + Tailwind na Vercel · Supabase para banco, login e permissões.

## Time

Yuri (gestor da área) e Daniel (dados/IA) como gestores do app. Sete pessoas fixas executam:
Juliana, Bárbara, Julia, Lucas, Gabriel, Pedro e Daniel.
