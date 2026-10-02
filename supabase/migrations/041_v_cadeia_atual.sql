-- O que esta valendo hoje, por frente: atividades da cadeia em vigor, taxa vigente,
-- janela e quem esta no mapa do mes corrente (com dupla e de onde veio).
create view v_cadeia_atual
with (security_invoker = true) as
select
  f.id as frente_id, f.sigla, f.nome as frente,
  c.id as cadeia_id, c.atividade, a.rotulo, c.ordem, c.escalado_regra,
  c.competicao_id, co.nome as competicao,
  c.abre_offset_dias, c.prazo_offset_dias, c.vigente_de, c.vigente_ate,
  tx.minutos as taxa_min,
  m.pessoa_id, p.nome as pessoa, m.dupla_id, d.nome as dupla, m.origem_commit
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
