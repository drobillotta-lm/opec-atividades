-- Fonte: config/pessoas.csv e config/decisoes.yaml do dimensionamento, lidos em 21/09/2026.
insert into pessoas (nome, email, nivel, h_dia, papel, entrada, saida, restrito_a) values
  ('Juliana', 'juliana@livemode.com',    'Analista Sr', 8, 'lider',  null,         null,         null),
  ('Bárbara', 'barbara@livemode.com',    'Analista Pl', 8, 'lider',  null,         null,         null),
  ('Julia',   'julia@livemode.com',      'Analista Pl', 8, 'lider',  null,         null,         null),
  ('Lucas',   'lucas@livemode.com',      'Analista Pl', 8, 'lider',  null,         null,         null),
  ('Gabriel', 'gabriel@livemode.com',    'Estagiário',  6, 'membro', null,         null,         null),
  ('Pedro',   'pedro@livemode.com',      'Estagiário',  6, 'membro', null,         null,         null),
  ('Daniel',  'drobillotta@livemode.com','Analista Sr', 8, 'gestor', '2026-09-01', null,         array['NA']),
  ('Vitor',   'vitor@livemode.com',      'Analista Pl', 8, 'membro', null,         '2026-09-01', null),
  ('Yuri',    'ymuanes@livemode.com',    'Analista Sr', 8, 'gestor', null,         null,         null);

-- Lider nao executa a propria frente (decisao 02/08 do dimensionamento).
insert into frentes (sigla, nome, lider_id, regime, ativa) values
  ('FI', 'Fut Inter',  (select id from pessoas where nome = 'Juliana'), 'rotacao_mensal',  true),
  ('OL', 'Olímpicos',  (select id from pessoas where nome = 'Lucas'),   'rotacao_mensal',  true),
  ('PR', 'Programas',  (select id from pessoas where nome = 'Bárbara'), 'rotacao_mensal',  true),
  ('CP', 'Copas FIFA', (select id from pessoas where nome = 'Julia'),   'rotacao_torneio', true),
  ('NA', 'Nacional',   null,                                            'dupla_fixa',      true),
  ('KG', 'Kings',      null,                                            'rotacao_mensal',  false);
