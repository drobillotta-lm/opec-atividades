-- Importado de config/mapa_aprovado.csv, coluna `set`, no commit a7a7f864 (14/09/2026).
-- Decisao do Yuri. O app le, nunca escreve.
-- KG nao entra: so teve mapa em agosto. Vitor nao aparece: zerado desde 01/09.
insert into mapa (frente_id, atividade, competencia, pessoa_id, origem_commit)
select f.id, m.atividade, date '2026-09-01', p.id, 'a7a7f864bf37f365aa834651a999980e02d45611'
from (values
  ('CP','auditoria',        'Juliana'),
  ('CP','materiais',        'Lucas'),
  ('CP','roteiro',          'Pedro'),
  ('CP','sincronizacao',    'Bárbara'),
  ('FI','auditoria',        'Bárbara'),
  ('FI','materiais',        'Julia'),
  ('FI','roteiro',          'Lucas'),
  ('FI','sincronizacao',    'Gabriel'),
  ('NA','materiais_sinc',   'Juliana'),
  ('NA','roteiro_auditoria','Daniel'),
  ('OL','auditoria',        'Pedro'),
  ('OL','materiais',        'Gabriel'),
  ('OL','roteiro',          'Julia'),
  ('OL','sincronizacao',    'Bárbara'),
  ('PR','auditoria',        'Lucas'),
  ('PR','materiais',        'Gabriel'),
  ('PR','roteiro',          'Juliana'),
  ('PR','sincronizacao',    'Pedro')
) as m(sigla, atividade, pessoa)
join frentes f on f.sigla = m.sigla
join pessoas p on p.nome  = m.pessoa;
