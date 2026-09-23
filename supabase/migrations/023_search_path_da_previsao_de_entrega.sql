-- O verificador de seguranca acusou search_path mutavel na 021. Sem search_path fixo,
-- um role malicioso com permissao de criar objeto no schema poderia sombrear uma tabela
-- e desviar a funcao -- nao muda o comportamento hoje, so fecha a brecha.
create or replace function aplicar_previsao_entrega()
returns void language sql set search_path = 'public' as $$
  update eventos e
     set entrega = case c.entrega_padrao when 'sim' then true when 'nao' then false else null end,
         entrega_origem = case when c.entrega_padrao in ('sim','nao') then 'previsto' else null end
    from competicoes c
   where c.id = e.competicao_id
     and e.entrega_origem is null;
$$;
