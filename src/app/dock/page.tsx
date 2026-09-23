import { criarClienteServidor } from "@/lib/supabase/server";
import { hhmm, tempoLegivel, ROTULO_ATIVIDADE } from "@/lib/semana";
import { iniciar, pausar } from "../(app)/acoes";
import { Relogio, Submit } from "../(app)/semana/Cronometro";
import { BotaoTema } from "@/componentes/Tema";
import { AutoAtualiza } from "./AutoAtualiza";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Dock() {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome").eq("auth_user_id", user!.id).single();

  // Sem filtro por abre_em: /semana deixa iniciar uma tarefa antes da janela abrir
  // (nada trava isso lá), e o dock precisa achar a sessao aberta mesmo assim -- e
  // era exatamente essa a tarefa que sumia daqui.
  const { data: brutas } = await supabase
    .from("tarefas")
    .select(`id, atividade, estimativa_min, prazo_em, abre_em,
             frentes ( nome ), eventos ( competicao )`)
    .eq("escalado_id", pessoa!.id)
    .eq("status", "pendente")
    .order("prazo_em");

  const lista = (brutas ?? []).map((t) => ({
    ...t,
    frente: Array.isArray(t.frentes) ? t.frentes[0] : t.frentes,
    evento: Array.isArray(t.eventos) ? t.eventos[0] : t.eventos,
  }));

  const { data: tempos } = lista.length
    ? await supabase.from("v_tempo_tarefa").select("*").in("tarefa_id", lista.map((t) => t.id))
    : { data: [] as { tarefa_id: string; segundos_total: number; sessao_aberta_desde: string | null }[] };

  const porId = new Map((tempos ?? []).map((t) => [t.tarefa_id, t]));
  const com = lista.map((t) => ({
    ...t,
    segundos: Number(porId.get(t.id)?.segundos_total ?? 0),
    correndo: porId.get(t.id)?.sessao_aberta_desde ?? null,
  }));

  // Rodando vale sempre; parada só entra como sugestão se a janela já abriu.
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const atual = com.find((t) => t.correndo) ?? com.find((t) => t.abre_em <= hoje);
  const pct = atual ? Math.min(100, (100 * atual.segundos) / (atual.estimativa_min * 60)) : 0;

  return (
    <div className="min-h-screen p-2.5 bg-transparent">
      <AutoAtualiza segundos={30} />
      <div className="vidro rounded-2xl px-4 py-3 flex flex-col gap-2.5">
        {!atual ? (
          <div className="flex items-center justify-between gap-3 min-h-[72px]">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-tinta-2">Nada em andamento</span>
              <span className="text-[11.5px] text-tinta-4">Sem tarefa aberta para hoje</span>
            </div>
            <BotaoTema compacto />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.11em]"
                      style={{ color: atual.correndo ? "var(--color-verde-claro)" : "var(--color-tinta-4)" }}>
                  <span className="w-1.5 h-1.5 rounded-full"
                        style={{ background: atual.correndo ? "var(--color-verde)" : "var(--color-tinta-4)" }} />
                  {atual.correndo ? "Em andamento" : "Pausada"}
                </span>
                <span className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                  {ROTULO_ATIVIDADE[atual.atividade] ?? atual.atividade} · {atual.frente?.nome}
                </span>
                <span className="text-[11px] text-tinta-4 truncate">{atual.evento?.competicao}</span>
              </div>
              <BotaoTema compacto />
            </div>

            <div className="flex items-baseline gap-2">
              {atual.correndo ? (
                <Relogio desde={atual.correndo} baseSeg={atual.segundos} />
              ) : (
                <span className="num text-[29px] font-medium tracking-[-0.02em]">{tempoLegivel(atual.segundos)}</span>
              )}
              <span className="num text-[11px] text-tinta-4">de {hhmm(atual.estimativa_min)}</span>
            </div>

            <div className="h-1.5 rounded-full bg-elevado overflow-hidden">
              <div className="h-1.5 rounded-full transition-[width] duration-500"
                   style={{ width: `${pct}%`, background: pct >= 100 ? "var(--color-ambar)" : "var(--color-azul)" }} />
            </div>

            <div className="flex gap-2">
              {atual.correndo ? (
                <form action={pausar} className="flex-1">
                  <Submit ocupado="..." className="w-full min-h-9 rounded-[10px] border border-linha bg-elevado text-[12px] font-medium hover:brightness-110 transition">
                    Pausar
                  </Submit>
                </form>
              ) : (
                <form action={iniciar.bind(null, atual.id)} className="flex-1">
                  <Submit ocupado="..." className="w-full min-h-9 rounded-[10px] border border-azul-borda bg-azul-fundo text-azul-claro text-[12px] font-medium hover:brightness-110 transition">
                    {atual.segundos > 0 ? "Retomar" : "Iniciar"}
                  </Submit>
                </form>
              )}
              <Link href="/semana" target="_blank"
                className="flex-1 min-h-9 grid place-items-center rounded-[10px] bg-verde text-[#07120d] text-[12px] font-semibold hover:brightness-110 transition">
                Entregar
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
