-- Importado de config/mapa_aprovado.csv, colunas `out`, `nov` e `dez`, no mesmo commit
-- a7a7f864 (14/09/2026) de onde veio setembro (005). A 005 so trouxe `set`, e por isso
-- gerar_tarefas devolvia 363 "sem escalado" em 28/09: outubro existia no CSV e nao aqui.
-- Tarefa nasce com o evento (decisao 28/09), entao o mapa entra ate onde o Yuri aprovou.
-- KG continua fora: so teve mapa em agosto. Vitor nao aparece: zerado desde 01/09.
insert into mapa (frente_id, atividade, competencia, pessoa_id, origem_commit)
select f.id, m.atividade, m.mes, p.id, 'a7a7f864bf37f365aa834651a999980e02d45611'
from (values
  -- outubro
  ('CP','auditoria',        date '2026-10-01', 'Juliana'),
  ('CP','materiais',        date '2026-10-01', 'Pedro'),
  ('CP','roteiro',          date '2026-10-01', 'Bárbara'),
  ('CP','sincronizacao',    date '2026-10-01', 'Lucas'),
  ('FI','auditoria',        date '2026-10-01', 'Lucas'),
  ('FI','materiais',        date '2026-10-01', 'Bárbara'),
  ('FI','roteiro',          date '2026-10-01', 'Julia'),
  ('FI','sincronizacao',    date '2026-10-01', 'Pedro'),
  ('NA','materiais_sinc',   date '2026-10-01', 'Juliana'),
  ('NA','roteiro_auditoria',date '2026-10-01', 'Daniel'),
  ('OL','auditoria',        date '2026-10-01', 'Bárbara'),
  ('OL','materiais',        date '2026-10-01', 'Juliana'),
  ('OL','roteiro',          date '2026-10-01', 'Pedro'),
  ('OL','sincronizacao',    date '2026-10-01', 'Gabriel'),
  ('PR','auditoria',        date '2026-10-01', 'Gabriel'),
  ('PR','materiais',        date '2026-10-01', 'Julia'),
  ('PR','roteiro',          date '2026-10-01', 'Lucas'),
  ('PR','sincronizacao',    date '2026-10-01', 'Juliana'),
  -- novembro
  ('CP','auditoria',        date '2026-11-01', 'Juliana'),
  ('CP','materiais',        date '2026-11-01', 'Pedro'),
  ('CP','roteiro',          date '2026-11-01', 'Bárbara'),
  ('CP','sincronizacao',    date '2026-11-01', 'Lucas'),
  ('FI','auditoria',        date '2026-11-01', 'Bárbara'),
  ('FI','materiais',        date '2026-11-01', 'Julia'),
  ('FI','roteiro',          date '2026-11-01', 'Lucas'),
  ('FI','sincronizacao',    date '2026-11-01', 'Gabriel'),
  ('NA','materiais_sinc',   date '2026-11-01', 'Juliana'),
  ('NA','roteiro_auditoria',date '2026-11-01', 'Daniel'),
  ('OL','auditoria',        date '2026-11-01', 'Julia'),
  ('OL','materiais',        date '2026-11-01', 'Bárbara'),
  ('OL','roteiro',          date '2026-11-01', 'Juliana'),
  ('OL','sincronizacao',    date '2026-11-01', 'Pedro'),
  ('PR','auditoria',        date '2026-11-01', 'Pedro'),
  ('PR','materiais',        date '2026-11-01', 'Lucas'),
  ('PR','roteiro',          date '2026-11-01', 'Gabriel'),
  ('PR','sincronizacao',    date '2026-11-01', 'Julia'),
  -- dezembro
  ('CP','auditoria',        date '2026-12-01', 'Juliana'),
  ('CP','materiais',        date '2026-12-01', 'Pedro'),
  ('CP','roteiro',          date '2026-12-01', 'Bárbara'),
  ('CP','sincronizacao',    date '2026-12-01', 'Lucas'),
  ('FI','auditoria',        date '2026-12-01', 'Lucas'),
  ('FI','materiais',        date '2026-12-01', 'Bárbara'),
  ('FI','roteiro',          date '2026-12-01', 'Julia'),
  ('FI','sincronizacao',    date '2026-12-01', 'Pedro'),
  ('NA','materiais_sinc',   date '2026-12-01', 'Juliana'),
  ('NA','roteiro_auditoria',date '2026-12-01', 'Daniel'),
  ('OL','auditoria',        date '2026-12-01', 'Bárbara'),
  ('OL','materiais',        date '2026-12-01', 'Gabriel'),
  ('OL','roteiro',          date '2026-12-01', 'Pedro'),
  ('OL','sincronizacao',    date '2026-12-01', 'Julia'),
  ('PR','auditoria',        date '2026-12-01', 'Gabriel'),
  ('PR','materiais',        date '2026-12-01', 'Julia'),
  ('PR','roteiro',          date '2026-12-01', 'Lucas'),
  ('PR','sincronizacao',    date '2026-12-01', 'Juliana')
) as m(sigla, atividade, mes, pessoa)
join frentes f on f.sigla = m.sigla
join pessoas p on p.nome  = m.pessoa
on conflict (frente_id, atividade, competencia) do nothing;
