-- Antes de tudo, endurece a aplicar_entrega_da_escala da 036: o "volta pra indefinido"
-- so vale com o valor explicito 'indefinido'. Com entrega_escala ainda vazio (evento que a
-- sincronizacao nova nao gravou), ela apagaria a decisao da Escala de todo mundo.
-- A sincronizacao grava null da Escala como 'indefinido'.
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
   where entrega_escala = 'indefinido'
     and entrega_origem = 'escala';
  get diagnostics v_ind = row_count;

  return query select v_sim, v_nao, v_ind;
end;
$$;
revoke all on function aplicar_entrega_da_escala() from public, anon, authenticated;

-- Espelho da 028 para a entrega: evento que deixou de ter entrega (o lider trocou na
-- Escala) nao deve manter tarefa pendente. Sem sessao, ajuste nem sub-tarefa, some; com
-- tempo, vira 'na'/'sem_entrega'. E se a entrega volta, a 'na'/'sem_entrega' reabre
-- (a apagada volta pelo gerar_tarefas). So do mes corrente em diante: mes passado e historico.
create or replace function desfazer_tarefas_sem_entrega()
returns table (apagadas integer, marcadas_na integer, reabertas integer)
language plpgsql security definer set search_path = public as $$
declare v_apagadas int; v_na int; v_reab int;
begin
  with apagadas as (
    delete from tarefas t
    using eventos e
    where e.id = t.evento_id
      and e.entrega is not true
      and t.status = 'pendente'
      and t.competencia >= date_trunc('month', current_date)::date
      and not exists (select 1 from sessoes s       where s.tarefa_id = t.id)
      and not exists (select 1 from ajustes_tempo a where a.tarefa_id = t.id)
      and not exists (select 1 from subtarefas st   where st.tarefa_id = t.id)
    returning 1
  )
  select count(*) into v_apagadas from apagadas;

  update tarefas t
     set status = 'na', excecao = 'sem_entrega',
         excecao_desc = 'evento ficou sem entrega comercial', concluida_em = now()
    from eventos e
   where e.id = t.evento_id
     and e.entrega is not true
     and t.status = 'pendente'
     and t.competencia >= date_trunc('month', current_date)::date;
  get diagnostics v_na = row_count;

  update tarefas t
     set status = 'pendente', excecao = null, excecao_desc = null, concluida_em = null
    from eventos e
   where e.id = t.evento_id
     and e.entrega is true
     and t.status = 'na' and t.excecao = 'sem_entrega'
     and t.competencia >= date_trunc('month', current_date)::date;
  get diagnostics v_reab = row_count;

  return query select v_apagadas, v_na, v_reab;
end;
$$;
revoke all on function desfazer_tarefas_sem_entrega() from public, anon, authenticated;

-- Rodada fora da migration, via execute_sql, pra registrar o retorno:
--   select * from desfazer_tarefas_sem_entrega();
