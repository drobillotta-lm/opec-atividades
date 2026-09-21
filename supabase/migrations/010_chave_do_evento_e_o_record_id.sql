-- O Match ID da Matriz nao serve de chave. Ele e uma formula sobre os times, e quando
-- o confronto ainda nao esta definido vira o mesmo texto para varios eventos: na semana
-- de 21/09 quatro jogos da Copa do Mundo Feminina Sub-20 compartilham
-- "Copa do Mundo Feminina Sub-20 | A definir X A definir", dois deles no mesmo dia.
-- Ele tambem muda quando o evento e cancelado (ganha um prefixo). A unica chave estavel
-- e o record id do Airtable, que ja e unico nesta tabela.
alter table eventos drop constraint eventos_evento_id_origem_key;
create index eventos_id_origem_idx on eventos (evento_id_origem);
