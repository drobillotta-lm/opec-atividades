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

Espelha o que já existe: `acompanhamento/registro/*_sem_*.csv` por semana,
`fechar_mes.py` por mês. A tela principal é a semana. O painel é o mês.

## 21/09/2026 — cronômetro sim, ajuste manual também

Sessões com início e fim, uma aberta por pessoa. Fechar a aba não fecha a sessão; ao voltar,
o app pergunta. Ajuste manual de minutos existe e exige motivo, e fica registrado como ajuste,
separado do que o cronômetro mediu. Motivo: ninguém lembra de iniciar o timer toda vez, e um
número que a pessoa não confia é pior que nenhum número.
