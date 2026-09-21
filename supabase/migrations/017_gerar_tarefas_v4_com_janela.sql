-- Versao 4: grava a janela da atividade, e passa a receber a janela de TRABALHO,
-- nao a de eventos. Para cobrir uma semana de trabalho a funcao varre eventos de uma
-- faixa mais larga, porque materiais de um evento da semana que vem ja abre agora, e
-- auditoria de um evento da semana passada ainda esta aberta.
drop function if exists gerar_tarefas(date, date);

create function gerar_tarefas(p_inicio date, p_fim date)
returns table (criadas integer, ja_existiam integer, sem_escalado integer,
               aguardando_entrega integer, ignorados integer)
language plpgsql security definer set search_path = public as $$
declare
  v_criadas int; v_sem_escalado int; v_alvo int; v_aguardando int; v_ignorados int;
  v_de date; v_ate date;
begin
  -- Folga suficiente para cobrir o maior deslocamento em cada direcao.
  select p_inicio - coalesce(max(-abre_offset_dias), 0),
         p_fim    + coalesce(max(prazo_offset_dias), 0)
    into v_de, v_ate
  from cadeia;

  create temp table _cand on commit drop as
  with elegiveis as (
    select e.*
    from eventos e
    where e.data between v_de and v_ate
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
    (e.data + c.abre_offset_dias) as abre_em,
    ((e.data + c.prazo_offset_dias + 1)::timestamptz - interval '1 second') as prazo_em
  from elegiveis e
  join cadeia c
    on (c.competicao_id = e.competicao_id)
    or (c.competicao_id is null and c.frente_id = e.frente_id
        and not exists (select 1 from cadeia c2 where c2.competicao_id = e.competicao_id))
  left join mapa m
    on m.frente_id = e.frente_id and m.atividade = c.atividade
   and m.competencia = date_trunc('month', e.data)::date;

  -- So interessa o que de fato cai na janela de trabalho pedida.
  delete from _cand where abre_em > p_fim or prazo_em < p_inicio::timestamptz;

  select count(*) into v_alvo from _cand;

  with inseridas as (
    insert into tarefas (evento_id, frente_id, atividade, competencia, escalado_id,
                         estimativa_min, abre_em, prazo_em)
    select evento_id, frente_id, atividade, competencia, escalado_id,
           estimativa_min, abre_em, prazo_em
    from _cand where escalado_id is not null and estimativa_min is not null
    on conflict (evento_id, atividade) do nothing
    returning 1
  )
  select count(*) into v_criadas from inseridas;

  select count(*) into v_sem_escalado from _cand where escalado_id is null or estimativa_min is null;

  select count(*) into v_aguardando
  from eventos e
  where e.data between v_de and v_ate and e.entrega is null
    and e.frente_id is not null and e.tipo = 'normal'
    and coalesce(e.status_origem,'Confirmado') <> 'Cancelado';

  select count(*) into v_ignorados
  from eventos e
  where e.data between v_de and v_ate
    and (e.frente_id is null or e.tipo <> 'normal'
         or coalesce(e.status_origem,'Confirmado') = 'Cancelado'
         or e.entrega is false);

  return query select v_criadas, v_alvo - v_criadas - v_sem_escalado, v_sem_escalado,
                      v_aguardando, v_ignorados;
end;
$$;

revoke all on function gerar_tarefas(date, date) from public, anon, authenticated;
