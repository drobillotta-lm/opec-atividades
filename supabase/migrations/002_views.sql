-- Tempo de uma tarefa: sessoes fechadas + ajustes manuais, separados na origem.
create view v_tempo_tarefa
with (security_invoker = true) as
select
  t.id as tarefa_id,
  coalesce(s.minutos_cronometro, 0) as minutos_cronometro,
  coalesce(a.minutos_ajuste, 0)     as minutos_ajuste,
  coalesce(s.minutos_cronometro, 0) + coalesce(a.minutos_ajuste, 0) as minutos_total,
  s.sessao_aberta_desde
from tarefas t
left join lateral (
  select
    sum(extract(epoch from (se.fim - se.inicio)) / 60) filter (where se.fim is not null)::int as minutos_cronometro,
    min(se.inicio) filter (where se.fim is null) as sessao_aberta_desde
  from sessoes se where se.tarefa_id = t.id
) s on true
left join lateral (
  select sum(aj.minutos_delta)::int as minutos_ajuste
  from ajustes_tempo aj where aj.tarefa_id = t.id
) a on true;

-- O fechamento semanal que hoje sai do fechar_semana.py.
create view v_semana_frente
with (security_invoker = true) as
select
  t.frente_id,
  f.sigla,
  f.nome as frente,
  date_trunc('week', e.data)::date as semana,
  count(*)                                                              as tarefas,
  count(*) filter (where t.status = 'entregue')                         as entregues,
  count(*) filter (where t.status = 'pendente')                         as pendentes,
  count(*) filter (where t.status = 'fora_do_prazo')                    as fora_do_prazo,
  count(*) filter (where t.status = 'na')                               as nao_aplicaveis,
  count(*) filter (where t.responsavel_real_id is not null
                     and t.responsavel_real_id <> t.escalado_id)        as desvios_escala,
  count(*) filter (where t.excecao is not null and t.excecao <> '')     as excecoes,
  sum(t.estimativa_min)                                                 as minutos_previstos,
  sum(vt.minutos_total)                                                 as minutos_medidos
from tarefas t
join eventos e on e.id = t.evento_id
join frentes f on f.id = t.frente_id
join v_tempo_tarefa vt on vt.tarefa_id = t.id
group by t.frente_id, f.sigla, f.nome, date_trunc('week', e.data);

-- O mes por pessoa: medido contra previsto, e o que precisa de atencao.
create view v_mes_pessoa
with (security_invoker = true) as
select
  p.id as pessoa_id,
  p.nome,
  t.competencia,
  count(*)                                                          as tarefas,
  count(*) filter (where t.status = 'entregue')                     as entregues,
  count(*) filter (where t.status = 'fora_do_prazo')                as fora_do_prazo,
  count(*) filter (where t.escalado_id <> p.id)                     as cobriu_outra_pessoa,
  sum(t.estimativa_min)                                             as minutos_previstos,
  sum(vt.minutos_total)                                             as minutos_medidos,
  case when sum(t.estimativa_min) > 0
       then round(100.0 * (sum(vt.minutos_total) - sum(t.estimativa_min)) / sum(t.estimativa_min))
  end                                                               as desvio_pct
from tarefas t
join pessoas p on p.id = coalesce(t.responsavel_real_id, t.escalado_id)
join v_tempo_tarefa vt on vt.tarefa_id = t.id
group by p.id, p.nome, t.competencia;

-- Diz se config/taxas.yaml ainda vale. So conta tarefa entregue e cronometrada.
create view v_taxa_real
with (security_invoker = true) as
select
  t.atividade,
  t.competencia,
  count(*)                                    as amostras,
  max(t.estimativa_min)                       as taxa_vigente_min,
  round(avg(vt.minutos_total))::int           as media_medida_min,
  round(percentile_cont(0.5) within group (order by vt.minutos_total))::int as mediana_medida_min,
  round(100.0 * (avg(vt.minutos_total) - max(t.estimativa_min)) / max(t.estimativa_min)) as desvio_pct
from tarefas t
join v_tempo_tarefa vt on vt.tarefa_id = t.id
where t.status in ('entregue','fora_do_prazo')
  and vt.minutos_cronometro > 0
group by t.atividade, t.competencia;
