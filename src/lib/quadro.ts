import type { criarClienteServidor } from "@/lib/supabase/server";
import type { TarefaQuadro } from "@/componentes/QuadroKanban";

type Supabase = Awaited<ReturnType<typeof criarClienteServidor>>;

/**
 * Tarefas da(s) frente(s) que a pessoa lidera (gestor: todas as ativas, mais as começadas
 * do zero sem frente), na janela da semana, com tempo medido e quem está rodando agora.
 * Era a consulta da página /kanban; desde 06/10 alimenta o "Quadro kanban · toda a frente"
 * dentro de Minha semana.
 */
export async function tarefasDaFrente(
  supabase: Supabase,
  pessoa: { id: string; papel: string },
  inicio: string,
  fim: string,
  nomePor: Map<string, string>,
): Promise<TarefaQuadro[] | null> {
  const gestor = pessoa.papel === "gestor";
  if (!gestor && pessoa.papel !== "lider") return null;
  const { data: minhasFrentes } = gestor
    ? await supabase.from("frentes").select("id").eq("ativa", true)
    : await supabase.from("frentes").select("id").eq("lider_id", pessoa.id);
  const ids = (minhasFrentes ?? []).map((f) => f.id);
  if (ids.length === 0) return [];

  const base = supabase
    .from("tarefas")
    .select(`id, atividade, titulo, status, estimativa_min, prazo_em, escalado_id, dupla_id, responsavel_real_id, frente_id,
             frentes ( sigla ), eventos ( competicao, data )`)
    .lte("abre_em", fim)
    .gte("prazo_em", `${inicio}T00:00:00Z`)
    .order("prazo_em");
  const { data: brutas } = await (gestor
    ? base.or(`frente_id.in.(${ids.join(",")}),and(frente_id.is.null,origem.eq.registrada)`)
    : base.in("frente_id", ids));
  const tarefas = (brutas ?? []).map((t) => ({
    ...t,
    frente: Array.isArray(t.frentes) ? t.frentes[0] : t.frentes,
    evento: Array.isArray(t.eventos) ? t.eventos[0] : t.eventos,
  }));
  const idsTarefas = tarefas.map((t) => t.id);
  if (idsTarefas.length === 0) return [];

  const [{ data: tempos }, { data: sessoesAbertas }] = await Promise.all([
    supabase.from("v_tempo_tarefa").select("tarefa_id, segundos_total").in("tarefa_id", idsTarefas),
    supabase.from("sessoes").select("tarefa_id, pessoa_id").in("tarefa_id", idsTarefas).is("fim", null),
  ]);
  const porId = new Map((tempos ?? []).map((t) => [t.tarefa_id, Number(t.segundos_total)]));
  // Quem exatamente está rodando agora — pode ser mais de uma pessoa na mesma tarefa.
  const rodandoPorTarefa = new Map<string, string[]>();
  (sessoesAbertas ?? []).forEach((s) => {
    const lista = rodandoPorTarefa.get(s.tarefa_id) ?? [];
    lista.push(nomePor.get(s.pessoa_id) ?? "alguém");
    rodandoPorTarefa.set(s.tarefa_id, lista);
  });
  return tarefas.map((t) => ({
    id: t.id, titulo: t.titulo, atividade: t.atividade, status: t.status,
    escalado_id: t.escalado_id, dupla_id: t.dupla_id, responsavel_real_id: t.responsavel_real_id,
    frente: t.frente, evento: t.evento,
    segundos: porId.get(t.id) ?? 0,
    rodando: rodandoPorTarefa.get(t.id) ?? [],
  }));
}
