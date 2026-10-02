-- O lider troca o "tem entrega?" na Escala a qualquer hora, inclusive depois da tarefa
-- existir, e pode voltar pra 'indefinido'. Ate aqui a sincronizacao so marcava sim/nao e
-- nunca desfazia. Agora guarda o valor cru e uma funcao aplica:
--   sim -> true/escala; nao -> false/escala;
--   indefinido ou null -> so se a decisao era da Escala, volta pra null/null (e a
--   previsao pelo padrao da competicao reassume). Decisao 'lider' nunca e tocada.
alter table eventos add column entrega_escala text
  check (entrega_escala in ('sim','nao','indefinido'));

create or replace function aplicar_entrega_da_escala()
returns table (marcadas_sim integer, marcadas_nao integer, voltaram_indefinido integer)
language plpgsql security definer set search_path = public as $$
declare v_sim int; v_nao int; v_ind int;
begin
  update eventos set entrega = true, entrega_origem = 'escala'
   where entrega_escala = 'sim'
     and entrega_origem is distinct from 'lider'
     and (entrega is distinct from true or entrega_origem is distinct from 'escala');
  get diagnostics v_sim = row_count;

  update eventos set entrega = false, entrega_origem = 'escala'
   where entrega_escala = 'nao'
     and entrega_origem is distinct from 'lider'
     and (entrega is distinct from false or entrega_origem is distinct from 'escala');
  get diagnostics v_nao = row_count;

  update eventos set entrega = null, entrega_origem = null
   where coalesce(entrega_escala, 'indefinido') = 'indefinido'
     and entrega_origem = 'escala';
  get diagnostics v_ind = row_count;

  return query select v_sim, v_nao, v_ind;
end;
$$;
revoke all on function aplicar_entrega_da_escala() from public, anon, authenticated;

-- v3: a previsao tambem reavalia o que ela mesma previu antes, pra acompanhar mudanca
-- do padrao da competicao (que agora vem da Escala).
create or replace function aplicar_previsao_entrega()
returns void
language sql set search_path = public as $$
  update eventos e
     set entrega = case c.entrega_padrao when 'sim' then true when 'nao' then false else null end,
         entrega_origem = case when c.entrega_padrao in ('sim','nao') then 'previsto' else null end
    from competicoes c
   where c.id = e.competicao_id
     and (e.entrega_origem is null or e.entrega_origem = 'previsto')
     and (e.entrega is distinct from case c.entrega_padrao when 'sim' then true when 'nao' then false else null end
          or e.entrega_origem is distinct from case when c.entrega_padrao in ('sim','nao') then 'previsto' else null end);
$$;
