-- 055 (12/11/2026): distribuição de novembro do Yuri, ajuste válido de 12/11
-- (ymuanes/opec-dimensionamento 79e9f17, entregaveis/mapa_novembro_ajuste.json).
--   * Julia 100% em redes: sai de tudo. Sincronização fica com quem faz a auditoria.
--   * Duplas do Yuri (a/b) = escalado/dupla aqui (os dois veem a tarefa).
--   * Férias do Lucas 23/11 a 07/12: Juliana + Pedro em auditoria e sinc de FI; Juliana em materiais de PR.
--   * Copas FIFA: líder passa de Julia para Gabriel Duarte.
--   * Dezembro: o Yuri ainda não definiu; fica igual a novembro (provisório) para não deixar a Julia.
-- Dados, não esquema. Rodada via Supabase MCP apply_migration.

-- 1) Pendentes de evento ANTES de 12/11 ficam com quem estava (a regra nova vale de 12/11).
--    dono_manual impede que o reaplicar_mapa abaixo (e o de hora em hora) mexa nelas.
update tarefas t
   set dono_manual = true,
       obs = private.anotar(t.obs, 'mantida com o dono antigo: distribuição do Yuri vale de 12/11')
  from eventos e
 where e.id = t.evento_id and t.status = 'pendente' and t.origem = 'cadeia' and not t.dono_manual
   and t.competencia = '2026-11-01' and e.data < '2026-11-12';

-- 2) Mapa de novembro e dezembro.
with p(nome, id) as (values
  ('Bárbara', '992c93be-dd3b-4ad2-ad46-561f8828a02d'::uuid), ('Daniel', 'cd56bd1f-805a-4ab7-81e1-bd6aad07c511'::uuid),
  ('Gabriel', '2eb854be-80fc-4804-bec2-ab4e49dfea4e'::uuid), ('Juliana', 'ecbd86f6-f6c5-4b4a-be84-6164daa047d9'::uuid),
  ('Lucas',   '267da00c-eb19-420d-a498-f6a4d38df63f'::uuid), ('Pedro',  '12074cc8-5af4-4443-bff1-3c11e8410184'::uuid)),
novo(sigla, atividade, escalado, dupla) as (values
  ('CP','materiais','Pedro',null), ('CP','roteiro','Bárbara',null),
  ('CP','sincronizacao','Juliana',null), ('CP','auditoria','Juliana',null), ('CP','sinc_auditoria','Juliana',null),
  ('FI','materiais','Bárbara',null), ('FI','roteiro','Gabriel',null),
  ('FI','sincronizacao','Lucas',null), ('FI','auditoria','Lucas',null), ('FI','sinc_auditoria','Lucas',null),
  ('OL','materiais','Pedro','Juliana'), ('OL','roteiro','Juliana','Bárbara'),
  ('OL','sincronizacao','Gabriel','Bárbara'), ('OL','auditoria','Gabriel','Bárbara'), ('OL','sinc_auditoria','Gabriel','Bárbara'),
  ('PR','materiais','Lucas',null), ('PR','roteiro','Gabriel',null),
  ('PR','sincronizacao','Pedro',null), ('PR','auditoria','Pedro',null), ('PR','sinc_auditoria','Pedro',null)),
comp(c) as (values ('2026-11-01'::date), ('2026-12-01'::date))
insert into mapa (frente_id, atividade, competencia, pessoa_id, dupla_id, origem_commit)
select f.id, n.atividade, comp.c, pe.id, pd.id, 'Yuri 79e9f17: distribuição válida de 12/11'
  from novo n cross join comp
  join frentes f on f.sigla = n.sigla
  join p pe on pe.nome = n.escalado
  left join p pd on pd.nome = n.dupla
on conflict (frente_id, atividade, competencia)
  do update set pessoa_id = excluded.pessoa_id, dupla_id = excluded.dupla_id,
                origem_commit = excluded.origem_commit, importado_em = now();

select * from reaplicar_mapa('2026-11-01');
select * from reaplicar_mapa('2026-12-01');

-- 3) Férias do Lucas (23/11 a 07/12): cobertura por tarefa, presa com dono_manual.
--    Tarefas desse período geradas DEPOIS desta migration nascem com o Lucas: rodar de novo
--    o bloco abaixo (é idempotente) até o gerar_tarefas alcançar 07/12 (por volta de 17/11).
update tarefas t
   set escalado_id = 'ecbd86f6-f6c5-4b4a-be84-6164daa047d9', -- Juliana
       dupla_id = case when f.sigla = 'FI' then '12074cc8-5af4-4443-bff1-3c11e8410184'::uuid end, -- Pedro
       dono_manual = true,
       obs = private.anotar(t.obs, 'férias do Lucas (23/11 a 07/12): cobertura definida pelo Yuri')
  from eventos e, frentes f
 where e.id = t.evento_id and f.id = t.frente_id
   and t.status = 'pendente' and e.data between '2026-11-23' and '2026-12-07'
   and t.escalado_id = '267da00c-eb19-420d-a498-f6a4d38df63f'
   and ((f.sigla = 'FI' and t.atividade in ('sincronizacao','auditoria','sinc_auditoria'))
     or (f.sigla = 'PR' and t.atividade = 'materiais'))
   and not exists (select 1 from sessoes s where s.tarefa_id = t.id);

-- 4) Líder de Copas FIFA.
update frentes set lider_id = '2eb854be-80fc-4804-bec2-ab4e49dfea4e', updated_at = now() where sigla = 'CP';
