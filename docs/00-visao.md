# Visão do produto

## Em uma frase

Cada pessoa da OPEC vê as tarefas que o mapa do mês deu a ela, registra o que executou e
quanto tempo levou; o líder da frente compara planejado com executado.

## O problema, com nome

O modelo de dimensionamento já responde "o time dá conta?". Ele projeta horas a partir de
taxas medidas em campo e propõe quem faz o quê. O que ele não sabe é o que aconteceu depois.

Isso hoje é preenchido à mão. Os arquivos `acompanhamento/registro/<frente>_sem_<data>.csv`
nascem gerados, com a coluna `escalado` vinda do mapa, e a coluna `responsavel_real` vazia.
Preencher essa coluna é trabalho manual do líder de cada frente, toda semana.

Três perguntas ficam sem resposta confiável:

1. O que foi planejado foi mesmo executado?
2. A taxa de cada tarefa ainda vale? As de hoje foram medidas uma única vez, em julho de 2026.
3. A divisão entre as pessoas está adequada?

## O que o app faz

**Para quem executa.** Abre e vê as tarefas da semana, já atribuídas pelo mapa. Inicia o
cronômetro, pausa, entrega. Se cobriu alguém, diz quem fez de verdade.

**Para quem lidera.** Vê a semana inteira da frente numa tela, com quem foi escalado e quem
executou lado a lado. Fecha a semana num clique em vez de editar CSV.

**Para quem gere a área.** Vê o mês por pessoa e por frente: horas medidas contra horas
previstas, entregas fora do prazo, desvios de escala e exceções.

## O dock

O app precisa viver aberto o dia inteiro sem atrapalhar. Recolhido é um ponto e um relógio,
quase invisível num canto da tela. No hover, expande e mostra a tarefa atual, o tempo contra
a taxa, pausar e entregar. Um atalho traz ele de volta de qualquer lugar.

## O que ele não faz

- **Não decide alocação.** O mapa vem de `config/mapa_aprovado.csv`, decisão do Yuri.
- **Não escala plantão.** Isso é do app de Escala. Aqui plantão é leitura, para as horas fecharem.
- **Não vigia ninguém.** Sem captura de tela, sem registro de teclado, sem rastreio de programa
  ou de navegação, sem detecção de inatividade. Em nenhuma fase.
- **Não vira ranking.** Horas aparecem com contexto: prazo, bloqueio, exceção.

## Princípio de leitura dos números

Uma pessoa acima da taxa não é uma pessoa lenta: é uma taxa provavelmente errada. A taxa foi
medida uma vez, numa semana de julho. Se o app mostrar auditoria levando 2h18 durante dois
meses, quem muda é a taxa no modelo.
