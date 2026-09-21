-- NOTA: as funcoes auxiliares nascem em `public` aqui e sao movidas para o schema
-- `private` na migration 006, porque `public` e exposto pela API REST. Esta migration
-- fica como foi aplicada; o estado final e o da 006.

create or replace function eu() returns uuid
language sql stable security definer set search_path = public as $$
  select id from pessoas where auth_user_id = auth.uid()
$$;

create or replace function meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from pessoas where auth_user_id = auth.uid()
$$;

create or replace function sou_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(meu_papel() = 'gestor', false)
$$;

create or replace function lidero(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from frentes where id = f and lider_id = eu())
$$;

alter table pessoas       enable row level security;
alter table frentes       enable row level security;
alter table mapa          enable row level security;
alter table eventos       enable row level security;
alter table tarefas       enable row level security;
alter table sessoes       enable row level security;
alter table ajustes_tempo enable row level security;
alter table plantoes      enable row level security;

create policy le_pessoas  on pessoas  for select to authenticated using (eu() is not null);
create policy le_frentes  on frentes  for select to authenticated using (eu() is not null);
create policy le_mapa     on mapa     for select to authenticated using (eu() is not null);
create policy le_eventos  on eventos  for select to authenticated using (eu() is not null);

create policy gestor_escreve_pessoas on pessoas for all to authenticated
  using (sou_gestor()) with check (sou_gestor());
create policy gestor_escreve_frentes on frentes for all to authenticated
  using (sou_gestor()) with check (sou_gestor());

-- mapa, eventos e plantoes so entram por importacao, que roda com service role
-- (a service role ignora RLS). Nenhuma policy de escrita aqui e proposital.

create policy le_tarefas on tarefas for select to authenticated using (
  escalado_id = eu() or responsavel_real_id = eu() or lidero(frente_id) or sou_gestor()
);
create policy escreve_tarefas on tarefas for update to authenticated using (
  escalado_id = eu() or responsavel_real_id = eu() or lidero(frente_id) or sou_gestor()
) with check (
  escalado_id = eu() or responsavel_real_id = eu() or lidero(frente_id) or sou_gestor()
);

create policy le_sessoes on sessoes for select to authenticated using (
  pessoa_id = eu() or sou_gestor()
  or exists (select 1 from tarefas t where t.id = sessoes.tarefa_id and lidero(t.frente_id))
);
create policy minhas_sessoes on sessoes for all to authenticated
  using (pessoa_id = eu()) with check (pessoa_id = eu());

create policy le_ajustes on ajustes_tempo for select to authenticated using (
  pessoa_id = eu() or sou_gestor()
  or exists (select 1 from tarefas t where t.id = ajustes_tempo.tarefa_id and lidero(t.frente_id))
);
create policy meus_ajustes on ajustes_tempo for all to authenticated
  using (pessoa_id = eu()) with check (pessoa_id = eu());

create policy le_plantoes on plantoes for select to authenticated using (
  pessoa_id = eu() or sou_gestor() or meu_papel() = 'lider'
);

-- Primeiro login: liga a conta Google a pessoa que ja existe. Nunca cria pessoa.
create or replace function liga_conta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update pessoas
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function liga_conta();
