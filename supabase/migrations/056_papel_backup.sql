-- 056 — papel backup_leitor para o backup diário (.github/workflows/backup.yml)
-- 18/11/2026, aplicada pelo MCP como postgres. A senha NÃO está aqui: foi definida por
-- verificador SCRAM e mora só no secret BACKUP_DATABASE_URL do GitHub.
-- Para trocar: gerar nova senha, atualizar o secret e "alter role backup_leitor password '...'".

create role backup_leitor login bypassrls;   -- password: definida à parte
alter role backup_leitor set default_transaction_read_only = on;
grant usage on schema public, auth to backup_leitor;
grant select on all tables in schema public to backup_leitor;
grant select on all sequences in schema public to backup_leitor;
grant select on auth.users, auth.identities to backup_leitor;
alter default privileges for role postgres in schema public grant select on tables to backup_leitor;
alter default privileges for role postgres in schema public grant select on sequences to backup_leitor;
