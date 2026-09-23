-- Achado investigando o pedido de classificacao por evento (23/09): a 013 so propaga
-- a frente quando ALGUEM CLASSIFICA a competicao (trigger em update de competicoes).
-- Evento novo que chega DEPOIS, numa competicao ja classificada, nunca ganhava frente_id
-- -- exatamente o caso do import da Escala: 233 dos 365 eventos ficaram sem frente
-- mesmo com a competicao deles ja classificada, e por isso gerar_tarefas nao rodava
-- pra eles (cadeia e por frente_id).

create or replace function private.preencher_frente_do_evento() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.frente_id is null then
    select frente_id into new.frente_id from competicoes where id = new.competicao_id;
  end if;
  return new;
end;
$$;

create trigger eventos_preenche_frente
  before insert on eventos
  for each row execute function private.preencher_frente_do_evento();

-- Conserta quem ja estava no banco com a lacuna.
update eventos e set frente_id = c.frente_id
  from competicoes c
 where c.id = e.competicao_id and e.frente_id is null and c.frente_id is not null;
