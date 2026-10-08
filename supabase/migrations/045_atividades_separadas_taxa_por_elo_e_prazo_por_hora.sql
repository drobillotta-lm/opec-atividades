-- 045 — Cada atividade e uma tarefa (fim das combinadas), taxa por elo da cadeia,
--       prazo em horas antes do inicio e fim do dia em Brasilia.
--
-- Pedido do Daniel em 07/10, decisoes em 08/10:
--  1. "Roteiro e auditoria" nao e uma atividade: sao duas, do mesmo evento, da mesma pessoa.
--     A combinacao do Yuri (30/09) so dizia que a mesma pessoa faz as duas. A partir dos
--     eventos de 09/10 (dia seguinte a esta migration) a cadeia so tem materiais,
--     sincronizacao, roteiro e auditoria. Eventos ate 08/10 ficam como estao (historico:
--     3 entregues, 1 n/a e 2 com tempo do Daniel em roteiro_auditoria).
--  2. Os 168 min do Yuri (0,8 x (90 + 120)) para sinc + auditoria em FI/OL/PR/CP ficam:
--     `cadeia.taxa_min` sobrepoe a taxa global so naquele elo (72 + 96).
--  3. Compactos (046) precisam de prazo "24 h antes do inicio": `cadeia.prazo_horas_antes`
--     e gerar_tarefas v6 usando `eventos.inicio_brt` (preenchido em 100 % de outubro).
--  4. De brinde, o fim do dia: `(d + 1)::timestamptz - 1s` dava 23:59:59 UTC = 20:59 BRT.
--     Agora e `private.fim_do_dia_brt`. As pendentes com a formula antiga ganham +3 h.

-- ---------- 1. schema ---------------------------------------------------------------------

alter table cadeia add column taxa_min integer check (taxa_min > 0);
comment on column cadeia.taxa_min is
  'Estimativa so para este elo; null = taxas globais (private.taxa_min). Serve a premissa do Yuri (30/09): sinc + auditoria pela mesma pessoa = 0,8 x (90 + 120).';

alter table cadeia add column prazo_horas_antes integer check (prazo_horas_antes > 0);
comment on column cadeia.prazo_horas_antes is
  'Prazo = inicio_brt do evento menos N horas (compactos: materiais 24 h antes). Null = fim do dia de data + prazo_offset_dias.';

-- Fim do dia em Brasilia. Sem horario de verao desde 2019, mas a conversao fica certa de qualquer jeito.
create or replace function private.fim_do_dia_brt(p_dia date) returns timestamptz
language sql immutable set search_path = public as $$
  select ((p_dia + 1)::timestamp at time zone 'America/Sao_Paulo') - interval '1 second'
$$;
revoke all on function private.fim_do_dia_brt(date) from public, anon, authenticated;

-- ---------- 2. gerar_tarefas v6: diff minimo sobre a v5 (034) ---------------------------------
-- estimativa_min = taxa do elo, se houver; prazo_em = N horas antes do inicio, se o elo pedir,
-- senao fim do dia em Brasilia.

create or replace function gerar_tarefas(p_inicio date, p_fim date)
returns table (criadas integer, ja_existiam integer, sem_escalado integer,
               aguardando_entrega integer, ignorados integer)
language plpgsql security definer set search_path = public as $$
declare
  v_criadas int; v_sem_escalado int; v_alvo int; v_aguardando int; v_ignorados int;
  v_de date; v_ate date;
begin
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
    coalesce(c.taxa_min, private.taxa_min(c.atividade, e.data)) as estimativa_min,
    (e.data + c.abre_offset_dias) as abre_em,
    case when c.prazo_horas_antes is not null and e.inicio_brt is not null
         then e.inicio_brt - make_interval(hours => c.prazo_horas_antes)
         else private.fim_do_dia_brt(e.data + c.prazo_offset_dias)
    end as prazo_em
  from elegiveis e
  cross join lateral private.cadeia_vigente(e.frente_id, e.competicao_id, e.data) c
  left join mapa m
    on m.frente_id = e.frente_id and m.atividade = c.atividade
   and m.competencia = date_trunc('month', e.data)::date;

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

-- ---------- 3. alterar_janela v2: ganha as horas antes do inicio -------------------------------
-- drop + create: parametro novo criaria SOBRECARGA e o PostgREST nao saberia qual chamar (044).

drop function alterar_janela(text, text, integer, integer);
create function alterar_janela(p_codigo text, p_sigla text, p_abre_offset integer, p_prazo_offset integer,
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
         prazo_em = case when p_prazo_horas_antes is not null and e.inicio_brt is not null
                         then e.inicio_brt - make_interval(hours => p_prazo_horas_antes)
                         else private.fim_do_dia_brt(e.data + p_prazo_offset) end
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

-- ---------- 4. pendentes com o fim do dia em UTC passam para 23:59:59 BRT ----------------------
-- 23:59:59 UTC identifica exatamente a formula antiga; as ajustadas a mao ja nascem -03:00.

update tarefas set prazo_em = prazo_em + interval '3 hours'
 where status = 'pendente' and (prazo_em at time zone 'UTC')::time = '23:59:59';

-- ---------- 5. cadeia: separa as combinadas a partir dos eventos de 09/10 ----------------------
-- FI/OL/PR/CP: sinc_auditoria (01/10) fica em vigor so ate 08/10; sincronizacao e auditoria
-- voltam com a ordem e a janela que tinham ate 30/09 (reabrir usa a ultima linha).

select encerrar_atividade_na_frente('sinc_auditoria', s, '2026-10-09') as fechadas,
       reabrir_atividade_na_frente('sincronizacao',  s, '2026-10-09') as sinc,
       reabrir_atividade_na_frente('auditoria',      s, '2026-10-09') as aud
  from unnest(array['FI','OL','PR','CP']) as s;

-- NA e KG: as combinadas encerram; as partes nunca existiram la, entao entram direto,
-- com as janelas que as outras frentes ja usam (016).
select encerrar_atividade_na_frente(x.a, x.s, '2026-10-09') as fechadas
  from (values ('materiais_sinc','NA'), ('roteiro_auditoria','NA'), ('materiais_sinc','KG')) as x(a, s);

insert into cadeia (frente_id, atividade, ordem, escalado_regra, abre_offset_dias, prazo_offset_dias, vigente_de)
select f.id, x.atividade, x.ordem, 'mapa', x.abre, x.prazo, date '2026-10-09'
from (values ('NA','materiais',1,-3,-1), ('NA','sincronizacao',2,-1,0),
             ('NA','roteiro',3,-3,-1),   ('NA','auditoria',4,0,2),
             ('KG','materiais',1,-3,-1), ('KG','sincronizacao',2,-1,0)) as x(sigla, atividade, ordem, abre, prazo)
join frentes f on f.sigla = x.sigla;

-- ---------- 6. os 168 do Yuri: 72 + 96 so em FI/OL/PR/CP ---------------------------------------

update cadeia c set taxa_min = x.m
  from (values ('sincronizacao', 72), ('auditoria', 96)) as x(a, m), frentes f
 where c.frente_id = f.id and f.sigla in ('FI','OL','PR','CP') and c.competicao_id is null
   and c.atividade = x.a and c.vigente_de = date '2026-10-09';

-- ---------- 7. mapa: as partes herdam pessoa e dupla da combinada (out, nov, dez) -------------

insert into mapa (frente_id, atividade, competencia, pessoa_id, dupla_id, origem_commit)
select m.frente_id, p.parte, m.competencia, m.pessoa_id, m.dupla_id,
       'separada de ' || m.atividade || ' em 08/10 (045: cada atividade e uma tarefa; a combinacao do Yuri so dizia que a mesma pessoa faz as duas) <- '
         || coalesce(m.origem_commit, '?')
from mapa m
join (values ('materiais_sinc','materiais'),    ('materiais_sinc','sincronizacao'),
             ('roteiro_auditoria','roteiro'),   ('roteiro_auditoria','auditoria'),
             ('sinc_auditoria','sincronizacao'), ('sinc_auditoria','auditoria')) as p(combinada, parte)
  on p.combinada = m.atividade
where m.competencia >= date '2026-10-01'
on conflict (frente_id, atividade, competencia) do nothing;

-- ---------- 8. combinadas saem do cardapio (rotulo fica para o historico) ----------------------

update atividades set ativa = false
 where codigo in ('materiais_sinc', 'roteiro_auditoria', 'sinc_auditoria');

-- ---------- 9. v_cadeia_atual mostra a taxa efetiva (elo ou global) ---------------------------
-- Colunas novas so no fim: create or replace view nao aceita mudar as que existem.

create or replace view v_cadeia_atual
with (security_invoker = true) as
select
  f.id as frente_id, f.sigla, f.nome as frente,
  c.id as cadeia_id, c.atividade, a.rotulo, c.ordem, c.escalado_regra,
  c.competicao_id, co.nome as competicao,
  c.abre_offset_dias, c.prazo_offset_dias, c.vigente_de, c.vigente_ate,
  coalesce(c.taxa_min, tx.minutos) as taxa_min,
  m.pessoa_id, p.nome as pessoa, m.dupla_id, d.nome as dupla, m.origem_commit,
  c.taxa_min as taxa_min_elo, tx.minutos as taxa_min_global, c.prazo_horas_antes
from cadeia c
join frentes f     on f.id = c.frente_id
join atividades a  on a.codigo = c.atividade
left join competicoes co on co.id = c.competicao_id
left join lateral (
  select t.minutos from taxas t
  where t.atividade = c.atividade and t.vigente_de <= current_date
  order by t.vigente_de desc limit 1
) tx on true
left join mapa m
  on m.frente_id = c.frente_id and m.atividade = c.atividade
 and m.competencia = date_trunc('month', current_date)::date
left join pessoas p on p.id = m.pessoa_id
left join pessoas d on d.id = m.dupla_id
where c.vigente_de <= current_date and (c.vigente_ate is null or c.vigente_ate >= current_date);

-- Depois desta migration: "Sincronizar agora" no /admin (ou gerar_tarefas + desfazer_tarefas_fora_da_cadeia
-- a mao). gerar_tarefas usa temp table e nao pode rodar dentro dela.
