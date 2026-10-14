-- 050 (14/10/2026) — Quem começou uma tarefa do zero pode excluí-la.
--
-- Pedido do Daniel: "excluir uma atividade pausada, é possível?". Só faz sentido para a tarefa
-- começada do zero (origem 'registrada', sem evento): a de cadeia a sync recria na hora
-- seguinte (gerar_tarefas, unique evento+atividade) — para essa o caminho continua sendo
-- "não necessária". Apagar leva junto sessões, ajustes e partes (on delete cascade da 001/030).
-- Quem pode: o escalado ou quem assumiu (responsavel_real). O gestor já apaga qualquer uma
-- sem tempo pelo /admin/organizar (apagar_tarefa).

create policy apaga_tarefa_registrada on tarefas for delete to authenticated using (
  origem = 'registrada'
  and (escalado_id = private.eu() or responsavel_real_id = private.eu())
);
