-- gerar_tarefas ignora evento cancelado, mas nunca desfazia o que ja tinha gerado antes
-- do cancelamento: em 28/09 havia 16 tarefas pendentes de eventos cancelados. Regra
-- combinada com o Daniel: sem sessao nem ajuste, a tarefa some; com tempo registrado,
-- vira 'na' com excecao 'cancelado' -- o tempo gasto e dado, nao e apagado.
-- Roda depois de gerar_tarefas em cada importacao, e uma vez aqui.
create or replace function desfazer_tarefas_de_evento_cancelado()
returns table (apagadas integer, marcadas_na integer)
language plpgsql security definer set search_path = public as $$
declare v_apagadas int; v_na int;
begin
  with apagadas as (
    delete from tarefas t
    using eventos e
    where e.id = t.evento_id
      and e.status_origem = 'Cancelado'
      and t.status = 'pendente'
      and not exists (select 1 from sessoes s       where s.tarefa_id = t.id)
      and not exists (select 1 from ajustes_tempo a where a.tarefa_id = t.id)
    returning 1
  )
  select count(*) into v_apagadas from apagadas;

  update tarefas t
     set status = 'na', excecao = 'cancelado',
         excecao_desc = 'evento cancelado na origem', concluida_em = now()
    from eventos e
   where e.id = t.evento_id
     and e.status_origem = 'Cancelado'
     and t.status = 'pendente';
  get diagnostics v_na = row_count;

  return query select v_apagadas, v_na;
end;
$$;

revoke all on function desfazer_tarefas_de_evento_cancelado() from public, anon, authenticated;

select * from desfazer_tarefas_de_evento_cancelado();
