-- Pedido do Daniel em 23/09: qualquer um da equipe pode buscar a tarefa de outra
-- pessoa (por evento ou por nome) e "puxar" pra si -- sozinho ou em conjunto, duas
-- pessoas cronometrando a mesma tarefa. sessoes ja permitia isso (minhas_sessoes so
-- exige pessoa_id = eu, nunca checou dono da tarefa); faltava conseguir LER a tarefa
-- de outra pessoa pra achar ela, e conseguir ENTREGAR depois de ter ajudado.

drop policy le_tarefas on tarefas;
create policy le_tarefas on tarefas for select to authenticated using (
  escalado_id = private.eu()
  or responsavel_real_id = private.eu()
  or private.lidero(frente_id)
  or private.sou_gestor()
  or private.eu() is not null  -- qualquer um do time pode buscar e ajudar
);

drop policy escreve_tarefas on tarefas;
create policy escreve_tarefas on tarefas for update to authenticated using (
  escalado_id = private.eu()
  or responsavel_real_id = private.eu()
  or private.lidero(frente_id)
  or private.sou_gestor()
  or exists (select 1 from sessoes s where s.tarefa_id = tarefas.id and s.pessoa_id = private.eu())
) with check (
  escalado_id = private.eu()
  or responsavel_real_id = private.eu()
  or private.lidero(frente_id)
  or private.sou_gestor()
  or exists (select 1 from sessoes s where s.tarefa_id = tarefas.id and s.pessoa_id = private.eu())
);
