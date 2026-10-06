# Aplicar a migration 044 (06/10/2026)

O site já está no ar com o código novo, mas o banco ainda não tem a `044`. Sem ela:
cronômetros paralelos não funcionam (o banco ainda recusa a segunda sessão), e no notch
"Entregar" e "Pausar por tarefa" caem no comportamento antigo.

**Como aplicar (2 minutos):**

1. Abra o SQL Editor do projeto: https://supabase.com/dashboard/project/igzrrsqmweuritiqrmrh/sql/new
2. Cole o conteúdo inteiro de `supabase/migrations/044_varios_cronometros_e_notch_entrega.sql`.
3. Run. Deve terminar sem erro ("Success. No rows returned").
4. Conferir: `select indexname from pg_indexes where tablename = 'sessoes';` deve mostrar
   `sessoes_uma_aberta_por_pessoa_e_tarefa`.

Depois disso, apague este arquivo.
