# Decisões

Cada uma com data e motivo. Mesmo espírito de `config/decisoes.yaml` no dimensionamento:
decisão nova é linha nova, com data. Nada de premissa escondida no código.

## 20/09/2026 — as contradições do documento de pesquisa

O material de origem (`docs/fontes/pesquisa-original.md`) é a costura de quatro textos: a
proposta do Daniel e três rodadas de IA que derivaram o produto de uma referência visual de
Mac, o Sydedock. Elas se contradizem. Resolvido assim:

| # | Tema | O que o documento dizia | Decisão |
|---|---|---|---|
| D1 | Plataforma | Web com login, ou app Windows em Tauri sem login | **Web/PWA primeiro**, instalável no PC e no celular. Dock desktop fica para depois do piloto |
| D2 | Núcleo | "Gestor é camada, não a cara" | **Gestão é o produto.** A visão do líder entra no MVP |
| D3 | Hierarquia | `member` e `manager`, um time só | **Três níveis** com frentes modeladas: gestor, líder de frente, membro |
| D4 | Visibilidade | Tarefa pessoal não visível ao gestor | **Tudo visível.** O que foi feito fora do mapa é o dado mais valioso |
| D5 | Inatividade | Gravar em silêncio, só o gestor vê | **Não existe.** Cronômetro é manual, em nenhuma fase há detecção de ausência |
| D6 | Rastreio | Extensão que sincroniza URLs abertas | **Fora.** Nenhum rastreio de programa, aba ou teclado |
| D7 | Widgets | Streak, água, hábitos, notas | **Fora.** Vieram da referência, não da necessidade |
| D8 | Metas de memória | 30, 60, 80 ou 200 MB | Irrelevante numa aplicação web. Some do plano |

## 20/09/2026 — stack

Next.js com TypeScript e Tailwind na Vercel; Supabase para banco, login e permissões.
Motivo: é a stack que o Daniel já tem conectada e sabe operar. Permissões aplicadas no
servidor com Row Level Security, nunca só escondendo botão.

## 21/09/2026 — não há freelas neste app

Confirmado com o Daniel. As sete pessoas da OPEC são fixas. Freela existe no modelo de
dimensionamento como orçamento de cobertura de plantão, não como alguém que executa a cadeia
assíncrona. O app não tem convite, não tem cadastro externo, não tem allowlist.

## 21/09/2026 — plantão é leitura

Plantão conta como carga das mesmas pessoas fixas e precisa aparecer para o total de horas
fechar. Mas quem escala é o app de Escala. Aqui ele entra por importação e nunca é editável.

## 21/09/2026 — login só com a conta LiveMode

As sete pessoas têm `@livemode.com`. Login com Google restrito ao domínio. Sem senha, sem
link por e-mail, sem cadastro. Entrar e sair do time é decisão do Yuri, registrada junto com
o mapa — não é uma configuração do app.

Revogado nesta data: a proposta anterior de allowlist por convite mais link mágico, que
existia para cobrir freelas com Gmail. Sem freelas, ela não tem função.

## 21/09/2026 — o app lê o mapa, nunca escreve

`config/mapa_aprovado.csv` continua sendo a fonte de quem faz o quê. O app importa e guarda
de qual versão importou. Se alguém quiser mudar a alocação, muda lá, com o solver propondo e
o Yuri aprovando. Motivo: o dimensionamento já tem uma regra dura de que o solver não roda
sozinho. Duplicar a decisão em dois lugares quebraria isso.

## 21/09/2026 — a unidade de trabalho é evento × tarefa

Não é "atividade" genérica. Todo evento da Matriz gera as quatro tarefas da cadeia assíncrona
(materiais, sincronização, roteiro, auditoria), ou os dois pacotes do Nacional. A estimativa
não é digitada por ninguém: vem da taxa em `config/taxas.yaml`. O prazo é o evento mais 48
horas, pela regra que já existe no motor.

## 21/09/2026 — o ciclo é semanal, o fechamento é mensal

**Revogada em 28/09/2026** (ver abaixo). Dizia: espelha o que já existe,
`acompanhamento/registro/*_sem_*.csv` por semana, `fechar_mes.py` por mês; a tela principal
é a semana, o painel é o mês.

## 21/09/2026 — cronômetro sim, ajuste manual também

Sessões com início e fim, uma aberta por pessoa. Fechar a aba não fecha a sessão; ao voltar,
o app pergunta. Ajuste manual de minutos existe e exige motivo, e fica registrado como ajuste,
separado do que o cronômetro mediu. Motivo: ninguém lembra de iniciar o timer toda vez, e um
número que a pessoa não confia é pior que nenhum número.

---

As decisões abaixo foram tomadas durante a construção, na madrugada de 21/09, e estavam só
no código e nos comentários das migrations até serem registradas aqui.

## 21/09/2026 — a fonte dos eventos é o Airtable, não o CSV da Matriz

A tabela `eventos` nasce da varredura da base do Airtable, e a chave é o `record id` de lá
(`010`), não mais o par competição + data. Motivo: o mesmo par se repete no dia, e o record
id é o único identificador que sobrevive a uma edição de nome. `evento_id_origem` continua
existindo, mas como rótulo legível, com índice não único.

Junto veio a tabela `competicoes` (`007`): competição é cadastro, com frente, origem e
estado. Um evento pode nascer **sem frente** (`009`) quando a competição ainda não foi
classificada; classificar a competição propaga para os eventos dela por trigger (`013`).
Hoje há 46 competições, 2 ainda sem frente.

## 21/09/2026 — só vira tarefa o evento que tem entrega comercial

Quem decide é o líder, na coluna "tem entrega?" da planilha da Escala OPEC. Como essa coluna
só começou a ser preenchida em setembro (68% do mês, 0% antes), o app parte de um padrão por
competição (`competicoes.entrega_padrao`) e deixa o líder confirmar evento a evento
(`eventos.entrega` mais `entrega_origem`: previsto, escala ou líder). `gerar_tarefas` ignora
evento sem entrega (`014`, `015`).

Motivo: gerar a cadeia para todo evento da Matriz enche a semana de tarefa que ninguém deve
fazer, e a primeira coisa que mata um app de registro é pedir que a pessoa ignore linhas.

## 21/09/2026 — a atividade tem janela, não só prazo

Nem tudo acontece depois do evento: materiais e roteiro são preparação. Cada linha de
`cadeia` ganhou `abre_offset_dias` e `prazo_offset_dias` em dias relativos ao evento, e a
tarefa passou a carregar `abre_em` além de `prazo_em` (`016`, `017`). A semana de uma pessoa
é o trabalho cuja **janela** cruza a semana, e não os eventos daquela semana.

Os deslocamentos atuais são um palpite deliberadamente generoso, decidido com o Daniel:
prefere tarefa a mais e corrigir depois a tarefa que não aparece. Cada linha é editável.

## 21/09/2026 — o tempo é guardado em segundos

`v_tempo_tarefa` arredondava a soma das sessões para minutos inteiros e o relógio parecia
"voltar" ao pausar e retomar. Agora a view guarda segundos com precisão e o minuto é
derivado, nunca a fonte (`020`).

## 21/09/2026 — o dock é uma janela Document Picture-in-Picture

É a única forma de uma página web ficar acima das outras janelas: Chrome e Edge desde a 116,
Firefox desde a 151, Safari não tem. Para a janela não nascer sem estilo, ela carrega um
iframe apontando para a rota `/dock`, que chega inteira e busca os próprios dados.

Limites aceitos: exige gesto do usuário e HTTPS, só uma janela por vez, não dá para
posicionar por código, e ela fecha junto com a aba de origem. Por isso o cronômetro vive no
banco e nunca só na tela. Tauri continua sendo o plano B, não o plano.

## 21/09/2026 — tema claro e escuro

O mockup é escuro, de sala de controle, e continua sendo o padrão. Mas o app fica aberto o
dia inteiro ao lado de planilha e navegador claros, então existe um botão de tema, guardado
por pessoa. A janela do dock é outro documento: o tema é espelhado nela por observador.

---

As decisões abaixo saíram da revisão geral de 28/09/2026, depois de uma semana com o app no
ar sem ninguém do time ter entrado.

## 28/09/2026 — a tarefa nasce e morre com o evento; "semana" é só uma lente

Revoga "o ciclo é semanal, o fechamento é mensal". A unidade viva é o evento: ele nasce na
Matriz, a Escala decide se tem entrega, e daí a tarefa existe — com janela própria, não
com semana. Nada "abre" nem "fecha": um evento cancelado desfaz a tarefa (`028`), um
evento novo cria a dele na próxima rodada. `/semana` e `/painel` são recortes de leitura
sobre esse fluxo contínuo, nunca um estado.

Consequência: **não existe "fechar a semana"**. O que a Bárbara precisa é puxar um
relatório de qualquer período, a qualquer momento, e exportar no formato de
`acompanhamento/registro/*.csv`. O CSV continua vivo como saída (ainda não se sabe quem vai
consumir, nem como), não como fluxo de trabalho.

## 28/09/2026 — o app lê a Escala direto

Continua sendo um app separado (execução e tempo), mas lê o banco da Escala
(`lbcvhgqxnchszqaudzui`, schema `escala`) em vez de depender da rota de exportação e da
rodada 2x/dia. A Escala é a fonte de eventos, entrega, plantão, líderes e da própria
classificação de competição por frente (`escala.competicoes.frente_codigo`). Como ler —
conexão direta do servidor com a chave da Escala, ou foreign table — está em aberto em
`05-onde-paramos.md`.

## 28/09/2026 — o mapa entra até onde o Yuri aprovou

`config/mapa_aprovado.csv` tinha outubro, novembro e dezembro desde 14/09; a `005` só
trouxe setembro e por isso `gerar_tarefas` devolvia 363 "sem escalado" em 28/09. A `026`
importa os três meses. Regra: se está aprovado lá, entra aqui.

## 28/09/2026 — os e-mails são os da Escala

Os seis fixos estavam com `nome@livemode.com`, um palpite da `004`. Os reais são os que
eles usam na Escala (`breis@`, `gduarte@`, `jbruno@`, `jbecker@`, `lmatias@`, `plopes@`).
Com o palpite, o primeiro login de cada um cairia em "fora do time" (`027`).

## 28/09/2026 — cadastro: Juliana lidera Nacional, Vitor está fora, Kings fica inativa

Nacional não tinha líder (no `decisoes.yaml` é dupla fixa Daniel + Juliana, sem líder).
Juliana lidera e também executa. **Líder pode executar a própria frente** — a regra "líder
não executa a própria frente" do `decisoes.yaml` do Yuri não vale neste app: quem diz quem
faz o quê é o mapa, e o papel de líder é só o de ver a frente inteira e resolver quem fez.
Vitor já tinha `saida = 01/09` e zero linhas de mapa; nada a apagar,
só não aparece. Kings (KG) tem 3 competições e 3 eventos no banco, todos sem entrega;
continua inativa até aparecer evento com entrega.

## 28/09/2026 — o mockup foi abandonado

`claude.ai/artifact/8xPnpgKwETbJKPFzdzfCFR` parou em 21/09 e não tem busca, quadro, criar
frente nem atividade desnecessária. O código é a referência visual; `04-telas.md` descreve
o que está no ar.

## 28/09/2026 — dock continua no plano, e ganha "subdividir atividade"

Atalhos de teclado e posição lembrada continuam antes do piloto. Pedido novo do Daniel:
quebrar uma tarefa em **sub-tarefas**, cada uma com escopo próprio, cronômetro próprio e
podendo ser de outra pessoa; o tempo da sub-tarefa soma na tarefa-mãe. É diferente de
sessão: sessão é a mesma tarefa em vários trechos, sem escopo novo. Desenho: tabela
`subtarefas` (tarefa, título, pessoa, status) e `sessoes.subtarefa_id` opcional — o total
da tarefa continua saindo de `v_tempo_tarefa`, porque a sessão segue apontando para a
tarefa. `gerar_tarefas` e a chave `(evento, atividade)` não mudam.
