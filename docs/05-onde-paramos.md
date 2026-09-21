# Onde paramos — 21/09/2026

Uma madrugada de trabalho, da fundação ao app no ar. Este arquivo é o ponto de retomada.

## O que está no ar

| Coisa | Onde | Estado |
|---|---|---|
| App | https://opec-atividades.vercel.app | no ar, login funcionando |
| Banco | Supabase `igzrrsqmweuritiqrmrh`, sa-east-1 | 20 migrations aplicadas |
| Login | Google restrito a `@livemode.com` | 1 conta ligada (a do Daniel) |
| Mockup | https://claude.ai/artifact/8xPnpgKwETbJKPFzdzfCFR | 7 artboards, referência visual |

Rotas: `/entrar`, `/fora-do-time`, `/semana`, `/frente`, `/painel`, `/admin`, `/dock`.

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
| plantões | 0 — a importação da Escala não existe ainda |

## O que falta, em ordem

1. **Plantão em leitura na semana.** A tabela existe e está vazia. Enquanto não vier da
   Escala, o total de horas de uma pessoa está incompleto.
2. **Exceção na entrega.** Os campos `excecao` e `excecao_desc` existem na tabela e não têm
   entrada na tela. Hoje só dá para escrever em `obs`.
3. **Ajuste manual avulso.** A ação `ajustarTempo` existe; falta a entrada na tela. Só a
   entrega grava ajuste, com o motivo "tempo confirmado na entrega".
4. **Fechar a semana** reproduzindo os números do `fechar_semana.py`, e exportar o CSV no
   formato de `acompanhamento/registro/`. É o que tira a Bárbara do CSV.
5. **Painel sem competência fixa.** Hoje setembro/2026 está escrito no código.
6. **Admin que escreve.** Classificar competição e resolver entrega já aparecem como fila,
   mas a edição de pessoas e frentes ainda é só leitura.
7. **Sincronizar eventos de forma contínua.** A varredura do Airtable foi manual, para
   14/09 a 04/10. `eventos.last_modified` e `sincronizado_em` existem para a incremental.

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

## Combinado com o Daniel

Prefere tarefa a mais e corrigir depois a tarefa que não aparece. Por isso a classificação
das nove competições novas da `018` foi feita por palpite, com o raciocínio no comentário de
cada linha, em vez de travar a geração esperando confirmação. **Rever essa classificação é
um item aberto.**
