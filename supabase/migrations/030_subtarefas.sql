-- Sub-tarefa (decisao de 28/09): uma parte de uma tarefa, com escopo proprio, cronometro
-- proprio e podendo ser de outra pessoa. O tempo dela SOMA na tarefa-mae: a sessao
-- continua apontando para a tarefa (v_tempo_tarefa nao muda), e ganha um subtarefa_id
-- opcional para dizer em que parte aquele trecho foi gasto. E diferente de sessao:
-- sessao e a mesma tarefa em varios trechos; sub-tarefa e um pedaco com nome.
-- gerar_tarefas e a chave (evento, atividade) nao mudam.

create table subtarefas (
  id           uuid primary key default gen_random_uuid(),
  tarefa_id    uuid not null references tarefas(id) on delete cascade,
  titulo       text not null check (length(btrim(titulo)) > 0),
  pessoa_id    uuid not null references pessoas(id),   -- quem vai fazer esta parte
  criada_por   uuid not null references pessoas(id),
  status       text not null default 'pendente' check (status in ('pendente','feita')),
  concluida_em timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index subtarefas_tarefa_idx on subtarefas (tarefa_id);
create index subtarefas_pessoa_idx on subtarefas (pessoa_id) where status = 'pendente';
create trigger subtarefas_set_updated_at before update on subtarefas
  for each row execute function private.set_updated_at();

alter table sessoes add column subtarefa_id uuid references subtarefas(id) on delete set null;
create index sessoes_subtarefa_idx on sessoes (subtarefa_id) where subtarefa_id is not null;

-- A parte tem que ser da mesma tarefa da sessao.
create or replace function private.sessao_subtarefa_coerente()
returns trigger language plpgsql as $$
begin
  if new.subtarefa_id is not null and not exists (
    select 1 from subtarefas s where s.id = new.subtarefa_id and s.tarefa_id = new.tarefa_id
  ) then
    raise exception 'sessao aponta para sub-tarefa de outra tarefa';
  end if;
  return new;
end;
$$;
create trigger sessoes_subtarefa_coerente before insert or update on sessoes
  for each row execute function private.sessao_subtarefa_coerente();

-- Quem enxerga a tarefa (022 abriu para qualquer autenticado) enxerga as partes.
-- Cria quem quiser, em nome proprio. Edita quem vai fazer, quem criou, o lider da
-- frente ou o gestor. Apaga quem criou, lider ou gestor.
alter table subtarefas enable row level security;
create policy le_subtarefas on subtarefas for select to authenticated
  using (private.eu() is not null);
create policy cria_subtarefas on subtarefas for insert to authenticated
  with check (criada_por = private.eu());
create policy edita_subtarefas on subtarefas for update to authenticated
  using (pessoa_id = private.eu() or criada_por = private.eu() or private.sou_gestor()
         or exists (select 1 from tarefas t where t.id = subtarefas.tarefa_id and private.lidero(t.frente_id)));
create policy apaga_subtarefas on subtarefas for delete to authenticated
  using (criada_por = private.eu() or private.sou_gestor()
         or exists (select 1 from tarefas t where t.id = subtarefas.tarefa_id and private.lidero(t.frente_id)));

create view v_tempo_subtarefa
with (security_invoker = true) as
select
  st.id as subtarefa_id,
  st.tarefa_id,
  coalesce(sum(extract(epoch from (se.fim - se.inicio))) filter (where se.fim is not null), 0)::numeric as segundos,
  min(se.inicio) filter (where se.fim is null) as sessao_aberta_desde
from subtarefas st
left join sessoes se on se.subtarefa_id = st.id
group by st.id, st.tarefa_id;
