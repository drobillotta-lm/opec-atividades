-- Atividade deixa de ser lista fechada em check (011, 031) e vira tabela, pra dar pra
-- criar atividade nova pela tela /admin/organizar sem migration. Os 4 checks viram FK.
create table atividades (
  codigo     text primary key check (codigo ~ '^[a-z][a-z_]{1,39}$'),
  rotulo     text not null check (length(btrim(rotulo)) > 0),
  ativa      boolean not null default true,
  criado_em  timestamptz not null default now()
);

insert into atividades (codigo, rotulo) values
  ('materiais',         'Materiais'),
  ('sincronizacao',     'Sincronização'),
  ('roteiro',           'Roteiro'),
  ('auditoria',         'Auditoria'),
  ('materiais_sinc',    'Materiais e sincronização'),
  ('roteiro_auditoria', 'Roteiro e auditoria'),
  ('compacto',          'Compacto'),
  ('sinc_auditoria',    'Sincronização e auditoria');

do $$
declare t text;
begin
  foreach t in array array['taxas','cadeia','tarefas','mapa'] loop
    execute format('alter table %I drop constraint %I_atividade_check', t, t);
    execute format('alter table %I add constraint %I_atividade_fk foreign key (atividade) references atividades(codigo)', t, t);
  end loop;
end $$;

alter table atividades enable row level security;
create policy le_atividades on atividades for select to authenticated using (private.eu() is not null);
create policy gestor_escreve_atividades on atividades for all to authenticated
  using (private.sou_gestor()) with check (private.sou_gestor());
