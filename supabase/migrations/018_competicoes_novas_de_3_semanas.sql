-- Nove competicoes que apareceram ao varrer 14/09 a 04/10 e que o mapeamento do
-- gerar_semana.py nao conhece. Classificacao minha, para nao travar o app; o Daniel
-- corrige o que estiver errado. A mais pesada e Europa League, com 18 eventos.
insert into competicoes (nome, frente_id, origem, entrega_padrao, ativa) values
  -- Futebol europeu: e Fut Inter. Na escala, EUROPA/CONFERENCE teve 5 Sim e 0 Nao em setembro.
  ('Europa League 2026',                (select id from frentes where sigla='FI'), 'airtable', 'sim', true),
  -- FIFA no nome: Copas FIFA.
  ('Mundial de Clubes FIFA 2026',       (select id from frentes where sigla='CP'), 'airtable', 'sim', true),
  -- Todas as outras WTT e STU ja sao Olimpicos.
  ('WTT Contender 2026',                (select id from frentes where sigla='OL'), 'airtable', 'sim', true),
  ('STU NATIONAL 2026',                 (select id from frentes where sigla='OL'), 'airtable', 'sim', true),
  -- Programas: mesmo padrao do Programa Geral CazeTV, que tem 23 Sim e 2 Nao em setembro.
  ('Programa Central CazéTV 2026',      (select id from frentes where sigla='PR'), 'airtable', 'sim', true),
  -- Podcast: nao sei se tem entrega, entao o lider decide em vez de eu chutar.
  ('Programa Podcast Quadra Aberta 2026',(select id from frentes where sigla='PR'), 'airtable', 'lider_decide', true),
  -- Playout e passagem tecnica de sinal, nao conteudo editorial. Na escala, RJ PLAYOUT
  -- ja aparece como excecao. Deixo o lider decidir.
  ('Programa Playout 2026',             (select id from frentes where sigla='PR'), 'airtable', 'lider_decide', true),
  -- Uma competicao inteira de reprise. O Daniel ja decidiu que reprise nao gera cadeia.
  ('Programa Reprises 2026',            (select id from frentes where sigla='PR'), 'airtable', 'nao', true),
  -- BR-360: o Daniel mandou esquecer, e legado.
  ('Programa BR-360 2026',              null,                                      'airtable', 'nao', false)
on conflict (nome) do update set
  frente_id      = excluded.frente_id,
  entrega_padrao = excluded.entrega_padrao,
  ativa          = excluded.ativa;
