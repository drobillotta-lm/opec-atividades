-- 051: iniciar antes da janela abrir (27/10/2026).
-- O time quer adiantar atividade que ainda "não abriu" (abre_em no futuro). No site, o botão
-- Iniciar deixou de ficar desabilitado (a etiqueta "abre dd/mm" vira só aviso). Aqui, o
-- notch_estado deixa de cortar as candidatas por abre_em: "proximas" passa a trazer também as
-- que ainda vão abrir, na mesma ordem de prazo (as mais próximas continuam primeiro, limite 8).
-- Mesmo corpo da 048, só sem a linha "and b.abre_em <= hoje.d".

create or replace function public.notch_estado(p_pessoa uuid)
 returns jsonb
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  with hoje as (
    select (now() at time zone 'America/Sao_Paulo')::date as d
  ),
  base as (
    select t.id, t.estimativa_min, t.prazo_em, t.abre_em, t.status,
           t.escalado_id, t.dupla_id, t.responsavel_real_id,
           coalesce(nullif(btrim(t.titulo), ''), a.rotulo) || coalesce(' · ' || f.nome, '') as titulo,
           coalesce(e.competicao, case when t.origem = 'registrada' then 'Começada do zero' else '' end) as sub,
           e.competicao, e.confronto
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
    from minhas m join base b on b.id = m.tarefa_id
    where m.aberta_desde is null and b.status = 'pendente'
      and m.ultimo_fim >= now() - interval '7 days'
  ),
  candidatas as (
    select b.id, b.titulo, b.sub, b.competicao, b.confronto, b.prazo_em
    from base b, hoje
    where b.status = 'pendente'
      -- 051: sem corte por abre_em; quem quer adiantar vê a tarefa antes da janela abrir
      and (b.escalado_id = p_pessoa or b.dupla_id = p_pessoa or b.responsavel_real_id = p_pessoa)
      and b.id not in (select id from correndo union select id from pausadas)
  ),
  prox as (
    select c.* from candidatas c
    where c.prazo_em >= now()
    order by c.prazo_em limit 8
  ),
  atras as (
    select c.* from candidatas c
    where c.prazo_em < now()
    order by c.prazo_em limit 10
  ),
  j_correndo as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', id, 'titulo', titulo, 'sub', sub, 'competicao', competicao, 'confronto', confronto,
             'prazoEm', prazo_em, 'estimativaMin', estimativa_min, 'segundos', coalesce(segundos, 0),
             'correndoDesde', aberta_desde) order by aberta_desde desc), '[]'::jsonb) as j
    from correndo
  ),
  j_pausadas as (
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', id, 'titulo', titulo, 'sub', sub, 'competicao', competicao, 'confronto', confronto,
             'prazoEm', prazo_em, 'estimativaMin', estimativa_min, 'segundos', coalesce(segundos, 0),
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
    'proximas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'sub', sub,
                            'competicao', competicao, 'confronto', confronto, 'prazoEm', prazo_em) order by prazo_em)
                          from prox), '[]'::jsonb),
    'atrasadas', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'titulo', titulo, 'sub', sub,
                            'competicao', competicao, 'confronto', confronto, 'prazoEm', prazo_em) order by prazo_em)
                           from atras), '[]'::jsonb),
    'frentes', coalesce((select jsonb_agg(jsonb_build_object('sigla', sigla, 'nome', nome) order by nome)
                         from frentes where ativa), '[]'::jsonb)
  )
$function$;
