-- Funcoes da tela /admin/organizar (so gestor). Todas security definer, sem execute pra
-- authenticated: a server action checa o papel e chama com a service role.

-- Tarefa mexida a mao nao pode ser desfeita pela sincronizacao de hora em hora:
--   dono_manual  -> reaplicar_mapa nao devolve o dono do mapa;
--   origem avulsa -> fora-da-cadeia e sem-entrega nao apagam (alguem criou de proposito).
alter table tarefas add column dono_manual boolean not null default false;
alter table tarefas add column origem text not null default 'cadeia'
  check (origem in ('cadeia','avulsa'));

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
      and not t.dono_manual and t.origem = 'cadeia'
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

create or replace function desfazer_tarefas_fora_da_cadeia()
returns table (apagadas integer, marcadas_na integer)
language plpgsql security definer set search_path = public as $$
declare v_apagadas int; v_na int;
begin
  with apagadas as (
    delete from tarefas t
    using eventos e
    where e.id = t.evento_id
      and t.status = 'pendente' and t.origem = 'cadeia'
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
     and t.status = 'pendente' and t.origem = 'cadeia'
     and t.competencia >= date_trunc('month', current_date)::date
     and not exists (select 1 from private.cadeia_vigente(t.frente_id, e.competicao_id, e.data) c
                     where c.atividade = t.atividade);
  get diagnostics v_na = row_count;

  return query select v_apagadas, v_na;
end;
$$;
revoke all on function desfazer_tarefas_fora_da_cadeia() from public, anon, authenticated;

create or replace function desfazer_tarefas_sem_entrega()
returns table (apagadas integer, marcadas_na integer, reabertas integer)
language plpgsql security definer set search_path = public as $$
declare v_apagadas int; v_na int; v_reab int;
begin
  with apagadas as (
    delete from tarefas t
    using eventos e
    where e.id = t.evento_id
      and e.entrega is not true
      and t.status = 'pendente' and t.origem = 'cadeia'
      and t.competencia >= date_trunc('month', current_date)::date
      and not exists (select 1 from sessoes s       where s.tarefa_id = t.id)
      and not exists (select 1 from ajustes_tempo a where a.tarefa_id = t.id)
      and not exists (select 1 from subtarefas st   where st.tarefa_id = t.id)
    returning 1
  )
  select count(*) into v_apagadas from apagadas;

  update tarefas t
     set status = 'na', excecao = 'sem_entrega',
         excecao_desc = 'evento ficou sem entrega comercial', concluida_em = now()
    from eventos e
   where e.id = t.evento_id
     and e.entrega is not true
     and t.status = 'pendente' and t.origem = 'cadeia'
     and t.competencia >= date_trunc('month', current_date)::date;
  get diagnostics v_na = row_count;

  update tarefas t
     set status = 'pendente', excecao = null, excecao_desc = null, concluida_em = null
    from eventos e
   where e.id = t.evento_id
     and e.entrega is true
     and t.status = 'na' and t.excecao = 'sem_entrega'
     and t.competencia >= date_trunc('month', current_date)::date;
  get diagnostics v_reab = row_count;

  return query select v_apagadas, v_na, v_reab;
end;
$$;
revoke all on function desfazer_tarefas_sem_entrega() from public, anon, authenticated;

-- Anota na obs da tarefa o que foi feito a mao, com data.
create or replace function private.anotar(p_obs text, p_texto text) returns text
language sql stable set search_path = public as $$
  select concat_ws(E'\n', nullif(p_obs, ''), to_char(now() at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || ' ' || p_texto)
$$;

-- ---------- macro: atividades, taxa, janela ------------------------------------------

-- Atividade nova (ou existente) entra na cadeia das frentes pedidas a partir de uma data.
create or replace function criar_atividade(p_codigo text, p_rotulo text, p_minutos integer,
  p_frentes text[], p_abre_offset integer, p_prazo_offset integer, p_vigente_de date)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into atividades (codigo, rotulo) values (p_codigo, p_rotulo)
    on conflict (codigo) do update set rotulo = excluded.rotulo, ativa = true;
  insert into taxas (atividade, minutos, vigente_de, fonte)
    values (p_codigo, p_minutos, p_vigente_de, 'criada em /admin/organizar')
    on conflict (atividade, vigente_de) do update set minutos = excluded.minutos;
  insert into cadeia (frente_id, atividade, ordem, escalado_regra, abre_offset_dias, prazo_offset_dias, vigente_de)
  select f.id, p_codigo,
         coalesce((select max(c.ordem) from cadeia c where c.frente_id = f.id), 0) + 1,
         'mapa', p_abre_offset, p_prazo_offset, p_vigente_de
    from frentes f where f.sigla = any (p_frentes)
  on conflict do nothing;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Fecha a atividade numa frente a partir de uma data (o dia anterior e o ultimo em vigor).
-- Linha que ainda nem comecou e apagada. Quem desfaz as tarefas e a desfazer_tarefas_fora_da_cadeia.
create or replace function encerrar_atividade_na_frente(p_codigo text, p_sigla text, p_a_partir date)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n int; v_m int;
begin
  delete from cadeia c using frentes f
   where f.id = c.frente_id and f.sigla = p_sigla and c.atividade = p_codigo
     and c.competicao_id is null and c.vigente_de >= p_a_partir;
  get diagnostics v_m = row_count;
  update cadeia c set vigente_ate = p_a_partir - 1
    from frentes f
   where f.id = c.frente_id and f.sigla = p_sigla and c.atividade = p_codigo
     and c.competicao_id is null
     and (c.vigente_ate is null or c.vigente_ate >= p_a_partir);
  get diagnostics v_n = row_count;
  return v_n + v_m;
end;
$$;

-- Volta a atividade pra frente a partir de uma data, com a ultima janela e ordem que ela teve.
create or replace function reabrir_atividade_na_frente(p_codigo text, p_sigla text, p_a_partir date)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into cadeia (frente_id, atividade, ordem, escalado_regra, abre_offset_dias, prazo_offset_dias, vigente_de)
  select c.frente_id, c.atividade, c.ordem, c.escalado_regra, c.abre_offset_dias, c.prazo_offset_dias, p_a_partir
    from cadeia c join frentes f on f.id = c.frente_id
   where f.sigla = p_sigla and c.atividade = p_codigo and c.competicao_id is null
     and not exists (select 1 from cadeia c2 where c2.frente_id = c.frente_id and c2.atividade = p_codigo
                       and c2.competicao_id is null
                       and (c2.vigente_ate is null or c2.vigente_ate >= p_a_partir))
   order by c.vigente_de desc limit 1;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Taxa nova a partir de uma data. As pendentes de eventos dali pra frente passam a usar ela.
create or replace function alterar_taxa(p_codigo text, p_minutos integer, p_vigente_de date, p_fonte text)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into taxas (atividade, minutos, vigente_de, fonte)
    values (p_codigo, p_minutos, p_vigente_de, coalesce(nullif(p_fonte, ''), 'alterada em /admin/organizar'))
    on conflict (atividade, vigente_de) do update set minutos = excluded.minutos, fonte = excluded.fonte;
  update tarefas t set estimativa_min = p_minutos
    from eventos e
   where e.id = t.evento_id and t.atividade = p_codigo and t.status = 'pendente'
     and e.data >= p_vigente_de;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Janela da atividade numa frente (linha em vigor hoje ou futura). As pendentes da frente
-- cuja cadeia e essa linha ganham a janela nova.
create or replace function alterar_janela(p_codigo text, p_sigla text, p_abre_offset integer, p_prazo_offset integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  update cadeia c set abre_offset_dias = p_abre_offset, prazo_offset_dias = p_prazo_offset
    from frentes f
   where f.id = c.frente_id and f.sigla = p_sigla and c.atividade = p_codigo
     and c.competicao_id is null and (c.vigente_ate is null or c.vigente_ate >= current_date);
  update tarefas t
     set abre_em  = e.data + p_abre_offset,
         prazo_em = (e.data + p_prazo_offset + 1)::timestamptz - interval '1 second'
    from eventos e, frentes f
   where e.id = t.evento_id and f.id = t.frente_id and f.sigla = p_sigla
     and t.atividade = p_codigo and t.status = 'pendente' and t.origem = 'cadeia'
     and exists (select 1 from private.cadeia_vigente(t.frente_id, e.competicao_id, e.data) c
                 where c.atividade = p_codigo and c.competicao_id is null
                   and (c.vigente_ate is null or c.vigente_ate >= current_date));
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------- macro: mapa ---------------------------------------------------------------

create or replace function definir_mapa(p_sigla text, p_codigo text, p_competencia date,
  p_pessoa uuid, p_dupla uuid, p_origem text)
returns table (reescaladas integer, sem_mapa integer, divergentes_com_tempo integer)
language plpgsql security definer set search_path = public as $$
begin
  insert into mapa (frente_id, atividade, competencia, pessoa_id, dupla_id, origem_commit)
  select f.id, p_codigo, p_competencia, p_pessoa, p_dupla, p_origem from frentes f where f.sigla = p_sigla
  on conflict (frente_id, atividade, competencia)
    do update set pessoa_id = excluded.pessoa_id, dupla_id = excluded.dupla_id,
                  origem_commit = excluded.origem_commit, importado_em = now();
  return query select * from reaplicar_mapa(p_competencia);
end;
$$;

create or replace function limpar_mapa(p_sigla text, p_codigo text, p_competencia date)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  delete from mapa m using frentes f
   where f.id = m.frente_id and f.sigla = p_sigla and m.atividade = p_codigo and m.competencia = p_competencia;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- Copia o mapa de um mes pro outro, sobrescrevendo as celulas que existirem no destino.
create or replace function copiar_mapa(p_de date, p_para date, p_origem text)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into mapa (frente_id, atividade, competencia, pessoa_id, dupla_id, origem_commit)
  select frente_id, atividade, p_para, pessoa_id, dupla_id, p_origem from mapa where competencia = p_de
  on conflict (frente_id, atividade, competencia)
    do update set pessoa_id = excluded.pessoa_id, dupla_id = excluded.dupla_id,
                  origem_commit = excluded.origem_commit, importado_em = now();
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;

-- ---------- micro: tarefas ------------------------------------------------------------

create or replace function redirecionar_tarefa(p_tarefa uuid, p_escalado uuid, p_dupla uuid, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update tarefas t
     set escalado_id = p_escalado, dupla_id = p_dupla, dono_manual = true,
         obs = private.anotar(t.obs, 'redirecionada para ' ||
               (select string_agg(p.nome, ' + ' order by p.id = p_escalado desc) from pessoas p where p.id in (p_escalado, p_dupla))
               || coalesce(': ' || nullif(p_motivo, ''), ''))
   where t.id = p_tarefa;
  if not found then raise exception 'tarefa nao encontrada'; end if;
end;
$$;

create or replace function alterar_tarefa(p_tarefa uuid, p_prazo_em timestamptz, p_estimativa_min integer, p_motivo text)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update tarefas t
     set prazo_em = coalesce(p_prazo_em, t.prazo_em),
         abre_em = least(t.abre_em, coalesce(p_prazo_em, t.prazo_em)::date),
         estimativa_min = coalesce(p_estimativa_min, t.estimativa_min),
         obs = private.anotar(t.obs, 'ajustada' ||
               case when p_prazo_em is not null then ' prazo ' || to_char(p_prazo_em at time zone 'America/Sao_Paulo', 'DD/MM') else '' end ||
               case when p_estimativa_min is not null then ' estimativa ' || p_estimativa_min || ' min' else '' end ||
               coalesce(': ' || nullif(p_motivo, ''), ''))
   where t.id = p_tarefa;
  if not found then raise exception 'tarefa nao encontrada'; end if;
end;
$$;

create or replace function criar_tarefa_avulsa(p_evento uuid, p_atividade text, p_escalado uuid, p_dupla uuid,
  p_prazo_em timestamptz, p_estimativa_min integer)
returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into tarefas (evento_id, frente_id, atividade, competencia, escalado_id, dupla_id,
                       estimativa_min, abre_em, prazo_em, origem, dono_manual, obs)
  select e.id, e.frente_id, p_atividade, date_trunc('month', e.data)::date, p_escalado, p_dupla,
         coalesce(p_estimativa_min, private.taxa_min(p_atividade, e.data), 60),
         least(current_date, e.data, p_prazo_em::date), p_prazo_em, 'avulsa', true,
         private.anotar(null, 'criada a mao em /admin/organizar')
    from eventos e where e.id = p_evento and e.frente_id is not null
  returning id into v_id;
  if v_id is null then raise exception 'evento nao encontrado ou sem frente'; end if;
  return v_id;
end;
$$;

-- So apaga tarefa sem tempo nenhum (mesma guarda da 028): tempo medido nunca se perde.
create or replace function apagar_tarefa(p_tarefa uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from sessoes s where s.tarefa_id = p_tarefa)
     or exists (select 1 from ajustes_tempo a where a.tarefa_id = p_tarefa)
     or exists (select 1 from subtarefas st where st.tarefa_id = p_tarefa) then
    raise exception 'tarefa tem tempo registrado; marque como desnecessaria em vez de apagar';
  end if;
  delete from tarefas where id = p_tarefa;
end;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'criar_atividade(text,text,integer,text[],integer,integer,date)',
    'encerrar_atividade_na_frente(text,text,date)',
    'reabrir_atividade_na_frente(text,text,date)',
    'alterar_taxa(text,integer,date,text)',
    'alterar_janela(text,text,integer,integer)',
    'definir_mapa(text,text,date,uuid,uuid,text)',
    'limpar_mapa(text,text,date)',
    'copiar_mapa(date,date,text)',
    'redirecionar_tarefa(uuid,uuid,uuid,text)',
    'alterar_tarefa(uuid,timestamptz,integer,text)',
    'criar_tarefa_avulsa(uuid,text,uuid,uuid,timestamptz,integer)',
    'apagar_tarefa(uuid)',
    'private.anotar(text,text)'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', f);
  end loop;
end $$;
