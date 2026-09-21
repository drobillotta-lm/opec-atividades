# Plano

Fatias pequenas e independentes, não semanas de calendário. O Daniel coda com o Claude Code
em sessões, então cada fatia precisa caber numa sessão e terminar em algo que funciona.

## Fase 0 — fundação

- [x] Ler o dimensionamento e extrair o domínio real
- [x] Telas aprovadas no mockup
- [x] Repositório, documentação e GitHub Project
- [ ] Projeto Supabase e projeto Vercel
- [ ] Credenciais do Google OAuth

**Pronta quando** o repositório existe com a documentação, as issues estão no Project, e um
deploy vazio sobe na Vercel falando com o Supabase.

## Fase 1 — entrar e executar

1. Scaffold Next.js com TypeScript e Tailwind, deploy vazio na Vercel
2. Migrations das tabelas, views e RLS conforme `02-modelo-dados.md`
3. Login com Google restrito ao domínio, mais a tela de fora do time
4. Semear pessoas e frentes a partir do dimensionamento
5. Importar o mapa aprovado de uma competência
6. Importar eventos e gerar as tarefas da semana, com estimativa pela taxa e prazo de 48h
7. Minha semana: pendentes, entregues, plantão em leitura
8. Cronômetro: iniciar, pausar, entregar, trocar; uma sessão aberta por pessoa
9. Retomar sessão ao reabrir a aba
10. Ajuste manual de tempo com motivo
11. Entregar informando quem fez de verdade e se houve exceção

**Pronta quando** o Daniel passa dois dias reais registrando as tarefas de Nacional sem
perder nada.

## Fase 2 — o dock

12. Janela Picture-in-Picture com os três estados do mockup
13. Atalhos de teclado para mostrar e para pausar
14. Posição lembrada entre sessões

**Pronta quando** dá para trabalhar um dia inteiro sem abrir o app inteiro.

## Fase 3 — liderar

15. Tela da frente: a semana inteira, escalado ao lado de quem fez
16. Preencher quem fez direto na linha
17. Fechar a semana, com os mesmos números do `fechar_semana.py`
18. Painel do mês: horas medidas contra previstas, por pessoa e por frente
19. Exportar CSV no formato de `acompanhamento/registro/`
20. Tela de admin: pessoas, frentes, de onde veio o mapa

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

- Importar o plantão da Escala automaticamente
- Devolver a taxa medida para o dimensionamento, como proposta de ajuste em `taxas.yaml`
- Instalar como PWA no celular
- Dock nativo em Tauri, se a janela do navegador não bastar
