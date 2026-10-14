-- 049 (14/10/2026) — Frente "Outros" recebe todo evento sem competição, e já tem cadeia.
--
-- Pedido do Daniel em 14/10: evento com entrega precisa gerar atividade mesmo sem frente, e
-- aparecer para todo mundo pegar; e os que chegam sem competição (Externa, Kit Mojo, gravação,
-- Copa Acerj...) ficavam "sem frente" para sempre, porque a tela /admin classifica por
-- competição e eles não têm uma. Ele criou a frente OTRS = Outros pela tela; aqui ela ganha:
--  1. líder = Daniel (gestor), porque a cadeia dela escala pelo líder — ninguém está no mapa
--     de "Outros", e é o gestor quem redistribui; qualquer um puxa pra si em Minhas atividades
--     (bloco "Pra pegar · Outros");
--  2. cadeia padrão (materiais, sincronizacao, roteiro, auditoria), regra 'lider', mesmas
--     janelas das outras frentes;
--  3. `encaixar_sem_frente_em_outros()`: evento sem frente E sem competição vai para Outros.
--     A sync chama toda hora, depois de herdar a frente da competição. Evento de competição
--     ainda sem frente continua esperando a decisão do gestor no /admin.
-- Entrega continua sendo só a da Escala (047): sem "sim" lá, Outros não gera nada.

update frentes f set lider_id = p.id
  from pessoas p
 where f.sigla = 'OTRS' and f.lider_id is null and p.nome = 'Daniel' and p.papel = 'gestor';

insert into cadeia (frente_id, atividade, ordem, escalado_regra, abre_offset_dias, prazo_offset_dias, vigente_de)
select f.id, x.atividade, x.ordem, 'lider', x.abre, x.prazo, date '2026-10-14'
from (values ('materiais', 1, -3, -1), ('sincronizacao', 2, -1, 0),
             ('roteiro', 3, -3, -1),   ('auditoria', 4, 0, 2)) as x(atividade, ordem, abre, prazo)
join frentes f on f.sigla = 'OTRS'
on conflict do nothing;

create or replace function encaixar_sem_frente_em_outros()
returns integer
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  update eventos e set frente_id = f.id
    from frentes f
   where f.sigla = 'OTRS' and f.ativa
     and e.frente_id is null and e.competicao_id is null;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
revoke all on function encaixar_sem_frente_em_outros() from public, anon, authenticated;

select encaixar_sem_frente_em_outros();
