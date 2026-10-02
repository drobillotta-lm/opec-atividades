-- Notch nativo no Windows (decisao 02/10, modelo do Codenotch): o app instalado nao faz
-- login Google. A pessoa gera um codigo no site (uso unico, 5 minutos) e o app troca por um
-- token proprio daquele aparelho, revogavel, que so mexe no cronometro dela.
-- Codigo e token so existem aqui como hash (sha256): vazar a tabela nao entrega acesso.

create table notch_codigos (
  codigo_hash  text primary key,
  pessoa_id    uuid not null references pessoas(id) on delete cascade,
  criado_em    timestamptz not null default now(),
  expira_em    timestamptz not null default now() + interval '5 minutes',
  usado_em     timestamptz
);
create index notch_codigos_pessoa_idx on notch_codigos (pessoa_id);

create table notch_dispositivos (
  id              uuid primary key default gen_random_uuid(),
  pessoa_id       uuid not null references pessoas(id) on delete cascade,
  nome            text not null default 'Windows',
  token_hash      text not null unique,
  criado_em       timestamptz not null default now(),
  ultimo_uso_em   timestamptz,
  revogado_em     timestamptz
);
create index notch_dispositivos_pessoa_idx on notch_dispositivos (pessoa_id) where revogado_em is null;

-- Escrita so pelo servidor (service role). A pessoa le os proprios aparelhos; gestor le todos.
alter table notch_codigos enable row level security;
alter table notch_dispositivos enable row level security;
create policy le_meus_dispositivos on notch_dispositivos for select to authenticated
  using (pessoa_id = private.eu() or private.sou_gestor());
