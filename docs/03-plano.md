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
10. [~] Ajuste manual de tempo com motivo: a ação existe e a entrega já grava a diferença
    como ajuste; falta a entrada avulsa na tela de tarefa
11. [~] Entregar informando quem fez de verdade: pronto. **Exceção ainda não tem campo**

**Pronta quando** o Daniel passa dois dias reais registrando as tarefas de Nacional sem
perder nada.

## Fase 2 — o dock

12. [x] Janela Picture-in-Picture com a tarefa atual, barra contra a taxa, pausar e entregar
13. [ ] Atalhos de teclado para mostrar e para pausar
14. [ ] Posição lembrada entre sessões — a API de PiP não deixa posicionar por código;
    o que dá é o atalho de desktop do `instalar.ps1`, que abre o dock em janela própria

**Pronta quando** dá para trabalhar um dia inteiro sem abrir o app inteiro.

## Fase 3 — liderar

15. [x] Tela da frente: a semana inteira, escalado ao lado de quem fez. Gestor vê todas as
    frentes, líder vê a sua
16. [x] Preencher quem fez direto na linha, e marcar se o evento tem entrega
17. [ ] Fechar a semana, com os mesmos números do `fechar_semana.py`
18. [~] Painel do mês: `v_mes_pessoa` e `v_taxa_real` na tela, competência ainda fixa em
    setembro/2026 no código. Falta o corte por frente
19. [ ] Exportar CSV no formato de `acompanhamento/registro/`
20. [x] Admin: classificar competição sem frente e resolver entrega indefinida, ambos
    editáveis (`/admin/eventos` é a gestão por evento: entrega + tarefas + responsáveis).
    Falta mostrar de que versão do mapa a importação veio, e pessoas/frentes ainda é leitura

**Pronta quando** a Bárbara fecha uma semana de Programas no app em vez do CSV, e os números
batem com o que o script geraria.

## Fase 4 — piloto

21. Entrar as 7 pessoas
22. Página explicando o que o líder vê e o que ninguém vê
23. Duas semanas de uso real
24. Comparar o fechamento do app com o do script, semana a semana

**Pronta quando** pelo menos 5 das 7 pessoas continuam registrando na segunda semana sem
ninguém cobrar, e o fechamento do app bate com o do script.

## Depois

- Devolver a taxa medida para o dimensionamento, como proposta de ajuste em `taxas.yaml`
- Instalar como PWA no celular
- Dock nativo em Tauri, se a janela do navegador não bastar
