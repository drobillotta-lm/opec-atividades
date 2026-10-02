-- A reaplicar_mapa da 034 nao rodava: a coluna `sem_mapa` da CTE tinha o mesmo nome do
-- parametro de saida da funcao (42702, ambiguous). Mesma logica, colunas renomeadas.
create or replace function reaplicar_mapa(p_competencia date)
returns table (reescaladas integer, sem_mapa integer, divergentes_com_tempo integer)
language plpgsql security definer set search_path = public as $$
declare v_reesc int; v_sem int; v_div int;
begin
  with alvo as (
    select t.id, m.pessoa_id as novo_escalado, m.dupla_id as nova_dupla,
           m.id is null as falta_mapa,
           (t.escalado_id, t.dupla_id) is distinct from (m.pessoa_id, m.dupla_id) as diverge,
           (exists (select 1 from sessoes s       where s.tarefa_id = t.id)
            or exists (select 1 from ajustes_tempo a where a.tarefa_id = t.id)
            or exists (select 1 from subtarefas st   where st.tarefa_id = t.id)) as tem_tempo
    from tarefas t
    join eventos e on e.id = t.evento_id
    left join mapa m
      on m.frente_id = t.frente_id and m.atividade = t.atividade and m.competencia = t.competencia
    where t.competencia = p_competencia
      and t.status = 'pendente'
      and exists (select 1 from private.cadeia_vigente(t.frente_id, e.competicao_id, e.data) c
                  where c.atividade = t.atividade and c.escalado_regra = 'mapa')
  ),
  feitas as (
    update tarefas t
       set escalado_id = a.novo_escalado, dupla_id = a.nova_dupla
      from alvo a
     where a.id = t.id and not a.falta_mapa and a.diverge and not a.tem_tempo
    returning 1
  )
  select (select count(*) from feitas),
         (select count(*) from alvo a where a.falta_mapa),
         (select count(*) from alvo a where not a.falta_mapa and a.diverge and a.tem_tempo)
    into v_reesc, v_sem, v_div;

  return query select v_reesc, v_sem, v_div;
end;
$$;

revoke all on function reaplicar_mapa(date) from public, anon, authenticated;

-- Rodada fora da migration, via execute_sql:
--   select * from reaplicar_mapa('2026-10-01');
