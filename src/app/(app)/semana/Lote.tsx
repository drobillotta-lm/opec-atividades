"use client";

import { createContext, useContext, useMemo, useRef, useState, useTransition } from "react";
import { hhmm } from "@/lib/semana";
import { avisarValeu } from "@/componentes/SeloValeu";
import { Submit } from "./Cronometro";

/** "Iniciar juntas" (054, aprovado pelo Daniel em 03/11): a pessoa marca duas ou mais atividades
 * pendentes e liga um cronômetro só. Por baixo cada tarefa ganha a sua sessão, com o mesmo
 * lote_id e uma fração do tempo (estimativa / soma das estimativas). A seleção vive aqui, no
 * cliente; as linhas são componentes de servidor e só recebem a caixinha. */

type Selecao = { ids: Set<string>; alternar: (id: string) => void; limpar: () => void };
const Ctx = createContext<Selecao | null>(null);

export function LoteProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<Set<string>>(() => new Set());
  const valor = useMemo<Selecao>(() => ({
    ids,
    alternar: (id) => setIds((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }),
    limpar: () => setIds(new Set()),
  }), [ids]);
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function CaixaLote({ id }: { id: string }) {
  const sel = useContext(Ctx);
  if (!sel) return null;
  return (
    <input type="checkbox" checked={sel.ids.has(id)} onChange={() => sel.alternar(id)}
      aria-label="Selecionar para iniciar junto com outras"
      className="h-4 w-4 shrink-0 accent-[var(--verde)] cursor-pointer" />
  );
}

export function BarraLote({ iniciar }: { iniciar: (ids: string[]) => Promise<void> }) {
  const sel = useContext(Ctx);
  const [ocupado, comecar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  if (!sel || sel.ids.size === 0) return null;
  const n = sel.ids.size;
  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-3 rounded-[12px] bg-superficie border border-linha shadow-lg px-4 py-2.5">
      <span className="text-[12.5px] text-tinta-2"><span className="num font-medium">{n}</span> selecionada{n > 1 ? "s" : ""}</span>
      {erro && <span className="text-[11.5px] text-rosa">{erro}</span>}
      <button type="button" onClick={sel.limpar} className="text-[11.5px] text-tinta-4 hover:text-tinta-2">limpar</button>
      <button type="button" disabled={n < 2 || ocupado}
        onClick={() => { setErro(null); comecar(async () => {
          try { await iniciar([...sel.ids]); sel.limpar(); }
          catch (e) { setErro(e instanceof Error ? e.message : String(e)); }
        }); }}
        title={n < 2 ? "Marque pelo menos duas" : "Um cronômetro só para todas"}
        className="min-h-[38px] px-3.5 rounded-[9px] bg-verde text-verde-ink text-[12.5px] font-semibold hover:brightness-110 transition disabled:opacity-50 disabled:cursor-not-allowed">
        {ocupado ? "..." : "Iniciar juntas"}
      </button>
    </div>
  );
}

type ItemLote = { id: string; nome: string; segundos: number; estimativaMin: number; fracao: number; escaladoId: string; duplaId: string | null };
type Pessoa = { id: string; nome: string };

/** Entrega do lote inteiro: um tempo total, um "quem fez", um comentário. O servidor rateia o
 * total entre as tarefas na proporção do que cada uma já mediu. */
export function DialogoEntregaLote({ acao, itens, desde, euId, time, atrasada, classeBotao }: {
  acao: (formData: FormData) => void | Promise<void>;
  itens: ItemLote[]; desde: string; euId: string; time: Pessoa[]; atrasada: boolean; classeBotao: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [minutos, setMinutos] = useState(0);
  const totalAgora = () => {
    const correndo = (Date.now() - new Date(desde).getTime()) / 1000;
    return itens.reduce((s, it) => s + it.segundos + correndo * it.fracao, 0);
  };
  const estimativa = itens.reduce((s, it) => s + it.estimativaMin, 0);
  const souDeAlguma = itens.some((it) => it.escaladoId === euId || it.duplaId === euId);
  const quemPadrao = souDeAlguma ? euId : itens[0]?.escaladoId ?? euId;

  return (
    <>
      <button type="button" onClick={() => { setMinutos(Math.max(0, Math.round(totalAgora() / 60))); ref.current?.showModal(); }} className={classeBotao}>
        Entregar as {itens.length}
      </button>
      <dialog ref={ref} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(480px,92vw)] rounded-xl bg-superficie text-tinta border border-linha p-0 backdrop:bg-black/60">
        <form action={acao} onSubmit={() => avisarValeu(atrasada)} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Entregar {itens.length} atividades juntas</h2>
            <ul className="flex flex-col gap-0.5 pt-1">
              {itens.map((it) => (
                <li key={it.id} className="text-[12.5px] text-tinta-2 flex justify-between gap-3">
                  <span className="truncate">{it.nome}</span>
                  <span className="num text-tinta-4 shrink-0">{Math.round(it.fracao * 100)}%</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="minutos-lote" className="text-[12.5px] font-medium text-tinta-2">Tempo total das {itens.length}</label>
            <div className="flex items-center gap-2">
              <input id="minutos-lote" name="minutos" type="number" min={0} step={1} required value={minutos}
                onChange={(e) => setMinutos(Number(e.target.value))}
                className="num w-28 min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[14px]" />
              <span className="text-[12.5px] text-tinta-4">minutos · {hhmm(minutos)}</span>
            </div>
            <p className="text-[11.5px] text-tinta-4">
              Soma do que cada uma já mediu, com este cronômetro rateado pelas porcentagens acima. As taxas
              previstas somam {hhmm(estimativa)}. Se você mudar o número, a diferença é distribuída na mesma
              proporção e fica registrada como ajuste em cada uma.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="quem-lote" className="text-[12.5px] font-medium text-tinta-2">Quem fez</label>
            <select id="quem-lote" name="quem" defaultValue={quemPadrao}
              className="min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[13px]">
              {time.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="comentario-lote" className="text-[12.5px] font-medium text-tinta-2">Comentário <span className="text-tinta-4 font-normal">(opcional, vai nas {itens.length})</span></label>
            <textarea id="comentario-lote" name="comentario" rows={2} placeholder="O que valeu registrar"
              className="px-3 py-2 rounded-lg border border-linha bg-superficie-2 text-[13px] resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => ref.current?.close()}
              className="min-h-10 px-4 rounded-lg border border-linha bg-superficie-2 text-[13px] text-tinta-3 hover:text-tinta-2">Cancelar</button>
            <Submit ocupado="Entregando..." className="min-h-10 px-4 rounded-lg bg-verde text-verde-ink text-[13px] font-semibold hover:brightness-110">
              Confirmar entrega
            </Submit>
          </div>
        </form>
      </dialog>
    </>
  );
}
