-- Versao 3: so gera tarefa para evento com entrega comercial confirmada ou prevista.
-- Evento com entrega indefinida fica esperando o lider decidir, e aparece no contador.
drop function if exists gerar_tarefas(date, date);

create function gerar_tarefas(p_inicio date, p_fim date)
returns table (criadas integer, ja_existiam integer, sem_escalado integer,
               aguardando_entrega integer, ignorados integer)
language plpgsql security definer set search_path = public as $$
declare
  v_criadas int; v_sem_escalado int; v_alvo int; v_aguardando int; v_ignorados int;
begin
  create temp table _cand on commit drop as
  with elegiveis as (
    select e.*
    from eventos e
    where e.data between p_inicio and p_fim
      and e.frente_id is not null
      and e.tipo = 'normal'
      and coalesce(e.status_origem, 'Confirmado') <> 'Cancelado'
      and e.entrega is true
  )
  select
    e.id as evento_id, e.frente_id, c.atividade,
    date_trunc('month', e.data)::date as competencia,
    case c.escalado_regra
      when 'lider' then (select lider_id from frentes f where f.id = e.frente_id)
      else m.pessoa_id
    end as escalado_id,
    private.taxa_min(c.atividade, e.data) as estimativa_min,
    coalesce(e.inicio_brt, (e.data + time '23:59')::timestamptz) + interval '48 hours' as prazo_em
  from elegiveis e
  join cadeia c
    on (c.competicao_id = e.competicao_id)
    or (c.competicao_id is null and c.frente_id = e.frente_id
        and not exists (select 1 from cadeia c2 where c2.competicao_id = e.competicao_id))
  left join mapa m
    on m.frente_id = e.frente_id and m.atividade = c.atividade
   and m.competencia = date_trunc('month', e.data)::date;

  select count(*) into v_alvo from _cand;

  with inseridas as (
    insert into tarefas (evento_id, frente_id, atividade, competencia, escalado_id, estimativa_min, prazo_em)
    select evento_id, frente_id, atividade, competencia, escalado_id, estimativa_min, prazo_em
    from _cand where escalado_id is not null and estimativa_min is not null
    on conflict (evento_id, atividade) do nothing
    returning 1
  )
  select count(*) into v_criadas from inseridas;

  select count(*) into v_sem_escalado from _cand where escalado_id is null or estimativa_min is null;

  select count(*) into v_aguardando
  from eventos e
  where e.data between p_inicio and p_fim and e.entrega is null
    and e.frente_id is not null and e.tipo = 'normal'
    and coalesce(e.status_origem,'Confirmado') <> 'Cancelado';

  select count(*) into v_ignorados
  from eventos e
  where e.data between p_inicio and p_fim
    and (e.frente_id is null or e.tipo <> 'normal'
         or coalesce(e.status_origem,'Confirmado') = 'Cancelado'
         or e.entrega is false);

  return query select v_criadas, v_alvo - v_criadas - v_sem_escalado, v_sem_escalado,
                      v_aguardando, v_ignorados;
end;
$$;

revoke all on function gerar_tarefas(date, date) from public, anon, authenticated;
