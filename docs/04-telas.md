# Telas

O mockup (`claude.ai/artifact/8xPnpgKwETbJKPFzdzfCFR`) foi **abandonado em 28/09/2026**: o
código é a referência. A tabela abaixo é o que ele previa; a de "o que virou código" é o
que está no ar.

| Tela | Para quem | O que resolve |
|---|---|---|
| **Entrar** | todos | Um botão. Conta LiveMode, sem senha. Segundo estado: fora do time |
| **Minha semana** | todos | Pendentes, entregues e o plantão em leitura. Cronômetro no topo |
| **Dock retraído** | todos | Três estados em tamanho real: recolhido rodando, recolhido parado, expandido |
| **Tarefa** | todos | Sessões, ajuste manual, e o campo de quem fez de verdade |
| **Frente** | líder | A semana da frente com escalado ao lado de quem fez. Fechar a semana |
| **Painel** | gestor | Horas medidas contra previstas por pessoa, e as taxas que não batem mais |
| **Admin** | gestor | Pessoas, frentes, e de onde vem o mapa |

## O que está no ar (28/09)

| Rota | Para quem | O que faz |
|---|---|---|
| `/entrar`, `/fora-do-time` | todos | Google restrito a `@livemode.com`; quem não está em `pessoas` cai em fora do time |
| `/semana` | todos | **Lista** (padrão) ou **Quadro kanban** (06/10: Pendente / Fazendo / Feita das minhas tarefas; o líder alterna pra toda a frente). Pendentes, pausadas, entregues e não aplicáveis, com navegação ‹ hoje ›. Iniciar/pausar/entregar, ajustar tempo (avulso), marcar não necessária, **dividir em partes** (sub-tarefas com dono e cronômetro próprios), e buscar tarefa de outra pessoa para puxar ou ajudar. **Não tem a seção de plantão** |
| `/dock` | todos | Janela `window.open` comum (a Picture-in-Picture fechava com a aba): tarefa atual (e a parte, se o relógio estiver numa), barra contra a taxa, pausar/retomar, entregar. Atalho de desktop pelo `instalar.ps1` |
| `/como-funciona` | todos | O que fica registrado, quem vê o quê, o que o app não faz — a página de confiança do piloto |
| `/frente` | líder, gestor | A semana da frente, escalado ao lado de quem fez; o líder resolve quem fez na linha |
| `/kanban` | — | Redireciona pra `/semana?ver=kanban&quem=frente` (o Quadro virou vista de Minha semana em 06/10) |
| `/painel` | gestor | Horas medidas contra previstas por pessoa e "a taxa ainda vale?", por mês com ‹ hoje › |
| `/admin` | gestor | Classificar competição sem frente (ou criar frente), pessoas em leitura |
| `/admin/eventos` | gestor | Entrega, tarefas e responsáveis por evento — entrega é leitura, quem decide é o líder na Escala |
| `/admin/organizar` | gestor | Três abas. **Mapa**: grade frente × atividade do mês, pessoa + dupla, selo "provisório", aviso de líder na própria frente; salvar, copiar do mês anterior, reaplicar. **Atividades**: cadeia por frente com vigência, taxa, janela e o medido do mês; nova atividade, encerrar/reabrir a partir de uma data, alterar janela e taxa. **Tarefas**: filtro por semana/frente/pessoa/evento; redirecionar, ajustar prazo e estimativa, desnecessária, apagar (só sem tempo), criar tarefa no evento |

Não existe tela de "tarefa": entrega e tempo acontecem em diálogos dentro de `/semana`.

Fora do mockup: **tema claro e escuro**. O escuro continua sendo o padrão.

## Direção visual

Escuro, denso, de sala de controle. Não é o vidro claro da referência de Mac que aparece no
material de origem: é uma ferramenta de operação que fica aberta o dia inteiro.

Tipografia: Archivo para interface, IBM Plex Mono para tempo e números.

Cores, validadas para contraste sobre o fundo `#161A20`:

| Uso | Hex |
|---|---|
| Fundo | `#0E1014` |
| Superfície | `#161A20` |
| Linha | `#2A313B` |
| Texto | `#E6EAF0` |
| Texto secundário | `#93A0B0` |
| Azul, ação e barra de tempo | `#3794F4` |
| Verde, em andamento e entregue | `#28AB72` |
| Âmbar, fora do prazo | `#B8892D` |
| Vermelho, bloqueado | `#E05A7A` |

Status nunca é só cor: sempre cor mais ícone mais texto.

**Não há identidade oficial da OPEC ou da LiveMode aqui.** Os hexadecimais que aparecem no
material de origem foram inventados por uma IA que não tinha o guia de marca. Quando houver
um de verdade, trocar estes.

## No painel

A barra azul é o tempo medido. O traço cinza é o previsto pela taxa. Barra passando do traço
quer dizer que a taxa está defasada, não que a pessoa é lenta.
