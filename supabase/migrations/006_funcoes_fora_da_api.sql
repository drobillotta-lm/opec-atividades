-- As funcoes auxiliares estavam em `public`, que o PostgREST expoe: davam endpoint /rpc/.
-- Vao pra um schema privado, que a API nao enxerga. As policies continuam podendo chama-las.
create schema if not exists private;
grant usage on schema private to authenticated, service_role;

create or replace function private.eu() returns uuid
language sql stable security definer set search_path = public as $$
  select id from pessoas where auth_user_id = auth.uid()
$$;

create or replace function private.meu_papel() returns text
language sql stable security definer set search_path = public as $$
  select papel from pessoas where auth_user_id = auth.uid()
$$;

create or replace function private.sou_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.meu_papel() = 'gestor', false)
$$;

create or replace function private.lidero(f uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from frentes where id = f and lider_id = private.eu())
$$;

create or replace function private.liga_conta() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update pessoas
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null;
  return new;
end;
$$;

create or replace function private.set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop policy le_pessoas             on pessoas;
drop policy le_frentes             on frentes;
drop policy le_mapa                on mapa;
drop policy le_eventos             on eventos;
drop policy gestor_escreve_pessoas on pessoas;
drop policy gestor_escreve_frentes on frentes;
drop policy le_tarefas             on tarefas;
drop policy escreve_tarefas        on tarefas;
drop policy le_sessoes             on sessoes;
drop policy minhas_sessoes         on sessoes;
drop policy le_ajustes             on ajustes_tempo;
drop policy meus_ajustes           on ajustes_tempo;
drop policy le_plantoes            on plantoes;

create policy le_pessoas on pessoas for select to authenticated using (private.eu() is not null);
create policy le_frentes on frentes for select to authenticated using (private.eu() is not null);
create policy le_mapa    on mapa    for select to authenticated using (private.eu() is not null);
create policy le_eventos on eventos for select to authenticated using (private.eu() is not null);

create policy gestor_escreve_pessoas on pessoas for all to authenticated
  using (private.sou_gestor()) with check (private.sou_gestor());
create policy gestor_escreve_frentes on frentes for all to authenticated
  using (private.sou_gestor()) with check (private.sou_gestor());

create policy le_tarefas on tarefas for select to authenticated using (
  escalado_id = private.eu() or responsavel_real_id = private.eu()
  or private.lidero(frente_id) or private.sou_gestor()
);
create policy escreve_tarefas on tarefas for update to authenticated using (
  escalado_id = private.eu() or responsavel_real_id = private.eu()
  or private.lidero(frente_id) or private.sou_gestor()
) with check (
  escalado_id = private.eu() or responsavel_real_id = private.eu()
  or private.lidero(frente_id) or private.sou_gestor()
);

create policy le_sessoes on sessoes for select to authenticated using (
  pessoa_id = private.eu() or private.sou_gestor()
  or exists (select 1 from tarefas t where t.id = sessoes.tarefa_id and private.lidero(t.frente_id))
);
create policy minhas_sessoes on sessoes for all to authenticated
  using (pessoa_id = private.eu()) with check (pessoa_id = private.eu());

create policy le_ajustes on ajustes_tempo for select to authenticated using (
  pessoa_id = private.eu() or private.sou_gestor()
  or exists (select 1 from tarefas t where t.id = ajustes_tempo.tarefa_id and private.lidero(t.frente_id))
);
create policy meus_ajustes on ajustes_tempo for all to authenticated
  using (pessoa_id = private.eu()) with check (pessoa_id = private.eu());

create policy le_plantoes on plantoes for select to authenticated using (
  pessoa_id = private.eu() or private.sou_gestor() or private.meu_papel() = 'lider'
);

drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.liga_conta();

do $$
declare t text;
begin
  foreach t in array array['pessoas','frentes','mapa','eventos','tarefas','sessoes','ajustes_tempo','plantoes'] loop
    execute format('drop trigger %I_set_updated_at on %I', t, t);
    execute format('create trigger %I_set_updated_at before update on %I for each row execute function private.set_updated_at()', t, t);
  end loop;
end $$;

drop function public.liga_conta();
drop function public.lidero(uuid);
drop function public.sou_gestor();
drop function public.meu_papel();
drop function public.eu();
drop function public.set_updated_at();
