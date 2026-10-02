-- Notch nativo, pedido do Daniel em 02/10: (1) começar uma atividade pelo notch, inclusive
-- uma do zero, que não estava planejada; (2) os botões estavam lentos.
--
-- (1) Tarefa "registrada" (decisão de 20/09: o que a pessoa cria é visível ao líder, marcado
-- pela origem). Nasce sem evento, com título livre, frente opcional, dona = a pessoa, prazo
-- no fim do dia. gerar_tarefas, reaplicar_mapa e os desfazer_* só olham tarefa com evento e
-- origem 'cadeia', então não tocam nela.
alter table tarefas alter column evento_id drop not null;
alter table tarefas alter column frente_id drop not null;
alter table tarefas add column titulo text;
alter table tarefas drop constraint tarefas_origem_check;
alter table tarefas add constraint tarefas_origem_check check (origem in ('cadeia','avulsa','registrada'));
alter table tarefas add constraint tarefas_registrada_tem_titulo
  check (origem <> 'registrada' or length(btrim(coalesce(titulo, ''))) > 0);
alter table tarefas add constraint tarefas_so_registrada_sem_evento
  check (evento_id is not null or origem = 'registrada');

insert into atividades (codigo, rotulo) values ('livre', 'Atividade livre') on conflict do nothing;

-- (2) Cada ação do notch numa chamada só: o que eram ~10 idas e voltas da Vercel ao banco
-- vira uma. Todas devolvem o estado inteiro, no formato que /notch-app já usa.
create or replace function notch_estado(p_pessoa uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  with ult as (
    select tarefa_id, inicio, fim from sessoes
    where pessoa_id = p_pessoa order by inicio desc limit 1
  ),
  base as (
    select t.id, t.estimativa_min, t.prazo_em, t.status,
           coalesce(nullif(btrim(t.titulo), ''), a.rotulo) || coalesce(' · ' || f.nome, '') as titulo,
           coalesce(e.competicao, case when t.origem = 'registrada' then 'Começada do zero' else '' end) as sub
    from tarefas t
    join atividades a on a.codigo = t.atividade
    left join frentes f on f.id = t.frente_id
    left join eventos e on e.id = t.evento_id
  ),
  atual as (
    select b.*, u.inicio, u.fim,
           (select v.segundos_total from v_tempo_tarefa v where v.tarefa_id = b.id) as segundos
    from ult u join base b on b.id = u.tarefa_id
    where b.status = 'pendente'
  ),
  prox as (
    select b.id, b.titulo, b.sub, b.prazo_em
    from tarefas t join base b on b.id = t.id
    where t.status = 'pendente'
      and t.abre_em <= (now() at time zone 'America/Sao_Paulo')::date
      and (t.escalado_id = p_pessoa or t.dupla_id = p_pessoa)
      and t.id is distinct from (select id from atual)
    order by t.prazo_em
    limit 8
  )
  select jsonb_build_object(
    'pareado', true,
    'pessoa', (select jsonb_build_object('nome', nome) from pessoas where id = p_pessoa),
    'tarefa', (select jsonb_build_object(
                 'id', id, 'titulo', titulo, 'sub', sub, 'prazoEm', prazo_em,
                 'estimativaMin', estimativa_min, 'segundos', coalesce(segundos, 0),
                 'correndoDesde', case when fim is null then inicio end)
               from atual),
    'proximas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'sub', sub, 'prazoEm', prazo_em))
                          from prox), '[]'::jsonb),
    'frentes', coalesce((select jsonb_agg(jsonb_build_object('sigla', sigla, 'nome', nome) order by nome)
                         from frentes where ativa), '[]'::jsonb)
  )
$$;

-- Igual ao iniciar() do site: trocar de tarefa fecha a anterior, nunca duas correndo.
create or replace function notch_iniciar(p_pessoa uuid, p_tarefa uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from tarefas where id = p_tarefa and status = 'pendente') then
    raise exception 'essa tarefa não está mais pendente';
  end if;
  update sessoes set fim = now(), motivo_fim = 'troca' where pessoa_id = p_pessoa and fim is null;
  insert into sessoes (tarefa_id, pessoa_id) values (p_tarefa, p_pessoa);
  return notch_estado(p_pessoa);
end;
$$;

create or replace function notch_pausar(p_pessoa uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update sessoes set fim = now(), motivo_fim = 'pausa' where pessoa_id = p_pessoa and fim is null;
  return notch_estado(p_pessoa);
end;
$$;

-- Começar do zero: cria a tarefa registrada e já liga o cronômetro nela.
create or replace function notch_comecar_do_zero(p_pessoa uuid, p_titulo text, p_frente_sigla text)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  if length(btrim(coalesce(p_titulo, ''))) = 0 then
    raise exception 'diga o que você vai fazer';
  end if;
  insert into tarefas (evento_id, frente_id, atividade, titulo, competencia, escalado_id,
                       estimativa_min, abre_em, prazo_em, origem, dono_manual)
  values (null, (select id from frentes where sigla = nullif(p_frente_sigla, '')), 'livre',
          left(btrim(p_titulo), 120), date_trunc('month', v_hoje)::date, p_pessoa,
          60, v_hoje, ((v_hoje + 1)::timestamp at time zone 'America/Sao_Paulo') - interval '1 second',
          'registrada', true)
  returning id into v_id;
  return notch_iniciar(p_pessoa, v_id);
end;
$$;

-- Token do aparelho -> pessoa, numa ida só (antes era select + update).
create or replace function notch_aparelho(p_token_hash text)
returns uuid
language sql security definer set search_path = public as $$
  update notch_dispositivos set ultimo_uso_em = now()
   where token_hash = p_token_hash and revogado_em is null
  returning pessoa_id
$$;

revoke all on function notch_estado(uuid) from public, anon, authenticated;
revoke all on function notch_iniciar(uuid, uuid) from public, anon, authenticated;
revoke all on function notch_pausar(uuid) from public, anon, authenticated;
revoke all on function notch_comecar_do_zero(uuid, text, text) from public, anon, authenticated;
revoke all on function notch_aparelho(text) from public, anon, authenticated;
