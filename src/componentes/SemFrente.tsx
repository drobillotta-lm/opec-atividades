import { definirFrenteDaTarefa } from "@/app/(app)/acoes";
import { Submit } from "@/app/(app)/semana/Cronometro";
import { tempoLegivel, ROTULO_STATUS } from "@/lib/semana";

/**
 * Bloco "Sem frente" (decisão do Daniel, 06/10): tarefa começada do zero pelo notch sem
 * escolher frente não aparece em nenhuma frente de líder. O gestor vê aqui, em Minha frente
 * e no Quadro, e encaixa numa frente; a partir daí ela segue o fluxo normal.
 */
export function SemFrente({ tarefas, frentes }: {
  tarefas: { id: string; nome: string; status: string; segundos: number; quem: string }[];
  frentes: { id: string; nome: string }[];
}) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-ambar">Sem frente</h2>
        <span className="num text-[11.5px] text-tinta-4">{tarefas.length}</span>
        <span className="text-[11.5px] text-tinta-4">· começadas do zero pelo notch; escolha a frente pra entrarem no fluxo</span>
      </div>
      <div className="rounded-xl bg-superficie border border-ambar-borda overflow-hidden">
        {tarefas.map((t) => (
          <div key={t.id} className="grid grid-cols-[1.9fr_0.9fr_0.8fr_auto] gap-3 items-center px-4 py-2.5 border-t first:border-t-0 border-linha-2">
            <span className="text-[13px] font-medium truncate">{t.nome}</span>
            <span className="text-[12.5px] text-tinta-3 truncate">{t.quem}</span>
            <span className="num text-[12px] text-tinta-4">{ROTULO_STATUS[t.status] ?? t.status} · {tempoLegivel(t.segundos)}</span>
            <form action={definirFrenteDaTarefa.bind(null, t.id)} className="flex gap-1.5 items-center justify-end">
              <label htmlFor={`f-${t.id}`} className="sr-only">Frente desta tarefa</label>
              <select id={`f-${t.id}`} name="frente_id" defaultValue=""
                className="min-h-8 px-2 rounded-md border border-linha bg-superficie-2 text-[12px] text-tinta-2">
                <option value="" disabled>qual frente?</option>
                {frentes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
              </select>
              <Submit ocupado="..." className="min-h-8 px-2.5 rounded-md border border-linha bg-elevado text-[12px] text-tinta-2">ok</Submit>
            </form>
          </div>
        ))}
      </div>
    </section>
  );
}
