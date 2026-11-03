-- 054: iniciar atividades juntas, num lote (03/11/2026).
-- Julia Bruno faz três auditorias de uma vez e quer um cronômetro só. Decisão do Daniel (03/11):
-- NÃO fundir em uma tarefa nova (cada tarefa é um evento × elo, é isso que o modelo do Yuri e as
-- taxas leem). Em vez disso, uma sessão por tarefa, abertas e fechadas juntas, com um `lote_id`
-- em comum e uma `fracao` do tempo: o relógio corre inteiro em cada sessão, e a view de tempo
-- multiplica pela fração. Fração = estimativa da tarefa / soma das estimativas do lote (três
-- auditorias iguais = um terço cada). Nada muda na sync, no gerar_tarefas nem nos relatórios
-- por evento. Notch e dock continuam vendo N sessões correndo (fase 2).

alter table sessoes
  add column lote_id uuid,
  add column fracao  numeric not null default 1 check (fracao > 0 and fracao <= 1);
create index sessoes_lote_idx on sessoes (lote_id) where lote_id is not null;

comment on column sessoes.lote_id is 'Sessões abertas juntas ("iniciar juntas", 054): mesmo lote_id, pausam e entregam juntas';
comment on column sessoes.fracao  is 'Parte do tempo desta sessão que conta para a tarefa (1 = tudo; num lote, estimativa / soma das estimativas)';

-- Mesmas colunas da 020, só o somatório rateado pela fração.
create or replace view v_tempo_tarefa as
select t.id as tarefa_id,
       coalesce(s.segundos, 0::numeric) as segundos_cronometro,
       coalesce(a.minutos_ajuste, 0) as minutos_ajuste,
       coalesce(s.segundos, 0::numeric) + (coalesce(a.minutos_ajuste, 0) * 60)::numeric as segundos_total,
       round((coalesce(s.segundos, 0::numeric) + (coalesce(a.minutos_ajuste, 0) * 60)::numeric) / 60.0, 2) as minutos_total,
       s.sessao_aberta_desde
from tarefas t
left join lateral (
  select sum(extract(epoch from se.fim - se.inicio) * se.fracao) filter (where se.fim is not null) as segundos,
         min(se.inicio) filter (where se.fim is null) as sessao_aberta_desde
  from sessoes se
  where se.tarefa_id = t.id
) s on true
left join lateral (
  select sum(aj.minutos_delta)::integer as minutos_ajuste
  from ajustes_tempo aj
  where aj.tarefa_id = t.id
) a on true;
