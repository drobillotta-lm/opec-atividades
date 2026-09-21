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

**No ar em https://opec-atividades.vercel.app**, com o banco povoado e o login funcionando.
Fase 1 praticamente inteira, mais o dock da fase 2 e o esqueleto das telas da fase 3.
O detalhe de onde paramos e o que vem a seguir está em `docs/05-onde-paramos.md`.

| Onde | O quê |
|---|---|
| `docs/00-visao.md` | O produto em uma página |
| `docs/01-decisoes.md` | Decisões com data, no formato de ADR |
| `docs/02-modelo-dados.md` | Schema Postgres e regras de acesso |
| `docs/03-plano.md` | Fases 1 a 4, com o que já está feito |
| `docs/04-telas.md` | As 7 telas, o link do mockup e o que virou código |
| `docs/05-onde-paramos.md` | Estado atual, o que falta e as armadilhas |
| `docs/99-fontes.md` | De onde veio cada coisa |
| `docs/fontes/` | O material de origem, preservado |
| `src/` | O app Next.js |
| `supabase/migrations/` | O schema, migration a migration |
| `scripts/instalar.ps1` | Instala o app e o dock como atalhos no Windows |

## Stack

Next.js 16 + TypeScript + Tailwind 4 na Vercel · Supabase para banco, login e permissões.

## Rodar local

```
npm install
cp .env.example .env.local     # preencher com as chaves do projeto Supabase
npm run dev
```

O login exige HTTPS no OAuth do Google, mas o callback aceita `localhost`. Para usar o app
instalado apontando para a máquina, `scripts\instalar.ps1 -Local`.

## Time

Yuri (gestor da área) e Daniel (dados/IA) como gestores do app. Sete pessoas fixas executam:
Juliana, Bárbara, Julia, Lucas, Gabriel, Pedro e Daniel.
