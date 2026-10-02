-- A cadeia passa a ter vigencia: a partir de 01/10 FI, OL, PR e CP trocam
-- sincronizacao + auditoria por sinc_auditoria, mas setembro continua com a cadeia antiga.
-- Linha sem vigente_ate esta em vigor dali pra frente.
alter table cadeia add column vigente_de  date not null default '2026-08-01';
alter table cadeia add column vigente_ate date;
alter table cadeia add constraint cadeia_vigencia_check
  check (vigente_ate is null or vigente_ate >= vigente_de);

drop index cadeia_frente_idx;
drop index cadeia_competicao_idx;
create unique index cadeia_frente_idx     on cadeia (frente_id, atividade, vigente_de)     where competicao_id is null;
create unique index cadeia_competicao_idx on cadeia (competicao_id, atividade, vigente_de) where competicao_id is not null;

-- A cadeia de um evento numa data. Competicao com cadeia propria em vigor vence a da
-- frente (a regra que estava repetida na 016 e na 017).
create or replace function private.cadeia_vigente(p_frente_id uuid, p_competicao_id uuid, p_data date)
returns setof cadeia
language sql stable set search_path = public as $$
  select c.* from cadeia c
  where c.vigente_de <= p_data and (c.vigente_ate is null or c.vigente_ate >= p_data)
    and (
      (p_competicao_id is not null and c.competicao_id = p_competicao_id)
      or (c.competicao_id is null and c.frente_id = p_frente_id
          and not exists (
            select 1 from cadeia c2
            where c2.competicao_id = p_competicao_id
              and c2.vigente_de <= p_data and (c2.vigente_ate is null or c2.vigente_ate >= p_data)))
    )
$$;
revoke all on function private.cadeia_vigente(uuid, uuid, date) from public, anon, authenticated;

update cadeia c set vigente_ate = '2026-09-30'
  from frentes f
 where f.id = c.frente_id and f.sigla in ('FI','OL','PR','CP')
   and c.competicao_id is null and c.atividade in ('sincronizacao','auditoria');

-- Janela = uniao das duas: abre com a sincronizacao (-1), vence com a auditoria (+2).
insert into cadeia (frente_id, atividade, ordem, escalado_regra, abre_offset_dias, prazo_offset_dias, vigente_de)
select id, 'sinc_auditoria', 2, 'mapa', -1, 2, '2026-10-01'
  from frentes where sigla in ('FI','OL','PR','CP');
