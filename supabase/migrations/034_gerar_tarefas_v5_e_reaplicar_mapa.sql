-- Versao 5: diff minimo sobre a 017. A cadeia vem de private.cadeia_vigente (vigencia
-- pela data do evento, competicao vence frente), e a tarefa carrega a dupla do mapa.
create or replace function gerar_tarefas(p_inicio date, p_fim date)
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
    case c.escalado_regra when 'lider' then null else m.dupla_id end as dupla_id,
    private.taxa_min(c.atividade, e.data) as estimativa_min,
    (e.data + c.abre_offset_dias) as abre_em,
    ((e.data + c.prazo_offset_dias + 1)::timestamptz - interval '1 second') as prazo_em
  from elegiveis e
  cross join lateral private.cadeia_vigente(e.frente_id, e.competicao_id, e.data) c
  left join mapa m
    on m.frente_id = e.frente_id and m.atividade = c.atividade
   and m.competencia = date_trunc('month', e.data)::date;

  -- So interessa o que de fato cai na janela de trabalho pedida.
  delete from _cand where abre_em > p_fim or prazo_em < p_inicio::timestamptz;

  select count(*) into v_alvo from _cand;

  with inseridas as (
    insert into tarefas (evento_id, frente_id, atividade, competencia, escalado_id, dupla_id,
                         estimativa_min, abre_em, prazo_em)
    select evento_id, frente_id, atividade, competencia, escalado_id, dupla_id,
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

-- Tarefa pendente cuja atividade saiu da cadeia vigente na data do evento (ex.: a
-- sincronizacao de um jogo de outubro, depois da 032). Mesma seguranca da 028: sem
-- sessao, ajuste nem sub-tarefa, some; com tempo, vira 'na' com excecao 'fora_da_cadeia'.
-- So olha do mes corrente pra frente: mes que ja passou e historico.
-- Sem temp table: pode ser chamada mais de uma vez na mesma transacao.
create or replace function desfazer_tarefas_fora_da_cadeia()
returns table (apagadas integer, marcadas_na integer)
language plpgsql security definer set search_path = public as $$
declare v_apagadas int; v_na int;
begin
  with apagadas as (
    delete from tarefas t
    using eventos e
    where e.id = t.evento_id
      and t.status = 'pendente'
      and t.competencia >= date_trunc('month', current_date)::date
      and not exists (select 1 from private.cadeia_vigente(t.frente_id, e.competicao_id, e.data) c
                      where c.atividade = t.atividade)
      and not exists (select 1 from sessoes s       where s.tarefa_id = t.id)
      and not exists (select 1 from ajustes_tempo a where a.tarefa_id = t.id)
      and not exists (select 1 from subtarefas st   where st.tarefa_id = t.id)
    returning 1
  )
  select count(*) into v_apagadas from apagadas;

  update tarefas t
     set status = 'na', excecao = 'fora_da_cadeia',
         excecao_desc = 'atividade saiu da cadeia vigente na data do evento', concluida_em = now()
    from eventos e
   where e.id = t.evento_id
     and t.status = 'pendente'
     and t.competencia >= date_trunc('month', current_date)::date
     and not exists (select 1 from private.cadeia_vigente(t.frente_id, e.competicao_id, e.data) c
                     where c.atividade = t.atividade);
  get diagnostics v_na = row_count;

  return query select v_apagadas, v_na;
end;
$$;

revoke all on function desfazer_tarefas_fora_da_cadeia() from public, anon, authenticated;

-- Alinha escalado e dupla das pendentes de um mes ao mapa atual, so em elo da cadeia que
-- segue o mapa (nao no compacto, que e do lider). Tarefa com tempo nao muda de dono:
-- entra na contagem de divergentes, pra alguem olhar.
create or replace function reaplicar_mapa(p_competencia date)
returns table (reescaladas integer, sem_mapa integer, divergentes_com_tempo integer)
language plpgsql security definer set search_path = public as $$
declare v_reesc int; v_sem int; v_div int;
begin
  with alvo as (
    select t.id, m.pessoa_id, m.dupla_id,
           m.id is null as sem_mapa,
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
       set escalado_id = a.pessoa_id, dupla_id = a.dupla_id
      from alvo a
     where a.id = t.id and not a.sem_mapa and a.diverge and not a.tem_tempo
    returning 1
  )
  select (select count(*) from feitas),
         (select count(*) from alvo where sem_mapa),
         (select count(*) from alvo where not sem_mapa and diverge and tem_tempo)
    into v_reesc, v_sem, v_div;

  return query select v_reesc, v_sem, v_div;
end;
$$;

revoke all on function reaplicar_mapa(date) from public, anon, authenticated;
