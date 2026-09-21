-- Evento de competicao ainda nao classificada precisa entrar no banco mesmo assim,
-- senao ele some na sincronizacao e cai no mesmo buraco do gerar_semana.py.
-- Sem frente, `cadeia` nao casa e nenhuma tarefa e gerada: o evento fica visivel
-- no Admin esperando alguem dizer de que frente ele e.
alter table eventos alter column frente_id drop not null;
