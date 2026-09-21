-- Nem toda atividade da cadeia acontece depois do evento. Materiais e roteiro sao
-- preparacao, acontecem antes; auditoria e depois. Entao a semana de uma pessoa nao e
-- "os eventos desta semana": e o trabalho cuja janela cai nesta semana, e ele vem de
-- evento da semana passada e tambem da semana que vem.
--
-- Os deslocamentos abaixo sao em dias relativos a data do evento, negativo = antes.
-- Sao um PALPITE inicial, deliberadamente generoso, para nao travar o app: o Daniel
-- disse que prefere tarefa a mais e corrigir depois. Cada linha e editavel.
alter table cadeia add column abre_offset_dias  integer not null default 0;
alter table cadeia add column prazo_offset_dias integer not null default 2;

update cadeia set abre_offset_dias = -3, prazo_offset_dias = -1 where atividade = 'materiais';
update cadeia set abre_offset_dias = -3, prazo_offset_dias = -1 where atividade = 'roteiro';
update cadeia set abre_offset_dias = -1, prazo_offset_dias =  0 where atividade = 'sincronizacao';
update cadeia set abre_offset_dias =  0, prazo_offset_dias =  2 where atividade = 'auditoria';
update cadeia set abre_offset_dias = -2, prazo_offset_dias =  0 where atividade = 'materiais_sinc';
update cadeia set abre_offset_dias = -3, prazo_offset_dias =  2 where atividade = 'roteiro_auditoria';
update cadeia set abre_offset_dias =  0, prazo_offset_dias =  2 where atividade = 'compacto';

-- A tarefa passa a carregar a propria janela, nao so o prazo.
alter table tarefas add column abre_em date;
create index tarefas_janela_idx on tarefas (abre_em, prazo_em);

-- Recalcula a janela das tarefas que ja existem.
update tarefas t
   set abre_em  = (e.data + c.abre_offset_dias),
       prazo_em = (e.data + c.prazo_offset_dias + 1)::timestamptz - interval '1 second'
  from eventos e
  join cadeia c
    on (c.competicao_id = e.competicao_id)
    or (c.competicao_id is null and c.frente_id = e.frente_id
        and not exists (select 1 from cadeia c2 where c2.competicao_id = e.competicao_id))
 where e.id = t.evento_id and c.atividade = t.atividade;

alter table tarefas alter column abre_em set not null;

-- A semana de uma pessoa: tarefa cuja janela cruza a semana pedida.
create or replace function tarefas_da_semana(p_inicio date, p_fim date)
returns setof tarefas
language sql stable set search_path = public as $$
  select t.* from tarefas t
  where t.abre_em <= p_fim and t.prazo_em >= p_inicio::timestamptz
$$;
