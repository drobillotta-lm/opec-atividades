# Telas

Mockup navegável: https://claude.ai/artifact/8xPnpgKwETbJKPFzdzfCFR

Sete artboards ligados entre si. Dados fictícios, mas as frentes, tarefas, taxas, pessoas e
competições são as reais do dimensionamento.

| Tela | Para quem | O que resolve |
|---|---|---|
| **Entrar** | todos | Um botão. Conta LiveMode, sem senha. Segundo estado: fora do time |
| **Minha semana** | todos | Pendentes, entregues e o plantão em leitura. Cronômetro no topo |
| **Dock retraído** | todos | Três estados em tamanho real: recolhido rodando, recolhido parado, expandido |
| **Tarefa** | todos | Sessões, ajuste manual, e o campo de quem fez de verdade |
| **Frente** | líder | A semana da frente com escalado ao lado de quem fez. Fechar a semana |
| **Painel** | gestor | Horas medidas contra previstas por pessoa, e as taxas que não batem mais |
| **Admin** | gestor | Pessoas, frentes, e de onde vem o mapa |

## O que virou código, em 21/09

O mockup continua sendo a referência visual, e o app já saiu dele em alguns pontos. Onde
diverge, vale o código.

| Tela do mockup | Rota | Diferença |
|---|---|---|
| Entrar | `/entrar` e `/fora-do-time` | igual |
| Minha semana | `/semana` | tem navegação de semana (‹ hoje ›); **não tem a seção de plantão** |
| Dock | `/dock` | virou janela Document Picture-in-Picture, aberta por botão, mais atalho de desktop pelo `instalar.ps1`. Um estado só: tarefa atual, barra contra a taxa, pausar/retomar e entregar |
| Tarefa | — | **não existe como tela.** Entrega e tempo acontecem no diálogo dentro de `/semana` |
| Frente | `/frente` | tem também "tem entrega?" para o líder resolver o evento |
| Painel | `/painel` | competência fixa em setembro/2026; sem o corte por frente |
| Admin | `/admin` | ganhou as duas filas que o mockup não previa: competição sem frente e evento com entrega indefinida |

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
