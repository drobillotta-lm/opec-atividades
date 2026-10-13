-- 047 (13/10/2026): tres pedidos do Daniel depois do Internacional x Corinthians de 07/10.
--
--  1. Prazo DEPOIS do jogo conta dia util (pula sabado, domingo e feriado). Prazo antes ou no
--     dia do jogo e a abertura continuam em dia corrido -- decisao dele.
--  2. "Roteiro + Auditoria" (e as outras combinadas) somem: o corte da 045 era pela data do
--     evento em 09/10 e deixou as combinadas de 01 a 08/10 abertas. O corte vai para 01/10.
--     As combinadas ja entregues ficam (historico); a trava no gerar_tarefas nao cria a parte
--     de um evento que ja tem a combinada viva, entao nada e feito duas vezes.
--  3. Brasileirao chega em duas linhas da Matriz (a da CazeTV e a das outras emissoras). A sync
--     marca a que nao e da CazeTV como tipo 'duplicado' e as tarefas dela se desfazem como as
--     de evento cancelado.

-- ---------- 1. feriados e dia util -----------------------------------------------------------
-- Nacionais de lei. Carnaval e Corpus Christi sao ponto facultativo e ficam de fora; quem quiser
-- acrescenta uma linha aqui.

create table feriados (
  dia  date primary key,
  nome text not null
);
alter table feriados enable row level security;
create policy feriados_leitura on feriados for select to authenticated using (true);

insert into feriados (dia, nome) values
  ('2026-01-01', 'Confraternização Universal'), ('2026-04-03', 'Sexta-feira Santa'),
  ('2026-04-21', 'Tiradentes'),                 ('2026-05-01', 'Dia do Trabalho'),
  ('2026-09-07', 'Independência'),              ('2026-10-12', 'Nossa Senhora Aparecida'),
  ('2026-11-02', 'Finados'),                    ('2026-11-15', 'Proclamação da República'),
  ('2026-11-20', 'Consciência Negra'),          ('2026-12-25', 'Natal'),
  ('2027-01-01', 'Confraternização Universal'), ('2027-03-26', 'Sexta-feira Santa'),
  ('2027-04-21', 'Tiradentes'),                 ('2027-05-01', 'Dia do Trabalho'),
  ('2027-09-07', 'Independência'),              ('2027-10-12', 'Nossa Senhora Aparecida'),
  ('2027-11-02', 'Finados'),                    ('2027-11-15', 'Proclamação da República'),
  ('2027-11-20', 'Consciência Negra'),          ('2027-12-25', 'Natal');

create or replace function private.dia_util(p_dia date) returns boolean
language sql stable set search_path = public as $$
  select extract(isodow from p_dia) < 6 and not exists (select 1 from feriados f where f.dia = p_dia)
$$;

-- N > 0: anda N dias uteis para frente. N <= 0: dia corrido, como sempre foi.
create or replace function private.somar_dias_uteis(p_dia date, p_n integer) returns date
language plpgsql stable set search_path = public as $$
declare v_dia date := p_dia; v_falta int := p_n;
begin
  if p_n <= 0 then return p_dia + p_n; end if;
  while v_falta > 0 loop
    v_dia := v_dia + 1;
    if private.dia_util(v_dia) then v_falta := v_falta - 1; end if;
  end loop;
  return v_dia;
end;
$$;

-- A regra de prazo num lugar so (gerar_tarefas, alterar_janela e o recalculo abaixo).
create or replace function private.prazo_da_cadeia(p_data date, p_inicio timestamptz,
                                                   p_offset integer, p_horas_antes integer)
returns timestamptz language sql stable set search_path = public as $$
  select case when p_horas_antes is not null and p_inicio is not null
              then p_inicio - make_interval(hours => p_horas_antes)
              else private.fim_do_dia_brt(private.somar_dias_uteis(p_data, p_offset)) end
$$;

revoke all on function private.dia_util(date) from public, anon, authenticated;
revoke all on function private.somar_dias_uteis(date, integer) from public, anon, authenticated;
revoke all on function private.prazo_da_cadeia(date, timestamptz, integer, integer) from public, anon, authenticated;

-- ---------- 2. gerar_tarefas v7: prazo em dia util + trava das combinadas ----------------------
-- Diff sobre a v6 que esta no banco (filtro da janela no select, 08/10): prazo_em via
-- prazo_da_cadeia; v_de recua mais 5 dias porque +2 dias uteis pode passar de um feriadao;
-- e a parte nao nasce se o evento ja tem a combinada que a contem e ela nao e 'na'.

create or replace function gerar_tarefas(p_inicio date, p_fim date)
returns table (criadas integer, ja_existiam integer, sem_escalado integer,
               aguardando_entrega integer, ignorados integer)
language plpgsql security definer set search_path = public as $$
declare
  v_criadas int; v_sem_escalado int; v_alvo int; v_aguardando int; v_ignorados int;
  v_de date; v_ate date;
begin
  select p_inicio - coalesce(max(-abre_offset_dias), 0) - 5,
         p_fim    + coalesce(max(prazo_offset_dias), 0)
    into v_de, v_ate
  from cadeia;

  create temp table _cand on commit drop as
  select * from (
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
      coalesce(c.taxa_min, private.taxa_min(c.atividade, e.data)) as estimativa_min,
      (e.data + c.abre_offset_dias) as abre_em,
      private.prazo_da_cadeia(e.data, e.inicio_brt, c.prazo_offset_dias, c.prazo_horas_antes) as prazo_em
    from elegiveis e
    cross join lateral private.cadeia_vigente(e.frente_id, e.competicao_id, e.data) c
    left join mapa m
      on m.frente_id = e.frente_id and m.atividade = c.atividade
     and m.competencia = date_trunc('month', e.data)::date
  ) cand
  where cand.abre_em <= p_fim and cand.prazo_em >= p_inicio::timestamptz
    and not exists (
      select 1
      from tarefas t2
      join (values ('materiais_sinc', 'materiais'),  ('materiais_sinc', 'sincronizacao'),
                   ('roteiro_auditoria', 'roteiro'), ('roteiro_auditoria', 'auditoria'),
                   ('sinc_auditoria', 'sincronizacao'), ('sinc_auditoria', 'auditoria')) as pc(combinada, parte)
        on pc.combinada = t2.atividade
      where t2.evento_id = cand.evento_id and pc.parte = cand.atividade and t2.status <> 'na');

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

-- ---------- 3. alterar_janela v3: mesma regra de prazo ---------------------------------------

create or replace function alterar_janela(p_codigo text, p_sigla text, p_abre_offset integer, p_prazo_offset integer,
                                          p_prazo_horas_antes integer)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  if p_prazo_offset < p_abre_offset then
    raise exception 'o prazo (%) nao pode vir antes da abertura (%)', p_prazo_offset, p_abre_offset;
  end if;
  update cadeia c set abre_offset_dias = p_abre_offset, prazo_offset_dias = p_prazo_offset,
                      prazo_horas_antes = p_prazo_horas_antes
    from frentes f
   where f.id = c.frente_id and f.sigla = p_sigla and c.atividade = p_codigo
     and c.competicao_id is null and (c.vigente_ate is null or c.vigente_ate >= current_date);
  update tarefas t
     set abre_em  = e.data + p_abre_offset,
         prazo_em = private.prazo_da_cadeia(e.data, e.inicio_brt, p_prazo_offset, p_prazo_horas_antes)
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
revoke all on function alterar_janela(text, text, integer, integer, integer) from public, anon, authenticated;

-- ---------- 4. pendentes: prazo pos-jogo recalculado em dia util ------------------------------
-- So as que ainda tem exatamente o prazo da formula antiga; prazo ajustado a mao fica.

with novos as (
  select t.id,
         private.prazo_da_cadeia(e.data, e.inicio_brt, c.prazo_offset_dias, c.prazo_horas_antes) as prazo
  from tarefas t
  join eventos e on e.id = t.evento_id
  cross join lateral private.cadeia_vigente(t.frente_id, e.competicao_id, e.data) c
  where c.atividade = t.atividade
    and t.status = 'pendente' and t.origem = 'cadeia'
    and c.prazo_offset_dias > 0 and c.prazo_horas_antes is null
    and t.prazo_em = private.fim_do_dia_brt(e.data + c.prazo_offset_dias)
)
update tarefas t set prazo_em = n.prazo from novos n where n.id = t.id and t.prazo_em <> n.prazo;

-- ---------- 5. combinadas: corte vai de 09/10 para 01/10 --------------------------------------
-- NA e KG: combinadas param em 30/09; as partes valem desde 01/10.
-- FI/OL/PR/CP: sincronizacao e auditoria de 09/10 passam a valer desde 01/10. A linha
-- sinc_auditoria (01 a 08/10) sai da cadeia num passo separado (o MCP nao roda delete).

update cadeia c set vigente_ate = date '2026-09-30'
  from frentes f
 where f.id = c.frente_id and f.sigla in ('NA', 'KG') and c.competicao_id is null
   and c.atividade in ('materiais_sinc', 'roteiro_auditoria') and c.vigente_ate = date '2026-10-08';

update cadeia c set vigente_de = date '2026-10-01'
  from frentes f
 where f.id = c.frente_id and c.competicao_id is null and c.vigente_de = date '2026-10-09'
   and ((f.sigla in ('NA', 'KG') and c.atividade in ('materiais', 'sincronizacao', 'roteiro', 'auditoria'))
     or (f.sigla in ('FI', 'OL', 'PR', 'CP') and c.atividade in ('sincronizacao', 'auditoria')));

-- passo separado (SQL Editor):
-- delete from cadeia c using frentes f
--  where f.id = c.frente_id and f.sigla in ('FI','OL','PR','CP') and c.competicao_id is null
--    and c.atividade = 'sinc_auditoria' and c.vigente_de = date '2026-10-01';

-- ---------- 6. Brasileirao duplicado ---------------------------------------------------------

alter table eventos drop constraint eventos_tipo_check;
alter table eventos add constraint eventos_tipo_check check (tipo = any (array[
  'normal', 'reprise', 'gravacao', 'externa', 'sem_narracao', 'pre_jogo', 'duplicado']));
comment on column eventos.tipo is
  'Vem do texto do jogo (sync). duplicado = segunda linha do mesmo jogo na Matriz (Brasileirao: fica a da CazeTV).';

-- Evento duplicado desfaz as tarefas como evento cancelado (mesma funcao, motivo proprio).
create or replace function desfazer_tarefas_de_evento_cancelado()
returns table (apagadas integer, marcadas_na integer)
language plpgsql security definer set search_path = public as $$
declare v_apagadas int; v_na int;
begin
  with apagadas as (
    delete from tarefas t
    using eventos e
    where e.id = t.evento_id
      and (e.status_origem = 'Cancelado' or e.tipo = 'duplicado')
      and t.status = 'pendente'
      and not exists (select 1 from sessoes s       where s.tarefa_id = t.id)
      and not exists (select 1 from ajustes_tempo a where a.tarefa_id = t.id)
    returning 1
  )
  select count(*) into v_apagadas from apagadas;

  update tarefas t
     set status = 'na',
         excecao = case when e.tipo = 'duplicado' then 'duplicado' else 'cancelado' end,
         excecao_desc = case when e.tipo = 'duplicado'
                             then 'evento repetido na Matriz; vale a linha da CazéTV'
                             else 'evento cancelado na origem' end,
         concluida_em = now()
    from eventos e
   where e.id = t.evento_id
     and (e.status_origem = 'Cancelado' or e.tipo = 'duplicado')
     and t.status = 'pendente';
  get diagnostics v_na = row_count;

  return query select v_apagadas, v_na;
end;
$$;
revoke all on function desfazer_tarefas_de_evento_cancelado() from public, anon, authenticated;

-- Os que ja estao no banco (a sync mantem daqui pra frente; regra em src/lib/escala/sincronizar.ts).
with grupos as (
  select e.id,
         row_number() over (partition by e.data, e.competicao, lower(e.confronto)
                            order by (btrim(e.detentor) = 'CazéTV') desc nulls last,
                                     (e.detentor ilike '%CazéTV%') desc nulls last,
                                     length(coalesce(e.detentor, '')), e.airtable_record_id) as ordem,
         count(*) over (partition by e.data, e.competicao, lower(e.confronto)) as n
  from eventos e
  where e.competicao ilike 'Brasileirão%' and e.confronto is not null and e.tipo = 'normal'
)
update eventos e set tipo = 'duplicado' from grupos g where g.id = e.id and g.n > 1 and g.ordem > 1;

-- ---------- 7. entrega so da Escala: fim do 'previsto' daqui ---------------------------------
-- Daniel, 13/10: o certo e pegar so os eventos que a Escala ja filtrou (view "Geral - CazeTV")
-- e marcou com entrega comercial. A previsao pelo padrao da competicao (014) gerava cadeia para
-- jogo de Globo/Prime que a Escala marca como inelegivel. A sync manda elegivel=false como 'nao'
-- (src/lib/escala/sincronizar.ts); esta funcao, que a sync chama toda hora, passa a so limpar o
-- 'previsto' que ficou. O que o lider decidiu aqui ('lider', 036) continua valendo.
-- 186 eventos de outubro em diante, 382 tarefas pendentes, nenhuma com tempo (13/10).

create or replace function aplicar_previsao_entrega() returns void
language sql set search_path = public as $$
  update eventos set entrega = null, entrega_origem = null where entrega_origem = 'previsto';
$$;
