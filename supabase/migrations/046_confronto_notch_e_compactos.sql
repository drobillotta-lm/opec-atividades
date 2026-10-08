-- 046 — Confronto do evento nas telas e no notch; compactos geram materiais (24 h antes) e auditoria.
--
-- Pedido do Daniel em 07/10, decisoes em 08/10:
--  1. A tarefa mostra o jogo: "Roteiro - Nacional - Brasileirao 2026 | Vasco da Gama X Flamengo".
--     O confronto vem da Escala (escala.eventos.confronto, 067 de la: campo "Auxiliar Partida
--     So Times" do Airtable), em coluna propria -- `evento_id_origem` continua sendo o "Nome do
--     Evento", que e de onde sai o `tipo` (reprise, pre-jogo, sem narracao).
--  2. notch_estado v3 devolve `competicao` e `confronto` separados em cada tarefa; `sub`
--     continua igual (so a competicao) para o app 0.2.0/0.3.0, e a pagina monta a 2a linha.
--  3. Toda competicao "Compacto..." ganha cadeia propria: materiais (prazo 24 h antes do inicio,
--     `prazo_horas_antes` da 045) e auditoria (0/+2), as MESMAS atividades dos jogos (decisao do
--     Daniel), escalado = lider da frente (como o `compacto` era). Regra provisoria ate o Yuri
--     modelar. `garantir_cadeia_compactos` e idempotente e a sync chama toda hora: competicao
--     nova "Compactos X" entra sozinha. A linha de competicao esconde a cadeia da frente, entao
--     compacto nao gera roteiro nem sincronizacao.
--  4. "Programa Compactos 2026" (Copa Davis, Ligue 1, Brasileirao...) estava sem frente e com
--     entrega a decidir: vai para Olimpicos + Tenis com entrega 'sim' (decisao do Daniel). A
--     Escala nao tem essa competicao em escala.competicoes, entao a sync nao sobrescreve.

-- ---------- 1. confronto ----------------------------------------------------------------------

alter table eventos add column confronto text;
comment on column eventos.confronto is
  'Quem joga ("Vasco da Gama X Flamengo"), cru da Escala (escala.eventos.confronto). So para exibir.';

-- ---------- 2. notch_estado v3 (044 + competicao/confronto) -----------------------------------

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
    from minhas m join base b on b.id = m.tarefa_id, hoje
    where m.aberta_desde is null and b.status = 'pendente'
      and (m.ultimo_fim at time zone 'America/Sao_Paulo')::date >= hoje.seg
  ),
  candidatas as (
    select b.id, b.titulo, b.sub, b.competicao, b.confronto, b.prazo_em
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
$$;

-- ---------- 3. compactos -----------------------------------------------------------------------

create or replace function garantir_cadeia_compactos(p_vigente_de date)
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  -- Toda competicao "Compacto..." com frente ganha cadeia propria: materiais 24 h antes do inicio
  -- e auditoria depois, do lider. Idempotente: so insere o que falta.
  insert into cadeia (frente_id, competicao_id, atividade, ordem, escalado_regra,
                      abre_offset_dias, prazo_offset_dias, prazo_horas_antes, vigente_de)
  select c.frente_id, c.id, x.atividade, x.ordem, 'lider', x.abre, x.prazo, x.horas, p_vigente_de
  from competicoes c
  cross join (values ('materiais', 1, -3, -1, 24), ('auditoria', 2, 0, 2, null::integer))
         as x(atividade, ordem, abre, prazo, horas)
  where c.ativa and c.frente_id is not null and c.nome ilike '%compacto%'
    and not exists (select 1 from cadeia k
                     where k.competicao_id = c.id and k.atividade = x.atividade
                       and (k.vigente_ate is null or k.vigente_ate >= p_vigente_de));
  get diagnostics v_n = row_count;

  -- O elo 'compacto' (uma tarefa so, 011) encerra onde a cadeia nova entrou.
  update cadeia k set vigente_ate = p_vigente_de - 1
   where k.atividade = 'compacto' and k.vigente_ate is null and k.competicao_id is not null
     and exists (select 1 from cadeia n
                  where n.competicao_id = k.competicao_id and n.atividade = 'materiais'
                    and n.vigente_de >= p_vigente_de);
  return v_n;
end;
$$;
revoke all on function garantir_cadeia_compactos(date) from public, anon, authenticated;

-- "Programa Compactos 2026" -> Olimpicos + Tenis, entrega sim. O gatilho da 013 leva a frente
-- aos eventos da competicao; a previsao de entrega (036) marca os que ninguem decidiu.
update competicoes set frente_id = (select id from frentes where sigla = 'OL')
 where nome = 'Programa Compactos 2026' and frente_id is null;
update competicoes set entrega_padrao = 'sim'
 where nome ilike '%compacto%' and entrega_padrao is distinct from 'sim';
select * from aplicar_previsao_entrega();

select garantir_cadeia_compactos(date '2026-10-09');

update atividades set ativa = false where codigo = 'compacto';

-- As 3 'compacto' pendentes de setembro ficam fora do "mes corrente em diante" da
-- desfazer_tarefas_fora_da_cadeia; fecham aqui. As de outubro em diante a sync apaga (sem tempo).
update tarefas
   set status = 'na', excecao = 'fora_da_cadeia',
       excecao_desc = 'compacto virou materiais + auditoria (046)', concluida_em = now()
 where atividade = 'compacto' and status = 'pendente' and competencia < date '2026-10-01';

-- Depois desta migration: "Sincronizar agora" no /admin.
