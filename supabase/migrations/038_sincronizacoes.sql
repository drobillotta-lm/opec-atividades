-- Log de cada sincronizacao com a Escala. Antes o resumo era descartado pelo botao e o
-- relogio so deixava rastro no n8n. Escrita so pela service role (sem policy de escrita);
-- leitura so gestor. A propria sincronizacao apaga o que passa de 30 dias.
create table sincronizacoes (
  id            uuid primary key default gen_random_uuid(),
  iniciada_em   timestamptz not null default now(),
  terminada_em  timestamptz,
  disparo       text not null check (disparo in ('relogio','botao')),
  ok            boolean,
  resumo        jsonb,
  erro          text
);
create index sincronizacoes_iniciada_idx on sincronizacoes (iniciada_em desc);

alter table sincronizacoes enable row level security;
create policy gestor_le_sincronizacoes on sincronizacoes for select to authenticated
  using (private.sou_gestor());
