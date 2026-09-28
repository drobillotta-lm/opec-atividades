# Plano

Fatias pequenas e independentes, não semanas de calendário. O Daniel coda com o Claude Code
em sessões, então cada fatia precisa caber numa sessão e terminar em algo que funciona.

## Fase 0 — fundação

- [x] Ler o dimensionamento e extrair o domínio real
- [x] Telas aprovadas no mockup
- [x] Repositório, documentação e GitHub Project
- [x] Projeto Supabase (`igzrrsqmweuritiqrmrh`) e projeto Vercel, no ar
- [x] Credenciais do Google OAuth

**Pronta quando** o repositório existe com a documentação, as issues estão no Project, e um
deploy vazio sobe na Vercel falando com o Supabase.

## Fase 1 — entrar e executar

1. [x] Scaffold Next.js com TypeScript e Tailwind, deploy vazio na Vercel
2. [x] Migrations das tabelas, views e RLS conforme `02-modelo-dados.md`
3. [x] Login com Google restrito ao domínio, mais a tela de fora do time
4. [x] Semear pessoas e frentes a partir do dimensionamento
5. [x] Importar o mapa aprovado de uma competência — setembro/2026, 18 linhas
6. [x] Importar eventos e gerar as tarefas da semana — pela **janela** da atividade e só
   para evento com entrega comercial, não mais "evento + 48h" para todos
7. [x] Minha semana: pendentes e entregues prontos; plantão em leitura, importado da
   Escala 2x/dia (`021`, `src/app/api/importar-escala`)
8. [x] Cronômetro: iniciar, pausar, entregar, trocar; uma sessão aberta por pessoa
9. [x] Retomar sessão ao reabrir a aba — a sessão vive no banco, a tela volta rodando
10. [x] Ajuste manual de tempo com motivo: na entrega e avulso (24/09), sempre separado
    do que o cronômetro mediu
11. [x] Entregar informando quem fez de verdade, e "atividade desnecessária" (exceção) —
    o status `na` e os campos `excecao`/`excecao_desc` já existiam desde a `002`/`003`,
    só faltava o botão
12. [x] Buscar e ajudar tarefa de outra pessoa, por evento ou por nome (`022` abre a
    leitura); "puxar" e "fazer em conjunto" são o mesmo botão — iniciar uma sessão, que
    nunca checou dono da tarefa

**Pronta quando** o Daniel passa dois dias reais registrando as tarefas de Nacional sem
perder nada.

## Fase 2 — o dock

13. [x] Janela flutuante com a tarefa atual, barra contra a taxa, pausar e entregar.
    Era Document Picture-in-Picture (sempre por cima); virou `window.open` comum em
    23/09 porque a PiP fecha junto com a aba de origem — sem contorno, é regra da API
14. [ ] Atalhos de teclado para mostrar e para pausar
15. [ ] Posição lembrada entre sessões — agora dá pra passar `left`/`top` pro
    `window.open`, só falta guardar a posição de quando a pessoa arrasta a janela
15b. [ ] Subdividir uma atividade em partes menores, pra quem quiser se organizar assim
    (pedido de 28/09, forma a detalhar)

**Pronta quando** dá para trabalhar um dia inteiro sem abrir o app inteiro.

## Fase 3 — liderar

16. [x] Tela da frente: a semana inteira, escalado ao lado de quem fez. Gestor vê todas as
    frentes, líder vê a sua
17. [x] Preencher quem fez direto na linha, e marcar se o evento tem entrega
18. ~~Fechar a semana~~ — **não existe mais** (decisão de 28/09: a tarefa vive com o
    evento, nada abre nem fecha). Vira o item 20
19. [~] Painel do mês: `v_mes_pessoa` e `v_taxa_real` na tela, por mês com navegação
    (28/09). Falta o corte por frente
20. [ ] Relatório de período, sob demanda, com os mesmos números do `fechar_semana.py`, e
    exportar CSV no formato de `acompanhamento/registro/` — sem travar nada
20b. [ ] Ler a Escala direto (eventos, entrega, plantão, líderes, competição × frente) em
    vez da exportação HTTP 2x/dia — decisão de 28/09, forma em `05-onde-paramos.md`
21. [x] Admin: classificar competição sem frente (ou criar frente nova na hora, `025`
    tirou a sigla de lista fechada) e ver a entrega por evento (`/admin/eventos`) — a
    decisão de "tem entrega?" virou leitura aqui, quem decide é o líder na Escala (23/09).
    Falta mostrar de que versão do mapa a importação veio, e pessoas ainda é leitura
22. [x] Quadro (`/kanban`): pendente / fazendo / feita, por frente que o líder lidera ou
    todas pro gestor — visão que nem `/frente` (tabela) nem `/painel` (números do mês) dão

**Pronta quando** a Bárbara puxa o relatório de uma semana de Programas no app, e o CSV
bate com o que o script geraria.

## Fase 4 — piloto

23. Entrar as 7 pessoas — os e-mails reais só entraram em 28/09 (`027`); antes disso
    ninguém além do Daniel conseguiria
24. Página explicando o que o líder vê e o que ninguém vê
25. Duas semanas de uso real
26. Comparar o fechamento do app com o do script, semana a semana

**Pronta quando** pelo menos 5 das 7 pessoas continuam registrando na segunda semana sem
ninguém cobrar, e o fechamento do app bate com o do script.

## Depois

- Devolver a taxa medida para o dimensionamento, como proposta de ajuste em `taxas.yaml`
- Instalar como PWA no celular
- Dock nativo em Tauri, se a janela do navegador não bastar
