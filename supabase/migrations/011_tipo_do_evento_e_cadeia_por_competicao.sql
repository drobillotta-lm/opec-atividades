-- Decisoes do Daniel em 21/09/2026.

-- 1) 'compacto' passa a ser uma atividade valida.
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
                           'materiais_sinc','roteiro_auditoria','compacto'))$f$, t, t);
  end loop;
end $$;

-- 2) Reprise e gravacao nao geram cadeia. O tipo e derivado do texto do Match ID na
--    sincronizacao, porque a Matriz nao tem um campo proprio para isso.
alter table eventos add column tipo text not null default 'normal'
  check (tipo in ('normal','reprise','gravacao','externa'));
create index eventos_tipo_idx on eventos (tipo) where tipo <> 'normal';

-- 3) Uma competicao pode ter cadeia propria, que vence a da frente.
alter table cadeia add column competicao_id  uuid references competicoes(id);
alter table cadeia add column escalado_regra text not null default 'mapa'
  check (escalado_regra in ('mapa','lider'));
alter table cadeia drop constraint cadeia_frente_id_atividade_key;
create unique index cadeia_frente_idx     on cadeia (frente_id, atividade) where competicao_id is null;
create unique index cadeia_competicao_idx on cadeia (competicao_id, atividade) where competicao_id is not null;

-- 4) Classificacao das competicoes que chegaram sem frente.
update competicoes set frente_id = (select id from frentes where sigla='CP')
  where nome = 'Copa do Mundo Feminina Sub-20 2026';
update competicoes set frente_id = (select id from frentes where sigla='OL')
  where nome = 'Programa Compactos Olímpícos 2026';
update competicoes set frente_id = (select id from frentes where sigla='PR')
  where nome in ('Programa "Quem Fez, Fez!" 2026', 'Programa Seis em Um 2026');
-- CazeTV Live: o Daniel confirmou que e legado. Fica inativa e sem frente.
update competicoes set ativa = false where nome = 'Programa CazéTV Live 2026';

-- 5) Compacto: uma unica atividade, entregue pelo lider de Olimpicos.
--    A taxa e provisoria ate o Daniel revisar o processo do compacto.
insert into taxas (atividade, minutos, vigente_de, fonte) values
  ('compacto', 60, '2026-09-21', 'provisorio: processo do compacto a revisar com o lider de Olimpicos');

insert into cadeia (frente_id, competicao_id, atividade, ordem, escalado_regra)
select (select id from frentes where sigla='OL'),
       (select id from competicoes where nome='Programa Compactos Olímpícos 2026'),
       'compacto', 1, 'lider';

-- 6) Marcar o tipo dos eventos ja sincronizados.
update eventos set tipo = 'reprise'
  where evento_id_origem ilike 'reprise%' or evento_id_origem ilike '%| reprise%';
update eventos set tipo = 'gravacao'  where evento_id_origem ilike 'grava%';
update eventos set tipo = 'externa'   where evento_id_origem ilike 'externa%';

-- 7) Apagar as tarefas que nasceram de evento que nao devia gerar cadeia.
--    So apaga o que ninguem cronometrou nem ajustou: tempo medido nunca se perde.
delete from tarefas t
using eventos e
where e.id = t.evento_id
  and e.tipo in ('reprise','gravacao','externa')
  and not exists (select 1 from sessoes s      where s.tarefa_id = t.id)
  and not exists (select 1 from ajustes_tempo a where a.tarefa_id = t.id);
