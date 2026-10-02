-- Teste de outubro do Yuri (mensagem de 30/09 + commit 96838ab de ymuanes/opec-dimensionamento,
-- entregaveis/ e decisoes/log.md; ainda nao oficializado em config/): em FI, OL, PR e CP,
-- `sincronizacao` + `auditoria` viram UMA tarefa, com 20% menos horas que a soma.
-- 0,8 x (90 + 120) = 168 min. Nacional, Kings e compacto nao mudam.

alter table taxas   drop constraint taxas_atividade_check;
alter table cadeia  drop constraint cadeia_atividade_check;
alter table tarefas drop constraint tarefas_atividade_check;
alter table mapa    drop constraint mapa_atividade_check;
do $$
declare t text;
begin
  foreach t in array array['taxas','cadeia','tarefas','mapa'] loop
    execute format($f$alter table %I add constraint %I_atividade_check
      check (atividade in ('materiais','sincronizacao','roteiro','auditoria',
                           'materiais_sinc','roteiro_auditoria','compacto',
                           'sinc_auditoria'))$f$, t, t);
  end loop;
end $$;

insert into taxas (atividade, minutos, vigente_de, fonte) values
  ('sinc_auditoria', 168, '2026-10-01',
   'premissa do Yuri 30/09: 20% a menos que sincronizacao+auditoria (0,8 x 210); commit 96838ab do dimensionamento');
