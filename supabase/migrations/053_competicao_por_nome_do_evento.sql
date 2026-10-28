-- 053: evento sem competição que pertence a uma competição conhecida pelo nome (28/10/2026).
-- A Matriz manda "Quadra Aberta ep 10 (Gravação)" sem competição; a sync gravava competicao=''
-- e o evento caía em Outros (049), com tarefas no Daniel. O Daniel quer que chegue já como
-- Olímpicos. Regra por nome: padrão ILIKE sobre eventos.evento_id_origem → competição. A sync
-- aplica a regra logo depois do upsert dos eventos (que zera competicao_id de novo a cada hora,
-- porque a Escala não tem a competição) e antes de herdar frente / encaixar em Outros. O evento
-- ganha competicao_id, o nome da competição e a frente dela (se estava sem frente ou em Outros);
-- as tarefas pendentes seguem pela mover_tarefas_da_competicao (052). Padrão mais longo vence.

create table competicao_por_nome (
  id            uuid primary key default gen_random_uuid(),
  padrao        text not null unique,                       -- ILIKE sobre eventos.evento_id_origem
  competicao_id uuid not null references competicoes(id),
  ativa         boolean not null default true,
  obs           text,
  created_at    timestamptz not null default now()
);
alter table competicao_por_nome enable row level security;
create policy competicao_por_nome_leitura on competicao_por_nome for select to authenticated using (true);

create or replace function encaixar_competicao_por_nome()
returns table (eventos integer, tarefas_movidas integer)
language plpgsql security definer set search_path = public as $$
declare v_eventos int := 0; v_tarefas int := 0; v_n int; v_comp uuid; v_comps uuid[];
begin
  with regras as (
    select r.padrao, c.id as competicao_id, c.nome, c.frente_id
    from competicao_por_nome r
    join competicoes c on c.id = r.competicao_id
    where r.ativa and c.ativa
  ),
  alvo as (
    select e.id as evento_id, rg.competicao_id, rg.nome, rg.frente_id
    from eventos e
    cross join lateral (select * from regras rg
                        where e.evento_id_origem ilike rg.padrao
                        order by length(rg.padrao) desc limit 1) rg
    where e.competicao_id is null
  ),
  feitos as (
    update eventos e
       set competicao_id = a.competicao_id,
           competicao    = a.nome,
           frente_id     = case when e.frente_id is null
                                  or e.frente_id = (select f.id from frentes f where f.sigla = 'OTRS')
                                then coalesce(a.frente_id, e.frente_id)
                                else e.frente_id end
      from alvo a
     where a.evento_id = e.id
    returning a.competicao_id
  )
  select count(*), array_agg(distinct competicao_id) into v_eventos, v_comps from feitos;

  foreach v_comp in array coalesce(v_comps, '{}'::uuid[]) loop
    select coalesce(m.realinhadas, 0) + coalesce(m.so_frente, 0) + coalesce(m.fora_da_cadeia, 0)
      into v_n
      from mover_tarefas_da_competicao(v_comp) m;
    v_tarefas := v_tarefas + coalesce(v_n, 0);
  end loop;

  return query select v_eventos, v_tarefas;
end;
$$;
revoke all on function encaixar_competicao_por_nome() from public, anon, authenticated;

insert into competicao_por_nome (padrao, competicao_id, obs)
select '%quadra aberta%', c.id,
       'Episódios e gravações chegam da Matriz sem competição; são Olímpicos (Daniel, 28/10)'
  from competicoes c
 where c.nome = 'Programa Podcast Quadra Aberta 2026'
on conflict (padrao) do nothing;

select * from encaixar_competicao_por_nome();
