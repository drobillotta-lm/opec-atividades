-- A Escala passa a ser a fonte dos eventos e do plantao dos fixos, 2x por dia
-- (src/app/api/importar-escala/route.ts), em vez do Atividades reimplementar a
-- leitura do Airtable. Dois ajustes que isso exige:

-- 1) A Escala tem um evento criado direto por um gestor (042_evento_manual_e_edicao),
--    sem passar pelo Airtable -- 'status_origem' precisa aceitar isso.
alter table eventos drop constraint eventos_status_origem_check;
alter table eventos add constraint eventos_status_origem_check
  check (status_origem in ('TBD','Confirmado','Cancelado','Finalizado','Manual'));

-- 2) A previsao por competicao (014) era um UPDATE de uma vez so. Vira funcao para
--    o importador chamar a cada rodada -- so mexe em quem ainda nao tem
--    entrega_origem (nunca sobrescreve 'lider' nem 'escala', que a propria rodada
--    ja aplicou antes de chamar isto).
create or replace function aplicar_previsao_entrega()
returns void language sql as $$
  update eventos e
     set entrega = case c.entrega_padrao when 'sim' then true when 'nao' then false else null end,
         entrega_origem = case when c.entrega_padrao in ('sim','nao') then 'previsto' else null end
    from competicoes c
   where c.id = e.competicao_id
     and e.entrega_origem is null;
$$;
