# Sr. Minutos e a nova cara do app

Conceito, 01/10/2026, com as cinco pendências decididas pelo Daniel na mesma noite. Nada disto está no código ainda. O mockup pra comentar
está em https://claude.ai/artifact/64gePQg56GTD4BSVvgSBfo (mesma estrutura deste doc, com as telas). Os assets estão em
`public/sr-minutos/` (tratados, fundo transparente) e `public/sr-minutos/originais/`
(JPG e MP4 como vieram do gerador).

## O que muda

O app continua a mesma ferramenta de operação (`04-telas.md` segue valendo pro que cada
rota faz). Muda a casca: sai o visual neutro de sala de controle azul, entra a estética
LiveMode/CazéTV, verde vivo sobre preto, tipografia condensada e pesada nos títulos, e um
personagem no centro, o **Sr. Minutos**.

## Quem é o Sr. Minutos

Um relógio de parede verde, com luvas brancas, botas verdes e um relógio de pulso. Ele é o
cronômetro do app com cara. Não é mascote decorativo: cada vez que ele aparece, está
dizendo algo sobre o tempo da pessoa que está olhando.

**Papel:** assistente de tempo da pessoa logada. Fala só com ela, sobre as tarefas dela.

**Voz:** carioca de arquibancada, frases curtas, sem bronca pessoal. "Valeu cara" é o
bordão de entrega. Ele cobra o relógio, nunca a pessoa. Quando algo atrasa, o inimigo é o
prazo, não quem está na frente da tela.

## As seis poses e quando cada uma aparece

| Pose | Arquivo | Gatilho no app | Fala de exemplo |
|---|---|---|---|
| Apontando | `apontando.png` | Tem tarefa abrindo ou vencendo hoje. Ele aponta a próxima | "Roteiro do Flamengo abre hoje. Bora?" |
| Joinha | `joinha.png` | Entrega feita; semana sem atraso e dentro da taxa | "Valeu cara. 1h12 de 1h30, dentro da taxa" |
| Bravo | `bravo.png` | Prazo vence hoje e a tarefa ainda não tem sessão. Só no dock | (sem frase) |
| Furioso | `furioso.png` | Prazo venceu e a tarefa continua sem sessão. Só no dock | "Poxa amiguinho, prefere vir fazer o ATP 01am amanhã?" (texto do Daniel no asset) |
| Triste | `triste.png` | Semana terminou sem nenhuma sessão registrada | "Ninguém ligou o cronômetro essa semana. Sem número eu não sirvo pra nada" |
| Férias | `ferias.png` | Fim de semana ou dia sem tarefa aberta; descanso pós-plantão. Versão sem cigarro | "Hoje não tem nada aberto. Vai viver" |
| Rosto | `rosto.png` | Dock recolhido e avatar. Só o mostrador, sem mão | — |

### Vídeos (em `originais/`, fundo branco, sem áudio)

| Arquivo | O que mostra | Onde entra |
|---|---|---|
| `apontando-para-bravo.mp4` (7s, 944px) | aponta, depois fica bravo | abertura do "Como funciona"; transição no dock de "vence hoje" pra "venceu" |
| `ferias-loop.mp4` (6s, 544px) | óculos escuros, drinque, mexe no celular | estado vazio "nada aberto hoje"; dock no fim de semana |
| `triste-andando.mp4` (6s, 544px) | anda triste, leva um susto, volta | estado vazio "ninguém registrou"; o susto serve de reação a "Iniciar" |

Pra usar de verdade falta: (1) tirar o fundo branco quadro a quadro e exportar WebM com alpha
(VP9) mais fallback MP4 com o fundo da tela pintado, via ffmpeg; (2) pro dock, sprite sheet PNG
de 8 a 12 quadros animado por CSS, porque vídeo em 96×30 px não compensa; (3) achar o ponto de
corte de cada loop ou fazer crossfade curto no fim; (4) quem tem "reduzir movimento" ligado vê a
pose parada.

## Fora e dentro: a regra de convivência com as caixas (02/10/2026)

Pedido do Daniel: ele anda solto pela plataforma, "totalmente livre", interagindo com as caixas.

**Fora das caixas: corpo inteiro.** Nunca dentro de cartão, botão ou tabela. Sempre encostado
em uma: pé na borda de cima, ombro apoiado, meio corpo saindo de trás. Nunca cobre texto nem
botão; ocupa o ar que a tela já tem (canto do cabeçalho, borda de um cartão, lateral de uma
tabela). Tamanho fixo: 150 px de altura no desktop, 110 no celular; só o herói do Entrar é maior.
Com as animações, ele anda pela borda de baixo da área principal e para em cima do que importa.

**Dentro das caixas: só o rosto**, como símbolo. Substitui o pontinho colorido em etiqueta de
status, dock recolhido, logo, avatar. A cor do aro é o estado:

| Arquivo | Cor | Significado |
|---|---|---|
| `rosto.png` | verde | em andamento, entregue, normal |
| `rosto-ambar.png` | âmbar | fora do prazo |
| `rosto-rosa.png` | rosa | bloqueado |
| `rosto-cinza.png` | cinza | pausado, inativo |
| `rosto-creme.png` | creme | sem estado: ainda não abriu, não aplicável |

Cor nunca vem sozinha: rosto mais texto. Rosto não fala; balão é só do corpo inteiro.

**Poses que faltam** pra ele sentar, debruçar e espiar (gerar no mesmo estilo, fundo branco, sem
texto): sentado na borda com pernas balançando; debruçado de braços cruzados numa borda;
espiando de trás (meio corpo); andando de perfil; deitado em cima apoiado no cotovelo;
pendurado pelas mãos. Descrições completas na seção "Poses a gerar" do artefato.

## Onde ele entra em cada tela

- **Entrar.** Ele é o herói da tela. Apontando, com o balão "Bora marcar hora?". É a primeira
  coisa que o time vê no piloto, então é aqui que o personagem se apresenta.
- **Minha semana.** Em pé em cima do cartão de andamento, no canto, com o balão da próxima
  tarefa. Etiquetas de status levam o rosto colorido. Nos estados vazios ele fica encostado na
  caixa de texto: triste se não houve registro, de férias se não há nada aberto.
- **Dock.** Recolhido, o ponto colorido vira o rosto dele ao lado do relógio (96×30 px). Expandido,
  o rosto fica no canto do cartão. Ele é o próprio cronômetro, então o dock é a casa natural.
  **É só aqui que o bravo e o furioso aparecem**, pequenos e sem frase: bravo quando o prazo
  vence hoje sem sessão, furioso quando já venceu.
- **Entregar.** Ao confirmar, aparece o selo "Valeu cara. Aprovado pelo Sr. Minutos" por 3
  segundos. É a única celebração do app.
- **Minha frente (líder).** Em pé na borda da tabela, sem frase. "Sem quem fez" leva o rosto
  âmbar; desvio leva o rosto verde. Não comenta desempenho de ninguém.
- **Painel (gestor).** Em pé em cima do cartão da taxa defasada, com balão. Comenta a taxa, nunca a pessoa: "A taxa de auditoria tá 20% abaixo
  do medido. Hora de rever". Isso reforça a regra do `04-telas.md`: barra passando do traço
  é taxa defasada, não pessoa lenta.
- **Como funciona.** Ele narra a página de confiança. "Eu conto minutos. Não leio tela, não
  vejo aba, não sei se você levantou". É o lugar onde o personagem ganha a confiança do time.

## O que ele nunca faz

- Não aparece na tela de uma pessoa falando de outra pessoa.
- Não classifica ninguém como lento, atrasado ou improdutivo. Fala de prazo e de taxa.
- Não aparece em ranking, porque ranking não existe.
- Não faz barulho. Sem som em nenhuma fase.
- Não interrompe: nunca é modal, nunca bloqueia ação.

## Três fases

1. **Visual (agora).** Pose escolhida por regra simples a partir dos dados que a página já
   carrega. Frases vêm de uma tabela fixa por estado. Nada de IA.
2. **Reativo.** Frases montadas com os dados reais (nome da competição, horas, prazo).
   Transições animadas entre poses (o vídeo vira sprite). Dock ganha o rosto.
3. **Interativo.** Clicar nele abre atalhos: iniciar a próxima, entregar, ajustar tempo.
   Depois, conversa: "o que eu tenho pra hoje?", "quanto gastei em auditoria esse mês?".
   Aí sim entra modelo de linguagem, sobre os dados da própria pessoa.

## Identidade visual

Derivada do personagem, não inventada à parte. O verde é o do corpo dele; o creme é o do
mostrador; o preto esverdeado é o que faz o verde vibrar como na CazéTV.

| Uso | Noite (padrão) | Mostrador (claro) |
|---|---|---|
| Fundo | `#0B0F0C` | `#F4ECDA` |
| Superfície | `#121814` | `#FBF6EA` |
| Linha | `#26302A` | `#DDD2BB` |
| Texto | `#F2E8D5` | `#10261A` |
| Texto secundário | `#8E9A90` | `#5E6B61` |
| Verde Sr. Minutos (ação, andamento, entregue) | `#3DD15A` | `#1F8F3B` |
| Âmbar, fora do prazo | `#E0A83A` | `#8A6414` |
| Rosa, bloqueado | `#F06A7E` | `#B62C4B` |

O azul sai. Tempo medido vira barra creme, previsto vira traço verde. Status continua
cor mais ícone mais texto.

Tipografia: **Barlow Condensed** (700/800) em títulos e números grandes, é o eco da
tipografia esportiva da CazéTV. **Archivo** continua na interface. **IBM Plex Mono**
continua no tempo.

**Não há guia de marca oficial da LiveMode nem da CazéTV aqui.** Os hexadecimais acima são
derivados dos assets do personagem e da leitura pública da identidade da CazéTV (verde vivo
sobre preto). Quando houver guia oficial, trocar.

## Decisões do Daniel (01/10/2026)

1. **Nome:** "Sr. Minutos", sempre. Nunca "Senhor".
2. **Férias:** pose regenerada sem o cigarro; a antiga saiu do repo.
3. **Bravo:** só no dock, pequeno. Em Minha semana, prazo vencido é etiqueta âmbar e ele segue
   apontando.
4. **Temas:** os dois ficam, Noite como padrão e Mostrador como alternativa, escolha da pessoa.
5. **Selo:** "Valeu cara" em toda entrega; o texto muda quando atrasou, a pose não.

6. **Fora e dentro (02/10):** corpo inteiro só fora das caixas, encostado nelas; dentro só o
   rosto, com a cor dizendo o estado.

Mockup atualizado com tudo isso na v3 do artefato (mesmo link acima).
