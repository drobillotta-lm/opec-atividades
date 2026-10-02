-- Quem faz o que em outubro: teste do Yuri (mensagem de 30/09, tabela "Quem faz o que em
-- outubro" e commit 96838ab de ymuanes/opec-dimensionamento). Ainda nao esta em
-- config/mapa_aprovado.csv: o README dele lista isso como pendencia.
-- Nacional nao muda (fica o que a 026 importou). Lider nao executa a propria frente.

update frentes set nome = 'Olímpicos + Tênis' where sigla = 'OL';

-- A 026 importou out/nov/dez com a cadeia antiga (sincronizacao, auditoria); sai tudo das
-- quatro frentes que mudaram de cadeia.
delete from mapa m
 using frentes f
 where f.id = m.frente_id and f.sigla in ('FI','OL','PR','CP')
   and m.competencia in ('2026-10-01','2026-11-01','2026-12-01');

insert into mapa (frente_id, atividade, competencia, pessoa_id, dupla_id, origem_commit)
select f.id, x.atividade, x.mes, p.id, d.id,
       case x.fonte
         when 'yuri' then 'ymuanes/opec-dimensionamento 96838ab entregaveis/atribuicoes_outubro.html (teste de outubro, nao oficializado em config/)'
         else 'provisorio: replicado de outubro por decisao do Daniel 02/10, a confirmar com o Yuri'
       end
from (values
  -- outubro: teste do Yuri
  ('FI','materiais',     date '2026-10-01','Lucas',   null,   'yuri'),
  ('FI','roteiro',       date '2026-10-01','Bárbara', null,   'yuri'),
  ('FI','sinc_auditoria',date '2026-10-01','Julia',   'Pedro','yuri'),
  ('OL','materiais',     date '2026-10-01','Bárbara', null,   'yuri'),
  ('OL','roteiro',       date '2026-10-01','Pedro',   null,   'yuri'),
  ('OL','sinc_auditoria',date '2026-10-01','Juliana', null,   'yuri'),
  ('PR','materiais',     date '2026-10-01','Julia',   null,   'yuri'),
  ('PR','roteiro',       date '2026-10-01','Lucas',   null,   'yuri'),
  ('PR','sinc_auditoria',date '2026-10-01','Gabriel', null,   'yuri'),
  ('CP','materiais',     date '2026-10-01','Gabriel', null,   'yuri'),
  ('CP','roteiro',       date '2026-10-01','Juliana', null,   'yuri'),
  ('CP','sinc_auditoria',date '2026-10-01','Bárbara', null,   'yuri'),
  -- Copas FIFA: mesmo trio ate dezembro (Yuri)
  ('CP','materiais',     date '2026-11-01','Gabriel', null,   'yuri'),
  ('CP','roteiro',       date '2026-11-01','Juliana', null,   'yuri'),
  ('CP','sinc_auditoria',date '2026-11-01','Bárbara', null,   'yuri'),
  ('CP','materiais',     date '2026-12-01','Gabriel', null,   'yuri'),
  ('CP','roteiro',       date '2026-12-01','Juliana', null,   'yuri'),
  ('CP','sinc_auditoria',date '2026-12-01','Bárbara', null,   'yuri'),
  -- FI/OL/PR em nov e dez: copia de outubro, provisoria (decisao do Daniel 02/10)
  ('FI','materiais',     date '2026-11-01','Lucas',   null,   'prov'),
  ('FI','roteiro',       date '2026-11-01','Bárbara', null,   'prov'),
  ('FI','sinc_auditoria',date '2026-11-01','Julia',   'Pedro','prov'),
  ('OL','materiais',     date '2026-11-01','Bárbara', null,   'prov'),
  ('OL','roteiro',       date '2026-11-01','Pedro',   null,   'prov'),
  ('OL','sinc_auditoria',date '2026-11-01','Juliana', null,   'prov'),
  ('PR','materiais',     date '2026-11-01','Julia',   null,   'prov'),
  ('PR','roteiro',       date '2026-11-01','Lucas',   null,   'prov'),
  ('PR','sinc_auditoria',date '2026-11-01','Gabriel', null,   'prov'),
  ('FI','materiais',     date '2026-12-01','Lucas',   null,   'prov'),
  ('FI','roteiro',       date '2026-12-01','Bárbara', null,   'prov'),
  ('FI','sinc_auditoria',date '2026-12-01','Julia',   'Pedro','prov'),
  ('OL','materiais',     date '2026-12-01','Bárbara', null,   'prov'),
  ('OL','roteiro',       date '2026-12-01','Pedro',   null,   'prov'),
  ('OL','sinc_auditoria',date '2026-12-01','Juliana', null,   'prov'),
  ('PR','materiais',     date '2026-12-01','Julia',   null,   'prov'),
  ('PR','roteiro',       date '2026-12-01','Lucas',   null,   'prov'),
  ('PR','sinc_auditoria',date '2026-12-01','Gabriel', null,   'prov')
) as x(sigla, atividade, mes, pessoa, dupla, fonte)
join frentes f on f.sigla = x.sigla
join pessoas p on p.nome = x.pessoa
left join pessoas d on d.nome = x.dupla;

-- Depois do mapa, rodadas em statements separados (gerar_tarefas usa temp table), nesta
-- ordem. Rodadas fora da migration, via execute_sql, pra registrar o retorno:
--   select * from desfazer_tarefas_fora_da_cadeia();
--   select * from gerar_tarefas('2026-09-21', current_date + 21);
--   select * from reaplicar_mapa('2026-10-01');
