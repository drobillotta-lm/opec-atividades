-- Classificar uma competicao no Admin tem que reclassificar os eventos dela que ja
-- estavam no banco esperando. Sem isso, dizer "Sub-20 e Copas FIFA" nao surtia efeito
-- nenhum nos 6 eventos ja sincronizados.
create or replace function private.propaga_frente() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.frente_id is distinct from old.frente_id then
    update eventos set frente_id = new.frente_id where competicao_id = new.id;
  end if;
  return new;
end;
$$;

create trigger competicoes_propaga_frente
  after update of frente_id on competicoes
  for each row execute function private.propaga_frente();

-- Alinha o que ja estava dessincronizado.
update eventos e
   set frente_id = c.frente_id
  from competicoes c
 where c.id = e.competicao_id
   and e.frente_id is distinct from c.frente_id;
