import { criarClienteServidor } from "@/lib/supabase/server";
import { semanaDe, rotuloSemana, diaCurto, hhmm, ROTULO_ATIVIDADE } from "@/lib/semana";
import { definirQuemFez, marcarDesnecessaria, reverterDesnecessaria } from "../acoes";
import { Submit, DialogoDesnecessaria } from "../semana/Cronometro";

export const dynamic = "force-dynamic";

export default async function MinhaFrente() {
  const { inicio, fim } = semanaDe();
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome, papel").eq("auth_user_id", user!.id).single();

  const gestor = pessoa!.papel === "gestor";
  const { data: minhasFrentes } = gestor
    ? await supabase.from("frentes").select("id, sigla, nome").eq("ativa", true).order("sigla")
    : await supabase.from("frentes").select("id, sigla, nome").eq("lider_id", pessoa!.id);

  const frentes = minhasFrentes ?? [];
  const { data: time } = await supabase.from("pessoas").select("id, nome").is("saida", null).order("nome");

  const { data: linhas } = frentes.length
    ? await supabase
        .from("tarefas")
        .select(`id, atividade, status, estimativa_min, prazo_em, escalado_id, responsavel_real_id, excecao_desc,
                 frentes ( sigla, nome ), eventos ( competicao, data )`)
        .in("frente_id", frentes.map((f) => f.id))
        .lte("abre_em", fim)
        .gte("prazo_em", `${inicio}T00:00:00Z`)
        .order("prazo_em")
    : { data: [] };

  const tarefas = (linhas ?? []).map((t) => ({
    ...t,
    frente: Array.isArray(t.frentes) ? t.frentes[0] : t.frentes,
    evento: Array.isArray(t.eventos) ? t.eventos[0] : t.eventos,
  }));
  const nomePor = new Map((time ?? []).map((p) => [p.id, p.nome]));
  const desvios = tarefas.filter((t) => t.responsavel_real_id && t.responsavel_real_id !== t.escalado_id).length;
  const aResolver = tarefas.filter((t) => !t.responsavel_real_id).length;

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[1140px]">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[23px] font-semibold tracking-[-0.02em]">
          {gestor ? "Frentes" : `Frente · ${frentes[0]?.nome ?? "—"}`}
        </h1>
        <p className="text-[12.5px] text-tinta-3">
          Semana de {rotuloSemana(inicio, fim)} · {tarefas.length} tarefas · {aResolver} sem quem fez · {desvios} desvios
        </p>
      </header>

      {frentes.length === 0 && (
        <p className="rounded-[10px] border border-dashed border-linha px-4 py-5 text-[12.5px] text-tinta-4">
          Você não lidera nenhuma frente.
        </p>
      )}

      {tarefas.length === 0 && frentes.length > 0 && (
        <p className="rounded-[10px] border border-dashed border-linha px-4 py-5 text-[12.5px] text-tinta-4">
          Nenhuma tarefa nesta semana.
        </p>
      )}

      {tarefas.length > 0 && (
        <div className="rounded-xl bg-superficie border border-linha overflow-hidden">
          <div className="grid grid-cols-[1.9fr_0.8fr_1.5fr_0.9fr] gap-3 px-4 py-2.5 bg-superficie-2">
            {["Tarefa", "Escalado", "Quem fez", "Prazo"].map((h) => (
              <span key={h} className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-tinta-4">{h}</span>
            ))}
          </div>
          {tarefas.map((t) => {
            const desvio = t.responsavel_real_id && t.responsavel_real_id !== t.escalado_id;
            return (
              <div key={t.id} className={`grid grid-cols-[1.9fr_0.8fr_1.5fr_0.9fr] gap-3 items-center px-4 py-2.5 border-t border-linha-2 ${desvio ? "bg-ambar-fundo" : ""}`}>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[13px] font-medium">
                    {ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · {t.frente?.sigla}
                  </span>
                  <span className="text-[11px] text-tinta-4 truncate">
                    {t.evento?.competicao} · {t.evento && diaCurto(t.evento.data)}
                  </span>
                </div>
                <span className="text-[12.5px] text-tinta-3">{nomePor.get(t.escalado_id) ?? "—"}</span>
                {t.status === "na" ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] text-tinta-4 truncate">não necessária{t.excecao_desc ? ` · ${t.excecao_desc}` : ""}</span>
                    <form action={reverterDesnecessaria.bind(null, t.id)}>
                      <Submit ocupado="..." className="text-[11px] text-azul-claro hover:underline shrink-0">desfazer</Submit>
                    </form>
                  </div>
                ) : t.responsavel_real_id ? (
                  <span className={`text-[12.5px] ${desvio ? "text-ambar-claro" : "text-tinta-2"}`}>
                    {nomePor.get(t.responsavel_real_id)}{desvio ? " · desvio" : ""}
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <form action={definirQuemFez.bind(null, t.id)} className="flex gap-1.5">
                      <label htmlFor={`q-${t.id}`} className="sr-only">Quem fez esta tarefa</label>
                      <select id={`q-${t.id}`} name="pessoa" defaultValue=""
                        className="min-h-8 px-2 rounded-md border border-linha bg-superficie-2 text-[12px] text-tinta-2">
                        <option value="" disabled>quem fez?</option>
                        {(time ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                      <Submit ocupado="..." className="min-h-8 px-2.5 rounded-md border border-linha bg-elevado text-[12px] text-tinta-2">ok</Submit>
                    </form>
                    <DialogoDesnecessaria
                      acao={marcarDesnecessaria.bind(null, t.id)}
                      titulo={`${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${t.frente?.nome}`}
                    />
                  </div>
                )}
                <span className="num text-[12px] text-tinta-4">{diaCurto(t.prazo_em.slice(0, 10))}</span>
              </div>
            );
          })}
        </div>
      )}

      <p className="rounded-[10px] bg-superficie-2 border border-dashed border-linha px-4 py-3 text-[12.5px] leading-relaxed text-tinta-3">
        A coluna <strong className="text-tinta-2 font-semibold">quem fez</strong> é a que hoje o líder
        preenche à mão no CSV de acompanhamento. Quando ela difere do escalado, vira um desvio de escala
        no fechamento da semana.
      </p>
    </div>
  );
}
