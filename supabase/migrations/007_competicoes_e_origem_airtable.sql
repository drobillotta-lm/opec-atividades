-- De onde vem a frente de cada evento. Hoje isso e uma lista escrita a mao dentro do
-- gerar_semana.py; competicao que nao esta la some do acompanhamento sem avisar ninguem.
-- Aqui vira dado: frente_id nulo significa "precisa classificar", e aparece no Admin.
create table competicoes (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null unique,
  frente_id  uuid references frentes(id),
  ativa      boolean not null default true,
  origem     text not null default 'manual' check (origem in ('dimensionamento','airtable','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index competicoes_sem_frente_idx on competicoes (nome) where frente_id is null;
create trigger competicoes_set_updated_at before update on competicoes
  for each row execute function private.set_updated_at();

alter table competicoes enable row level security;
create policy le_competicoes on competicoes for select to authenticated
  using (private.eu() is not null);
create policy gestor_escreve_competicoes on competicoes for all to authenticated
  using (private.sou_gestor()) with check (private.sou_gestor());

-- eventos passa a carregar a origem no Airtable, pra sincronizacao incremental.
alter table eventos
  add column airtable_record_id text unique,
  add column competicao_id      uuid references competicoes(id),
  add column status_origem      text check (status_origem in ('TBD','Confirmado','Cancelado','Finalizado')),
  add column detentor           text,
  add column inicio_brt         timestamptz,
  add column last_modified      timestamptz,
  add column sincronizado_em    timestamptz;

create index eventos_last_modified_idx on eventos (last_modified);
create index eventos_competicao_idx    on eventos (competicao_id);

-- Semeado a partir do mapeamento que hoje vive no gerar_semana.py, no commit a7a7f864.
-- Ficam de fora, por decisao do Daniel em 21/09/2026, quatro programas antigos que nao
-- devem voltar: CazeTV Live, BR-360, CopaZona e ReCopando.
-- Copas FIFA (CP) nasce sem nenhuma competicao de proposito: nao existe uma sequer
-- mapeada hoje, e e por isso que a frente nunca gerou acompanhamento.
insert into competicoes (nome, frente_id, origem)
select c.nome, f.id, 'dimensionamento'
from (values
  ('La Liga 2026','FI'),
  ('Ligue 1 2026','FI'),
  ('Bundesliga 2026','FI'),
  ('Premier League 2026','FI'),
  ('Série A Italiana 2026','FI'),
  ('ATP Challenger 2026','OL'),
  ('Copa Davis 2026','OL'),
  ('Challengers BRASIL 2026','OL'),
  ('WTT Champions 2026','OL'),
  ('WTT Finals 2026','OL'),
  ('WTT Star Contender 2026','OL'),
  ('Grand Smashes 2026','OL'),
  ('ITTF Mixed Team World Cups 2026','OL'),
  ('PRO TOUR STU 2026','OL'),
  ('Grand Prix de Judô 2026','OL'),
  ('Grand Slam de Judô 2026','OL'),
  ('Mundial de Judô 2026','OL'),
  ('Mundial de Ginástica Artística 2026','OL'),
  ('Mundial de Ginástica Rítmica 2026','OL'),
  ('Copas do Mundo de Canoagem de Velocidade e Slalom 2026','OL'),
  ('Circuito World Taekwondo 2026','OL'),
  ('Copa do Mundo de Basquete Feminino (FIBA) 2026','OL'),
  ('Eliminatórias da Copa do Mundo de Basquete Masculino (FIBA) 2026','OL'),
  ('Eliminatórias da Copa do Mundo de Basquete Masculino (FIBA) 2027','OL'),
  ('Programa Geral CazéTV 2026','PR'),
  ('Programa Roda de Bobo 2026','PR'),
  ('Programa Noche de Copa: Highlights e Near Live Clips Liberta e Sula 2026','PR'),
  ('Eventos Especiais 2026','PR'),
  ('Brasileirão 2026','NA'),
  ('Paulistão F 2026','NA'),
  ('Kings League World Cup Nations 2027','KG'),
  ('Kings World Cup Clubs 2027','KG')
) as c(nome, sigla)
join frentes f on f.sigla = c.sigla;
