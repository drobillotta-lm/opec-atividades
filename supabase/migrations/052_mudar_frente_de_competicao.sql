-- 052: mudar a frente de uma competição já classificada (27/10/2026).
-- Caso: "Programa Podcast Quadra Aberta 2026" estava em Programas e é de Olímpicos. Trocar o
-- frente_id da competição já levava os eventos junto (trigger da 013), mas as tarefas pendentes
-- ficavam na frente velha, com as pessoas velhas: desfazer_tarefas_fora_da_cadeia e
-- reaplicar_mapa olham t.frente_id, e gerar_tarefas não recria por causa do unique
-- (evento_id, atividade). mover_tarefas_da_competicao realinha as tarefas pendentes de cadeia
-- dos eventos da competição à frente que o evento tem agora:
--   sem tempo lançado: frente, escalado/dupla (mapa ou líder), estimativa, abre_em e prazo_em
--     recalculados como o gerar_tarefas faria na frente nova (dono_manual preserva a pessoa);
--   com tempo (sessão, ajuste ou parte): só a frente muda, quem já trabalhou continua dono;
--   atividade que a cadeia da frente nova não tem: vira 'na' (fora_da_cadeia). Nada é apagado.
-- Quem chama roda gerar_tarefas em seguida, para as atividades que só existem na cadeia nova.
-- Sem tabela temporária: o conjunto a mover é recomputado a cada passo (private.tarefas_a_mover),
-- e cada passo tira as suas linhas do conjunto ao gravar frente_id.

create or replace function private.tarefas_a_mover(p_competicao uuid)
returns table (tarefa_id uuid, frente_nova uuid, competicao_id uuid, data date, inicio_brt timestamptz,
               atividade text, competencia date, dono_manual boolean, tem_tempo boolean)
language sql stable security definer set search_path = public as $$
  select t.id, e.frente_id, e.competicao_id, e.data, e.inicio_brt,
         t.atividade, t.competencia, t.dono_manual,
         (exists (select 1 from sessoes s       where s.tarefa_id = t.id)
          or exists (select 1 from ajustes_tempo a where a.tarefa_id = t.id)
          or exists (select 1 from subtarefas st   where st.tarefa_id = t.id))
  from tarefas t
  join eventos e on e.id = t.evento_id
  where e.competicao_id = p_competicao
    and e.frente_id is not null
    and t.status = 'pendente' and t.origem = 'cadeia'
    and t.frente_id is distinct from e.frente_id
$$;
revoke all on function private.tarefas_a_mover(uuid) from public, anon, authenticated;

create or replace function mover_tarefas_da_competicao(p_competicao uuid)
returns table (realinhadas integer, so_frente integer, fora_da_cadeia integer)
language plpgsql security definer set search_path = public as $$
declare v_realinhadas int; v_so_frente int; v_fora int;
begin
  -- 1) sem tempo: recalcula tudo pela cadeia da frente nova
  with calc as (
    select m.tarefa_id, m.frente_nova, m.dono_manual,
           case c.escalado_regra
             when 'lider' then (select f.lider_id from frentes f where f.id = m.frente_nova)
             else mp.pessoa_id
           end as escalado_id,
           case c.escalado_regra when 'lider' then null else mp.dupla_id end as dupla_id,
           coalesce(c.taxa_min, private.taxa_min(c.atividade, m.data)) as estimativa_min,
           (m.data + c.abre_offset_dias) as abre_em,
           private.prazo_da_cadeia(m.data, m.inicio_brt, c.prazo_offset_dias, c.prazo_horas_antes) as prazo_em
    from private.tarefas_a_mover(p_competicao) m
    cross join lateral private.cadeia_vigente(m.frente_nova, m.competicao_id, m.data) c
    left join mapa mp on mp.frente_id = m.frente_nova and mp.atividade = c.atividade and mp.competencia = m.competencia
    where c.atividade = m.atividade and not m.tem_tempo
  ),
  feitas as (
    update tarefas t
       set frente_id      = k.frente_nova,
           escalado_id    = case when k.dono_manual then t.escalado_id else coalesce(k.escalado_id, t.escalado_id) end,
           dupla_id       = case when k.dono_manual then t.dupla_id
                                 when k.escalado_id is null then t.dupla_id
                                 else k.dupla_id end,
           estimativa_min = coalesce(k.estimativa_min, t.estimativa_min),
           abre_em        = k.abre_em,
           prazo_em       = k.prazo_em
      from calc k
     where k.tarefa_id = t.id
    returning 1
  )
  select count(*) into v_realinhadas from feitas;

  -- 2) com tempo: só a frente muda
  with feitas as (
    update tarefas t
       set frente_id = m.frente_nova
      from private.tarefas_a_mover(p_competicao) m
     where m.tarefa_id = t.id and m.tem_tempo
       and exists (select 1 from private.cadeia_vigente(m.frente_nova, m.competicao_id, m.data) c
                   where c.atividade = m.atividade)
    returning 1
  )
  select count(*) into v_so_frente from feitas;

  -- 3) atividade que a cadeia nova não tem
  update tarefas t
     set frente_id = m.frente_nova, status = 'na', excecao = 'fora_da_cadeia',
         excecao_desc = 'competição mudou de frente e a cadeia nova não tem esta atividade',
         concluida_em = now()
    from private.tarefas_a_mover(p_competicao) m
   where m.tarefa_id = t.id
     and not exists (select 1 from private.cadeia_vigente(m.frente_nova, m.competicao_id, m.data) c
                     where c.atividade = m.atividade);
  get diagnostics v_fora = row_count;

  return query select v_realinhadas, v_so_frente, v_fora;
end;
$$;
revoke all on function mover_tarefas_da_competicao(uuid) from public, anon, authenticated;
