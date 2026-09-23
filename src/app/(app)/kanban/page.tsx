import { criarClienteServidor } from "@/lib/supabase/server";
import { semanaDe, rotuloSemana, diaCurto, ROTULO_ATIVIDADE } from "@/lib/semana";

export const dynamic = "force-dynamic";

export default async function Kanban() {
  const { inicio, fim } = semanaDe();
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, papel").eq("auth_user_id", user!.id).single();

  const gestor = pessoa!.papel === "gestor";
  const { data: minhasFrentes } = gestor
    ? await supabase.from("frentes").select("id, sigla").eq("ativa", true)
    : await supabase.from("frentes").select("id, sigla").eq("lider_id", pessoa!.id);

  const frentes = minhasFrentes ?? [];
  const { data: pessoas } = await supabase.from("pessoas").select("id, nome");
  const nomePor = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));

  const { data: brutas } = frentes.length
    ? await supabase
        .from("tarefas")
        .select(`id, atividade, status, estimativa_min, prazo_em, escalado_id, responsavel_real_id,
                 frentes ( sigla ), eventos ( competicao, data )`)
        .in("frente_id", frentes.map((f) => f.id))
        .lte("abre_em", fim)
        .gte("prazo_em", `${inicio}T00:00:00Z`)
        .order("prazo_em")
    : { data: [] };

  const tarefas = (brutas ?? []).map((t) => ({
    ...t,
    frente: Array.isArray(t.frentes) ? t.frentes[0] : t.frentes,
    evento: Array.isArray(t.eventos) ? t.eventos[0] : t.eventos,
  }));
  const ids = tarefas.map((t) => t.id);

  const { data: tempos } = ids.length
    ? await supabase.from("v_tempo_tarefa").select("*").in("tarefa_id", ids)
    : { data: [] as { tarefa_id: string; segundos_total: number; sessao_aberta_desde: string | null }[] };
  const porId = new Map((tempos ?? []).map((t) => [t.tarefa_id, t]));

  // Quem exatamente está rodando agora — pode ser mais de uma pessoa na mesma tarefa.
  const { data: sessoesAbertas } = ids.length
    ? await supabase.from("sessoes").select("tarefa_id, pessoa_id").in("tarefa_id", ids).is("fim", null)
    : { data: [] as { tarefa_id: string; pessoa_id: string }[] };
  const rodandoPorTarefa = new Map<string, string[]>();
  (sessoesAbertas ?? []).forEach((s) => {
    const lista = rodandoPorTarefa.get(s.tarefa_id) ?? [];
    lista.push(nomePor.get(s.pessoa_id) ?? "alguém");
    rodandoPorTarefa.set(s.tarefa_id, lista);
  });

  const comTempo = tarefas.map((t) => ({
    ...t,
    segundos: Number(porId.get(t.id)?.segundos_total ?? 0),
    rodando: rodandoPorTarefa.get(t.id) ?? [],
  }));

  const pendente = comTempo.filter((t) => t.status === "pendente" && t.segundos <= 0 && t.rodando.length === 0);
  const fazendo = comTempo.filter((t) => t.status === "pendente" && (t.segundos > 0 || t.rodando.length > 0));
  const feita = comTempo.filter((t) => t.status === "entregue" || t.status === "fora_do_prazo");

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[1280px]">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[23px] font-semibold tracking-[-0.02em]">Quadro</h1>
        <p className="text-[12.5px] text-tinta-3">
          Semana de {rotuloSemana(inicio, fim)} · {gestor ? "todas as frentes" : "sua frente"} · {comTempo.length} tarefas
        </p>
      </header>

      {frentes.length === 0 && (
        <p className="rounded-[10px] border border-dashed border-linha px-4 py-5 text-[12.5px] text-tinta-4">
          Você não lidera nenhuma frente.
        </p>
      )}

      {frentes.length > 0 && (
        <div className="grid grid-cols-3 gap-4 items-start">
          <Coluna titulo="Pendente" cor="text-tinta-3" tarefas={pendente} nomePor={nomePor} />
          <Coluna titulo="Fazendo" cor="text-azul-claro" tarefas={fazendo} nomePor={nomePor} />
          <Coluna titulo="Feita" cor="text-verde-claro" tarefas={feita} nomePor={nomePor} />
        </div>
      )}
    </div>
  );
}

type Tarefa = {
  id: string;
  atividade: string;
  status: string;
  escalado_id: string;
  responsavel_real_id: string | null;
  frente: { sigla: string } | null;
  evento: { competicao: string; data: string } | null;
  segundos: number;
  rodando: string[];
};

function Coluna({ titulo, cor, tarefas, nomePor }: { titulo: string; cor: string; tarefas: Tarefa[]; nomePor: Map<string, string> }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2 px-1">
        <h2 className={`text-[11.5px] font-semibold uppercase tracking-[0.1em] ${cor}`}>{titulo}</h2>
        <span className="text-[11.5px] text-tinta-4">{tarefas.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tarefas.length === 0 && (
          <p className="rounded-[10px] border border-dashed border-linha px-3 py-4 text-[12px] text-tinta-4">Nada aqui.</p>
        )}
        {tarefas.map((t) => {
          const desvio = t.responsavel_real_id && t.responsavel_real_id !== t.escalado_id;
          const quem = t.responsavel_real_id ?? t.escalado_id;
          return (
            <div key={t.id} className="rounded-[10px] bg-superficie border border-linha p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-medium">
                  {ROTULO_ATIVIDADE[t.atividade] ?? t.atividade}
                </span>
                <span className="text-[10.5px] text-tinta-4 shrink-0">{t.frente?.sigla}</span>
              </div>
              <span className="text-[11px] text-tinta-4 truncate">
                {t.evento?.competicao} · {t.evento && diaCurto(t.evento.data)}
              </span>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[11.5px] text-tinta-3">
                  {nomePor.get(quem) ?? "—"}{desvio ? " · desvio" : ""}
                </span>
                {t.rodando.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-verde-claro truncate">
                    <span className="w-1.5 h-1.5 rounded-full bg-verde shrink-0" />{t.rodando.join(", ")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
