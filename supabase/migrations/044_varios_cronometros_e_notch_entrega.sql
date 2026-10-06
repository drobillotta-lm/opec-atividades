-- Pedidos do Daniel em 06/10, depois do primeiro teste do notch com a Julia:
-- (1) mais de uma atividade ao mesmo tempo, cada cronômetro somando tempo cheio (decisão dele:
--     sem dividir o minuto entre as abertas; a soma do dia pode passar das horas-relógio);
-- (2) iniciar, pausar e ENTREGAR pelo notch;
-- (3) nada que esteja rodando pode ficar invisível no site: as 5 sessões da Julia foram em
--     tarefas vencidas de 21/09 e 02/10, que o notch oferecia primeiro (ordem por prazo, sem
--     limite inferior) e a /semana escondia (janela da semana).
--
-- Regra nova: N sessões abertas por pessoa, mas UMA por (pessoa, tarefa). A sessão de parte
-- (030) soma na tarefa-mãe, então duas abertas na mesma tarefa contariam o mesmo tempo em dobro.
-- 'troca' continua existindo só ao mudar de parte dentro da mesma tarefa (site).

drop index if exists sessoes_uma_aberta_por_pessoa;
create unique index sessoes_uma_aberta_por_pessoa_e_tarefa
  on sessoes (pessoa_id, tarefa_id) where fim is null;

-- Quem pode entregar pelo notch: o mesmo critério da policy escreve_tarefas (033), menos
-- líder/gestor — o notch é da própria pessoa.
create or replace function private.notch_pode_entregar(p_pessoa uuid, p_tarefa uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from tarefas t
    where t.id = p_tarefa
      and (t.escalado_id = p_pessoa or t.dupla_id = p_pessoa or t.responsavel_real_id = p_pessoa
           or exists (select 1 from sessoes s where s.tarefa_id = t.id and s.pessoa_id = p_pessoa))
  )
$$;

-- Estado v2: listas, não uma tarefa só.
--   correndo  = minhas sessões abertas (correndoDesde é a MINHA, não a da tarefa)
--   pausadas  = pendentes sem aberta minha, com sessão minha fechada desde a segunda-feira
--   proximas  = minhas pendentes da semana corrente (prazo >= segunda), fora das duas acima
--   atrasadas = minhas pendentes com prazo antes da segunda (vão recolhidas no painel)
--   tarefa    = correndo[0] ?? pausadas[0]: compatibilidade com o /notch-app anterior por
--               uma release; sai na próxima.
create or replace function notch_estado(p_pessoa uuid)
returns jsonb
language sql stable security definer set search_path = public as $$
  with hoje as (
    select (now() at time zone 'America/Sao_Paulo')::date as d,
           date_trunc('week', now() at time zone 'America/Sao_Paulo')::date as seg
  ),
  base as (
    select t.id, t.estimativa_min, t.prazo_em, t.abre_em, t.status,
           t.escalado_id, t.dupla_id, t.responsavel_real_id,
           coalesce(nullif(btrim(t.titulo), ''), a.rotulo) || coalesce(' · ' || f.nome, '') as titulo,
           coalesce(e.competicao, case when t.origem = 'registrada' then 'Começada do zero' else '' end) as sub
    from tarefas t
    join atividades a on a.codigo = t.atividade
    left join frentes f on f.id = t.frente_id
    left join eventos e on e.id = t.evento_id
  ),
  minhas as (
    select tarefa_id,
           min(inicio) filter (where fim is null) as aberta_desde,
           max(fim)                               as ultimo_fim
    from sessoes where pessoa_id = p_pessoa
    group by tarefa_id
  ),
  correndo as (
    select b.*, m.aberta_desde,
           (select v.segundos_total from v_tempo_tarefa v where v.tarefa_id = b.id) as segundos
    from minhas m join base b on b.id = m.tarefa_id
    where m.aberta_desde is not null and b.status = 'pendente'
  ),
  pausadas as (
    select b.*, m.ultimo_fim,
           (select v.segundos_total from v_tempo_tarefa v where v.tarefa_id = b.id) as segundos
    from minhas m join base b on b.id = m.tarefa_id, hoje
    where m.aberta_desde is null and b.status = 'pendente'
      and (m.ultimo_fim at time zone 'America/Sao_Paulo')::date >= hoje.seg
  ),
  candidatas as (
    select b.id, b.titulo, b.sub, b.prazo_em
    from base b, hoje
    where b.status = 'pendente'
      and b.abre_em <= hoje.d
      and (b.escalado_id = p_pessoa or b.dupla_id = p_pessoa or b.responsavel_real_id = p_pessoa)
      and b.id not in (select id from correndo union select id from pausadas)
  ),
  prox as (
    select c.* from candidatas c, hoje
    where c.prazo_em >= (hoje.seg::timestamp at time zone 'America/Sao_Paulo')
    order by c.prazo_em limit 8
  ),
  atras as (
    select c.* from candidatas c, hoje
    where c.prazo_em < (hoje.seg::timestamp at time zone 'America/Sao_Paulo')
    order by c.prazo_em limit 5
  ),
  j_correndo as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', id, 'titulo', titulo, 'sub', sub, 'prazoEm', prazo_em,
             'estimativaMin', estimativa_min, 'segundos', coalesce(segundos, 0),
             'correndoDesde', aberta_desde) order by aberta_desde desc), '[]'::jsonb) as j
    from correndo
  ),
  j_pausadas as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', id, 'titulo', titulo, 'sub', sub, 'prazoEm', prazo_em,
             'estimativaMin', estimativa_min, 'segundos', coalesce(segundos, 0),
             'correndoDesde', null) order by ultimo_fim desc), '[]'::jsonb) as j
    from pausadas
  )
  select jsonb_build_object(
    'pareado', true,
    'pessoa', (select jsonb_build_object('nome', nome) from pessoas where id = p_pessoa),
    'correndo', (select j from j_correndo),
    'pausadas', (select j from j_pausadas),
    'tarefa', coalesce((select j -> 0 from j_correndo where jsonb_array_length(j) > 0),
                       (select j -> 0 from j_pausadas where jsonb_array_length(j) > 0)),
    'proximas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'sub', sub, 'prazoEm', prazo_em) order by prazo_em)
                          from prox), '[]'::jsonb),
    'atrasadas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'sub', sub, 'prazoEm', prazo_em) order by prazo_em)
                           from atras), '[]'::jsonb),
    'frentes', coalesce((select jsonb_agg(jsonb_build_object('sigla', sigla, 'nome', nome) order by nome)
                         from frentes where ativa), '[]'::jsonb)
  )
$$;

-- Iniciar não fecha mais as outras. Idempotente: clique duplo ou dois aparelhos não criam
-- segunda sessão na mesma tarefa.
create or replace function notch_iniciar(p_pessoa uuid, p_tarefa uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from tarefas where id = p_tarefa and status = 'pendente') then
    raise exception 'essa tarefa não está mais pendente';
  end if;
  if not exists (select 1 from sessoes where pessoa_id = p_pessoa and tarefa_id = p_tarefa and fim is null) then
    insert into sessoes (tarefa_id, pessoa_id) values (p_tarefa, p_pessoa);
  end if;
  return notch_estado(p_pessoa);
end;
$$;

-- Pausar UMA tarefa. Nome novo, não sobrecarga: notch_pausar(uuid, uuid default null) ao lado
-- de notch_pausar(uuid) faria o PostgREST falhar com "could not choose the best candidate".
-- notch_pausar(uuid) continua existindo como "pausar tudo".
create or replace function notch_pausar_tarefa(p_pessoa uuid, p_tarefa uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
begin
  update sessoes set fim = now(), motivo_fim = 'pausa'
   where pessoa_id = p_pessoa and tarefa_id = p_tarefa and fim is null;
  return notch_estado(p_pessoa);
end;
$$;

-- Entregar pelo notch: espelha a server action entregar() do site, sem o ajuste manual de
-- minutos (o medido é o que vale) e sem escolher "quem fez" (o padrão do diálogo do site:
-- eu, se sou escalado ou dupla; senão o escalado). Fecha SÓ a minha sessão desta tarefa:
-- com vários cronômetros, entregar A não pode parar o relógio de B.
create or replace function notch_entregar(p_pessoa uuid, p_tarefa uuid, p_obs text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  t tarefas%rowtype;
  v_agora timestamptz := now();
begin
  select * into t from tarefas where id = p_tarefa for update;
  if not found or t.status <> 'pendente' then
    raise exception 'essa tarefa não está mais pendente';
  end if;
  if not private.notch_pode_entregar(p_pessoa, p_tarefa) then
    raise exception 'essa tarefa não é sua';
  end if;
  update sessoes set fim = v_agora, motivo_fim = 'entrega'
   where pessoa_id = p_pessoa and tarefa_id = p_tarefa and fim is null;
  update tarefas set
    status = case when v_agora <= t.prazo_em then 'entregue' else 'fora_do_prazo' end,
    concluida_em = v_agora,
    responsavel_real_id = case when p_pessoa in (t.escalado_id, t.dupla_id) then p_pessoa else coalesce(t.escalado_id, p_pessoa) end,
    obs = coalesce(nullif(btrim(p_obs), ''), obs)
  where id = p_tarefa;
  return notch_estado(p_pessoa);
end;
$$;

revoke all on function private.notch_pode_entregar(uuid, uuid) from public, anon, authenticated;
revoke all on function notch_pausar_tarefa(uuid, uuid) from public, anon, authenticated;
revoke all on function notch_entregar(uuid, uuid, text) from public, anon, authenticated;
