-- As taxas de config/taxas.yaml, com data de vigencia. Medir para poder mudar e o
-- ponto do app, entao a taxa nao pode ser constante no codigo.
create table taxas (
  id         uuid primary key default gen_random_uuid(),
  atividade  text not null check (atividade in ('materiais','sincronizacao','roteiro','auditoria','materiais_sinc','roteiro_auditoria')),
  minutos    integer not null check (minutos > 0),
  vigente_de date not null,
  fonte      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (atividade, vigente_de)
);

-- Qual cadeia cada frente executa por evento.
create table cadeia (
  id        uuid primary key default gen_random_uuid(),
  frente_id uuid not null references frentes(id),
  atividade text not null check (atividade in ('materiais','sincronizacao','roteiro','auditoria','materiais_sinc','roteiro_auditoria')),
  ordem     integer not null,
  unique (frente_id, atividade)
);

create trigger taxas_set_updated_at before update on taxas
  for each row execute function private.set_updated_at();

alter table taxas  enable row level security;
alter table cadeia enable row level security;
create policy le_taxas  on taxas  for select to authenticated using (private.eu() is not null);
create policy le_cadeia on cadeia for select to authenticated using (private.eu() is not null);
create policy gestor_escreve_taxas on taxas for all to authenticated
  using (private.sou_gestor()) with check (private.sou_gestor());

-- Medidas em campo numa semana de julho de 2026, confirmadas em 01/08.
insert into taxas (atividade, minutos, vigente_de, fonte) values
  ('materiais',          90,  '2026-08-01', 'medicao de campo jul/2026'),
  ('sincronizacao',      90,  '2026-08-01', 'medicao de campo jul/2026'),
  ('roteiro',            60,  '2026-08-01', 'medicao de campo jul/2026'),
  ('auditoria',         120,  '2026-08-01', 'medicao de campo jul/2026'),
  ('materiais_sinc',    180,  '2026-09-01', 'decisao 13-14/09: Nacional vira dupla fixa, 3h por pacote'),
  ('roteiro_auditoria', 180,  '2026-09-01', 'decisao 13-14/09: Nacional vira dupla fixa, 3h por pacote');

insert into cadeia (frente_id, atividade, ordem)
select f.id, c.atividade, c.ordem
from (values
  ('FI','materiais',1),('FI','sincronizacao',2),('FI','roteiro',3),('FI','auditoria',4),
  ('OL','materiais',1),('OL','sincronizacao',2),('OL','roteiro',3),('OL','auditoria',4),
  ('PR','materiais',1),('PR','sincronizacao',2),('PR','roteiro',3),('PR','auditoria',4),
  ('CP','materiais',1),('CP','sincronizacao',2),('CP','roteiro',3),('CP','auditoria',4),
  ('NA','materiais_sinc',1),('NA','roteiro_auditoria',2),
  ('KG','materiais_sinc',1),('KG','roteiro',2),('KG','auditoria',3)
) as c(sigla, atividade, ordem)
join frentes f on f.sigla = c.sigla;

-- A taxa vigente de uma atividade numa data.
create or replace function private.taxa_min(p_atividade text, p_data date) returns integer
language sql stable set search_path = public as $$
  select minutos from taxas
  where atividade = p_atividade and vigente_de <= p_data
  order by vigente_de desc limit 1
$$;

-- Gera as tarefas de um periodo a partir dos eventos ja sincronizados.
-- Idempotente: a chave unica (evento, atividade) faz rodar de novo nao duplicar.
-- Evento cancelado nao gera tarefa. Competicao sem frente nao gera e fica visivel no Admin.
create or replace function gerar_tarefas(p_inicio date, p_fim date)
returns table (criadas integer, ja_existiam integer, sem_escalado integer)
language plpgsql security definer set search_path = public as $$
declare
  v_criadas int := 0;
  v_sem_escalado int := 0;
  v_alvo int := 0;
begin
  select count(*) into v_alvo
  from eventos e
  join cadeia c on c.frente_id = e.frente_id
  where e.data between p_inicio and p_fim
    and coalesce(e.status_origem, 'Confirmado') <> 'Cancelado';

  with candidatas as (
    select
      e.id  as evento_id,
      e.frente_id,
      c.atividade,
      date_trunc('month', e.data)::date as competencia,
      m.pessoa_id as escalado_id,
      private.taxa_min(c.atividade, e.data) as estimativa_min,
      coalesce(e.inicio_brt, (e.data + time '23:59')::timestamptz) + interval '48 hours' as prazo_em
    from eventos e
    join cadeia c on c.frente_id = e.frente_id
    left join mapa m
      on m.frente_id = e.frente_id
     and m.atividade = c.atividade
     and m.competencia = date_trunc('month', e.data)::date
    where e.data between p_inicio and p_fim
      and coalesce(e.status_origem, 'Confirmado') <> 'Cancelado'
  ), inseridas as (
    insert into tarefas (evento_id, frente_id, atividade, competencia, escalado_id, estimativa_min, prazo_em)
    select evento_id, frente_id, atividade, competencia, escalado_id, estimativa_min, prazo_em
    from candidatas
    where escalado_id is not null and estimativa_min is not null
    on conflict (evento_id, atividade) do nothing
    returning 1
  )
  select count(*) into v_criadas from inseridas;

  select count(*) into v_sem_escalado
  from eventos e
  join cadeia c on c.frente_id = e.frente_id
  left join mapa m
    on m.frente_id = e.frente_id and m.atividade = c.atividade
   and m.competencia = date_trunc('month', e.data)::date
  where e.data between p_inicio and p_fim
    and coalesce(e.status_origem, 'Confirmado') <> 'Cancelado'
    and m.pessoa_id is null;

  return query select v_criadas, v_alvo - v_criadas - v_sem_escalado, v_sem_escalado;
end;
$$;

revoke all on function gerar_tarefas(date, date) from public, anon, authenticated;
