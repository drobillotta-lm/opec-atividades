-- A 013 propaga a frente quando a competicao e classificada, e a 024 quando o evento
-- nasce. Ficava de fora o evento que ja existia sem frente quando a competicao foi
-- classificada por outro caminho (upsert que nao dispara update na competicao) -- em
-- 28/09 havia 4 assim, do "Quem Fez, Fez!". Esta funcao fecha a lacuna e roda a cada
-- sincronizacao com a Escala, logo depois do upsert de eventos.
create or replace function herdar_frente_da_competicao()
returns integer
language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update eventos e
     set frente_id = c.frente_id
    from competicoes c
   where c.id = e.competicao_id
     and e.frente_id is null
     and c.frente_id is not null;
  get diagnostics v = row_count;
  return v;
end;
$$;

revoke all on function herdar_frente_da_competicao() from public, anon, authenticated;

select herdar_frente_da_competicao();
