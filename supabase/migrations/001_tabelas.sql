-- Toca updated_at em toda alteracao.
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Espelha config/pessoas.csv do dimensionamento. Ninguem e apagado: quem sai ganha `saida`.
create table pessoas (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  email         text not null unique,
  nivel         text not null check (nivel in ('Analista Sr','Analista Pl','Estagiário')),
  h_dia         numeric not null check (h_dia > 0),
  papel         text not null check (papel in ('gestor','lider','membro')),
  entrada       date,
  saida         date,
  restrito_a    text[],
  auth_user_id  uuid unique references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table frentes (
  id         uuid primary key default gen_random_uuid(),
  sigla      text not null unique check (sigla in ('FI','OL','PR','CP','NA','KG')),
  nome       text not null,
  lider_id   uuid references pessoas(id),
  regime     text not null check (regime in ('rotacao_mensal','rotacao_torneio','dupla_fixa')),
  ativa      boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Importado de config/mapa_aprovado.csv. Decisao do Yuri; o app nunca escreve aqui por outro caminho.
create table mapa (
  id            uuid primary key default gen_random_uuid(),
  frente_id     uuid not null references frentes(id),
  atividade     text not null check (atividade in ('materiais','sincronizacao','roteiro','auditoria','materiais_sinc','roteiro_auditoria')),
  competencia   date not null,
  pessoa_id     uuid not null references pessoas(id),
  origem_commit text,
  importado_em  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (frente_id, atividade, competencia)
);

-- Um evento e competicao + data, nao jogo individual.
create table eventos (
  id               uuid primary key default gen_random_uuid(),
  evento_id_origem text not null unique,
  competicao       text not null,
  data             date not null,
  frente_id        uuid not null references frentes(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- A unidade de trabalho: evento x tarefa da cadeia assincrona.
create table tarefas (
  id                  uuid primary key default gen_random_uuid(),
  evento_id           uuid not null references eventos(id) on delete cascade,
  frente_id           uuid not null references frentes(id),
  atividade           text not null check (atividade in ('materiais','sincronizacao','roteiro','auditoria','materiais_sinc','roteiro_auditoria')),
  competencia         date not null,
  escalado_id         uuid not null references pessoas(id),
  responsavel_real_id uuid references pessoas(id),
  estimativa_min      integer not null check (estimativa_min > 0),
  prazo_em            timestamptz not null,
  status              text not null default 'pendente' check (status in ('pendente','entregue','fora_do_prazo','na')),
  concluida_em        timestamptz,
  desvio_motivo       text,
  excecao             text,
  excecao_desc        text,
  obs                 text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (evento_id, atividade)
);

create table sessoes (
  id         uuid primary key default gen_random_uuid(),
  tarefa_id  uuid not null references tarefas(id) on delete cascade,
  pessoa_id  uuid not null references pessoas(id),
  inicio     timestamptz not null default now(),
  fim        timestamptz,
  motivo_fim text check (motivo_fim in ('pausa','entrega','troca','retomada_apos_fechar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (fim is null or fim >= inicio),
  check ((fim is null and motivo_fim is null) or (fim is not null and motivo_fim is not null))
);

-- Uma sessao aberta por pessoa. Trocar de tarefa fecha a atual.
create unique index sessoes_uma_aberta_por_pessoa on sessoes (pessoa_id) where fim is null;

create table ajustes_tempo (
  id            uuid primary key default gen_random_uuid(),
  tarefa_id     uuid not null references tarefas(id) on delete cascade,
  pessoa_id     uuid not null references pessoas(id),
  minutos_delta integer not null check (minutos_delta <> 0),
  motivo        text not null check (length(btrim(motivo)) > 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Vem do app de Escala. Nunca editavel aqui.
create table plantoes (
  id           uuid primary key default gen_random_uuid(),
  pessoa_id    uuid not null references pessoas(id),
  data         date not null,
  competicao   text,
  tipo         text not null check (tipo in ('du','fds')),
  horas        numeric not null check (horas > 0),
  importado_em timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (pessoa_id, data)
);

create index tarefas_escalado_idx     on tarefas (escalado_id, competencia);
create index tarefas_responsavel_idx  on tarefas (responsavel_real_id, competencia);
create index tarefas_frente_idx       on tarefas (frente_id, competencia);
create index tarefas_prazo_idx        on tarefas (prazo_em) where status = 'pendente';
create index eventos_data_idx         on eventos (data);
create index sessoes_tarefa_idx       on sessoes (tarefa_id);
create index ajustes_tarefa_idx       on ajustes_tempo (tarefa_id);
create index mapa_competencia_idx     on mapa (competencia);
create index plantoes_pessoa_data_idx on plantoes (pessoa_id, data);

do $$
declare t text;
begin
  foreach t in array array['pessoas','frentes','mapa','eventos','tarefas','sessoes','ajustes_tempo','plantoes'] loop
    execute format('create trigger %I_set_updated_at before update on %I for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
