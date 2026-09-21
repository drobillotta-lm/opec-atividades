-- So conta como atividade o evento que tem entrega comercial. Quem decide isso e o
-- lider, na coluna "tem entrega?" da planilha Escala OPEC. Como ela so comecou a ser
-- preenchida em setembro (68% do mes; 0% em todos os meses anteriores), o app parte de
-- um padrao por competicao e deixa o lider confirmar evento a evento.
alter table competicoes add column entrega_padrao text not null default 'lider_decide'
  check (entrega_padrao in ('sim','nao','lider_decide'));

alter table eventos add column entrega boolean;
alter table eventos add column entrega_origem text
  check (entrega_origem in ('previsto','escala','lider'));
create index eventos_entrega_pendente_idx on eventos (data) where entrega is null;

-- Padroes derivados de setembro/2026 na propria planilha da escala. Contagem real:
--   Copa do Mundo Sub-20  12 Sim   0 Nao
--   Europa/Conference      5 Sim   0 Nao
--   Programa CazeTV       23 Sim   2 Nao
--   Olimpicos             18 Sim   2 Nao
--   Ligue 1                6 Sim   0 Nao
--   Bundesliga             4 Sim   0 Nao
--   Italiano/Premier/Brasileirao/Intercontinental: so Sim
--   La Liga               17 Nao   7 Sim   <- unico caso em que Nao domina
--   Copa ACERJ             2 Nao   0 Sim
update competicoes set entrega_padrao = 'sim'
  where frente_id = (select id from frentes where sigla='OL')
     or nome in ('Copa do Mundo Feminina Sub-20 2026','Ligue 1 2026','Bundesliga 2026',
                 'Premier League 2026','Série A Italiana 2026','Brasileirão 2026',
                 'Programa Geral CazéTV 2026','Programa Roda de Bobo 2026',
                 'Programa "Quem Fez, Fez!" 2026','Programa Seis em Um 2026',
                 'Programa Noche de Copa: Highlights e Near Live Clips Liberta e Sula 2026');

update competicoes set entrega_padrao = 'nao' where nome = 'La Liga 2026';

-- Eventos Especiais e saco de gatos: no Airtable ele abriga Convocacao de Selecao,
-- Copa ACERJ (que tem entrega Nao na escala), Creators Cup e gravacao comercial.
-- Nao da para ter padrao; o lider decide caso a caso.
update competicoes set entrega_padrao = 'lider_decide' where nome = 'Eventos Especiais 2026';

-- Aplica a previsao nos eventos ja sincronizados que ninguem decidiu ainda.
update eventos e
   set entrega = case c.entrega_padrao when 'sim' then true when 'nao' then false else null end,
       entrega_origem = case when c.entrega_padrao in ('sim','nao') then 'previsto' else null end
  from competicoes c
 where c.id = e.competicao_id
   and e.entrega_origem is distinct from 'lider'
   and e.entrega_origem is distinct from 'escala';

-- Tarefa de evento sem entrega confirmada sai, desde que ninguem tenha medido tempo nela.
delete from tarefas t
using eventos e
where e.id = t.evento_id
  and coalesce(e.entrega, false) = false
  and not exists (select 1 from sessoes s       where s.tarefa_id = t.id)
  and not exists (select 1 from ajustes_tempo a where a.tarefa_id = t.id);
