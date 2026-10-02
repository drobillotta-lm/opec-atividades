-- Em Fut Inter a sinc_auditoria de outubro e de uma DUPLA (analista + estagiario, metade
-- das horas cada): Julia + Pedro. Eles dividem entre si; o app nao decide quem faz o que.
alter table mapa    add column dupla_id uuid references pessoas(id);
alter table mapa    add constraint mapa_dupla_check    check (dupla_id <> pessoa_id);
alter table tarefas add column dupla_id uuid references pessoas(id);
alter table tarefas add constraint tarefas_dupla_check check (dupla_id <> escalado_id);
create index tarefas_dupla_idx on tarefas (dupla_id, competencia) where dupla_id is not null;

-- A dupla escreve na tarefa como o escalado.
drop policy escreve_tarefas on tarefas;
create policy escreve_tarefas on tarefas for update to authenticated using (
  escalado_id = private.eu()
  or dupla_id = private.eu()
  or responsavel_real_id = private.eu()
  or private.lidero(frente_id)
  or private.sou_gestor()
  or exists (select 1 from sessoes s where s.tarefa_id = tarefas.id and s.pessoa_id = private.eu())
) with check (
  escalado_id = private.eu()
  or dupla_id = private.eu()
  or responsavel_real_id = private.eu()
  or private.lidero(frente_id)
  or private.sou_gestor()
  or exists (select 1 from sessoes s where s.tarefa_id = tarefas.id and s.pessoa_id = private.eu())
);

-- Escalado e dupla enxergam todas as sessoes e ajustes da tarefa. Sem isso a Julia nao
-- ve o tempo do Pedro: v_tempo_tarefa e security_invoker (020).
drop policy le_sessoes on sessoes;
create policy le_sessoes on sessoes for select to authenticated using (
  pessoa_id = private.eu() or private.sou_gestor()
  or exists (select 1 from tarefas t where t.id = sessoes.tarefa_id
               and (private.lidero(t.frente_id) or t.escalado_id = private.eu() or t.dupla_id = private.eu()))
);
drop policy le_ajustes on ajustes_tempo;
create policy le_ajustes on ajustes_tempo for select to authenticated using (
  pessoa_id = private.eu() or private.sou_gestor()
  or exists (select 1 from tarefas t where t.id = ajustes_tempo.tarefa_id
               and (private.lidero(t.frente_id) or t.escalado_id = private.eu() or t.dupla_id = private.eu()))
);

-- Desvio de escala: quem fez nao e o escalado nem a dupla.
create or replace view v_semana_frente
with (security_invoker = true) as
select
  t.frente_id, f.sigla, f.nome as frente,
  date_trunc('week', e.data)::date as semana,
  count(*)                                                          as tarefas,
  count(*) filter (where t.status = 'entregue')                     as entregues,
  count(*) filter (where t.status = 'pendente')                     as pendentes,
  count(*) filter (where t.status = 'fora_do_prazo')                as fora_do_prazo,
  count(*) filter (where t.status = 'na')                           as nao_aplicaveis,
  count(*) filter (where t.responsavel_real_id is not null
                     and t.responsavel_real_id <> t.escalado_id
                     and t.responsavel_real_id is distinct from t.dupla_id) as desvios_escala,
  count(*) filter (where t.excecao is not null and t.excecao <> '') as excecoes,
  sum(t.estimativa_min)                                             as minutos_previstos,
  round(sum(vt.minutos_total), 1)                                   as minutos_medidos
from tarefas t
join eventos e on e.id = t.evento_id
join frentes f on f.id = t.frente_id
join v_tempo_tarefa vt on vt.tarefa_id = t.id
group by t.frente_id, f.sigla, f.nome, date_trunc('week', e.data);

-- Tarefa em dupla conta meio a meio (previsto e medido) pros dois, a menos que um
-- terceiro tenha feito. Sem dupla, igual a antes: vai pra quem fez, ou pro escalado.
drop view v_mes_pessoa;
create view v_mes_pessoa
with (security_invoker = true) as
with atribuida as (
  select t.*, x.quem, x.peso
  from tarefas t
  cross join lateral (
    select coalesce(t.responsavel_real_id, t.escalado_id), 1.0
     where t.dupla_id is null
        or t.responsavel_real_id not in (t.escalado_id, t.dupla_id)
    union all
    select q, 0.5 from unnest(array[t.escalado_id, t.dupla_id]) q
     where t.dupla_id is not null
       and (t.responsavel_real_id is null or t.responsavel_real_id in (t.escalado_id, t.dupla_id))
  ) x(quem, peso)
)
select
  p.id as pessoa_id, p.nome, a.competencia,
  count(*)                                           as tarefas,
  count(*) filter (where a.status = 'entregue')      as entregues,
  count(*) filter (where a.status = 'fora_do_prazo') as fora_do_prazo,
  count(*) filter (where a.escalado_id <> p.id and a.dupla_id is distinct from p.id) as cobriu_outra_pessoa,
  round(sum(a.estimativa_min * a.peso), 1)           as minutos_previstos,
  round(sum(vt.minutos_total * a.peso), 1)           as minutos_medidos,
  case when sum(a.estimativa_min * a.peso) > 0
       then round(100.0 * (sum(vt.minutos_total * a.peso) - sum(a.estimativa_min * a.peso))
                  / sum(a.estimativa_min * a.peso))
  end                                                as desvio_pct
from atribuida a
join pessoas p on p.id = a.quem
join v_tempo_tarefa vt on vt.tarefa_id = a.id
group by p.id, p.nome, a.competencia;
