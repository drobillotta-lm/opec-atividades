-- v_tempo_tarefa arredondava a soma das sessoes para minutos inteiros (::int).
-- Consequencia: rodar o cronometro por 20 segundos, pausar e retomar nao mudava
-- nada no total, porque 0,7 min e 1,0 min arredondam para o mesmo 1. Quem testa
-- ve o relogio "voltar". Agora a view guarda segundos com precisao e o minuto e
-- derivado, nunca a fonte.
drop view if exists v_taxa_real;
drop view if exists v_mes_pessoa;
drop view if exists v_semana_frente;
drop view if exists v_tempo_tarefa;

create view v_tempo_tarefa
with (security_invoker = true) as
select
  t.id as tarefa_id,
  coalesce(s.segundos, 0)::numeric                                   as segundos_cronometro,
  coalesce(a.minutos_ajuste, 0)                                      as minutos_ajuste,
  (coalesce(s.segundos, 0) + coalesce(a.minutos_ajuste, 0) * 60)::numeric as segundos_total,
  round((coalesce(s.segundos, 0) + coalesce(a.minutos_ajuste, 0) * 60) / 60.0, 2) as minutos_total,
  s.sessao_aberta_desde
from tarefas t
left join lateral (
  select
    sum(extract(epoch from (se.fim - se.inicio))) filter (where se.fim is not null) as segundos,
    min(se.inicio) filter (where se.fim is null) as sessao_aberta_desde
  from sessoes se where se.tarefa_id = t.id
) s on true
left join lateral (
  select sum(aj.minutos_delta)::int as minutos_ajuste
  from ajustes_tempo aj where aj.tarefa_id = t.id
) a on true;

create view v_semana_frente
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
                     and t.responsavel_real_id <> t.escalado_id)    as desvios_escala,
  count(*) filter (where t.excecao is not null and t.excecao <> '') as excecoes,
  sum(t.estimativa_min)                                             as minutos_previstos,
  round(sum(vt.minutos_total), 1)                                   as minutos_medidos
from tarefas t
join eventos e on e.id = t.evento_id
join frentes f on f.id = t.frente_id
join v_tempo_tarefa vt on vt.tarefa_id = t.id
group by t.frente_id, f.sigla, f.nome, date_trunc('week', e.data);

create view v_mes_pessoa
with (security_invoker = true) as
select
  p.id as pessoa_id, p.nome, t.competencia,
  count(*)                                           as tarefas,
  count(*) filter (where t.status = 'entregue')      as entregues,
  count(*) filter (where t.status = 'fora_do_prazo') as fora_do_prazo,
  count(*) filter (where t.escalado_id <> p.id)      as cobriu_outra_pessoa,
  sum(t.estimativa_min)                              as minutos_previstos,
  round(sum(vt.minutos_total), 1)                    as minutos_medidos,
  case when sum(t.estimativa_min) > 0
       then round(100.0 * (sum(vt.minutos_total) - sum(t.estimativa_min)) / sum(t.estimativa_min))
  end                                                as desvio_pct
from tarefas t
join pessoas p on p.id = coalesce(t.responsavel_real_id, t.escalado_id)
join v_tempo_tarefa vt on vt.tarefa_id = t.id
group by p.id, p.nome, t.competencia;

create view v_taxa_real
with (security_invoker = true) as
select
  t.atividade, t.competencia,
  count(*)                                                                 as amostras,
  max(t.estimativa_min)                                                    as taxa_vigente_min,
  round(avg(vt.minutos_total))::int                                        as media_medida_min,
  round(percentile_cont(0.5) within group (order by vt.minutos_total))::int as mediana_medida_min,
  round(100.0 * (avg(vt.minutos_total) - max(t.estimativa_min)) / max(t.estimativa_min)) as desvio_pct
from tarefas t
join v_tempo_tarefa vt on vt.tarefa_id = t.id
where t.status in ('entregue','fora_do_prazo')
  and vt.segundos_cronometro > 0
group by t.atividade, t.competencia;
