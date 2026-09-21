-- A varredura de 3 semanas trouxe dois marcadores que a escala ja trata como excecao
-- e que eu nao conhecia: [SEM NARRACAO] e Pre Jogo. Viram tipo proprio, para nao gerar
-- cadeia e para ficarem contaveis em vez de sumirem.
alter table eventos drop constraint eventos_tipo_check;
alter table eventos add constraint eventos_tipo_check
  check (tipo in ('normal','reprise','gravacao','externa','sem_narracao','pre_jogo'));

update eventos set tipo = 'sem_narracao' where evento_id_origem ilike '%[sem narra%';
update eventos set tipo = 'pre_jogo'
  where tipo = 'normal' and evento_id_origem ilike '%pré jogo%';

delete from tarefas t
using eventos e
where e.id = t.evento_id
  and e.tipo in ('reprise','gravacao','externa','sem_narracao','pre_jogo')
  and not exists (select 1 from sessoes s       where s.tarefa_id = t.id)
  and not exists (select 1 from ajustes_tempo a where a.tarefa_id = t.id);
