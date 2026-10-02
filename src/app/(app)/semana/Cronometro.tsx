"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { relogio, hhmm, tempoLegivel } from "@/lib/semana";
import { avisarValeu } from "@/componentes/SeloValeu";

export function Relogio({ desde, baseSeg }: { desde: string; baseSeg: number }) {
  const [seg, setSeg] = useState(() => calc(desde, baseSeg));
  useEffect(() => {
    setSeg(calc(desde, baseSeg));
    const t = setInterval(() => setSeg(calc(desde, baseSeg)), 1000);
    return () => clearInterval(t);
  }, [desde, baseSeg]);
  return <span className="num text-[29px] font-medium tracking-[-0.02em]">{relogio(seg)}</span>;
}

/** Total na tarefa: o que ja estava somado mais esta sessao correndo. */
const calc = (desde: string, baseSeg: number) =>
  baseSeg + (Date.now() - new Date(desde).getTime()) / 1000;

export function Submit({ children, ocupado, className }: { children: React.ReactNode; ocupado: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>
      {pending ? ocupado : children}
    </button>
  );
}

export function TempoParado({ segundos, estimativaMin }: { segundos: number; estimativaMin: number }) {
  return (
    <span className="num text-[12.5px] text-tinta-4 shrink-0">
      {tempoLegivel(segundos)} / {hhmm(estimativaMin)}
    </span>
  );
}

type Pessoa = { id: string; nome: string };

type Contribuinte = { nome: string; segundos: number };

export function DialogoEntrega({
  acao,
  titulo,
  subtitulo,
  segundosMedidos,
  estimativaMin,
  escaladoId,
  duplaId,
  euId,
  time,
  contribuintes,
  classeBotao,
  rotuloBotao,
  atrasada = false,
}: {
  acao: (formData: FormData) => void | Promise<void>;
  titulo: string;
  subtitulo: string;
  segundosMedidos: number;
  estimativaMin: number;
  escaladoId: string;
  duplaId?: string | null;
  euId?: string;
  time: Pessoa[];
  contribuintes?: Contribuinte[];
  classeBotao: string;
  rotuloBotao: string;
  atrasada?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  // Em dupla, quem entrega costuma ser quem fez: o padrao e a propria pessoa se ela e
  // escalada ou dupla; senao, o escalado.
  const quemPadrao = euId && (euId === escaladoId || euId === duplaId) ? euId : escaladoId;
  const [minutos, setMinutos] = useState(Math.max(0, Math.round(segundosMedidos / 60)));

  return (
    <>
      <button type="button" onClick={() => { setMinutos(Math.max(0, Math.round(segundosMedidos / 60))); ref.current?.showModal(); }} className={classeBotao}>
        {rotuloBotao}
      </button>

      <dialog
        ref={ref}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(440px,92vw)] rounded-xl bg-superficie text-tinta border border-linha p-0 backdrop:bg-black/60"
      >
        <form action={acao} onSubmit={() => avisarValeu(atrasada)} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Entregar tarefa</h2>
            <p className="text-[13px] text-tinta-2">{titulo}</p>
            <p className="text-[11.5px] text-tinta-4">{subtitulo}</p>
          </div>

          {contribuintes && contribuintes.length > 1 && (
            <p className="text-[11.5px] text-tinta-3 rounded-lg bg-superficie-2 border border-linha px-3 py-2">
              Mais de uma pessoa cronometrou esta tarefa: {contribuintes.map((c, i) => (
                <span key={c.nome}>{i > 0 && ", "}<strong className="text-tinta-2 font-medium">{c.nome}</strong> ({tempoLegivel(c.segundos)})</span>
              ))}. O comentário abaixo é o lugar de registrar quem fez o quê.
            </p>
          )}

          <div className="flex flex-col gap-2">
            <label htmlFor="minutos" className="text-[12.5px] font-medium text-tinta-2">Tempo gasto</label>
            <div className="flex items-center gap-2">
              <input
                id="minutos" name="minutos" type="number" min={0} step={5} required
                value={minutos}
                onChange={(e) => setMinutos(Number(e.target.value))}
                className="num w-28 min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[14px]"
              />
              <span className="text-[12.5px] text-tinta-4">minutos · {hhmm(minutos)}</span>
            </div>
            <p className="text-[11.5px] text-tinta-4">
              O cronômetro mediu {tempoLegivel(segundosMedidos)}. A taxa prevista é {hhmm(estimativaMin)}.
              Se você mudar o número, a diferença fica registrada como ajuste, separada do que o relógio contou.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="quem" className="text-[12.5px] font-medium text-tinta-2">Quem fez</label>
            <select id="quem" name="quem" defaultValue={quemPadrao}
              className="min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[13px]">
              {time.map((p) => (
                <option key={p.id} value={p.id}>{p.id === escaladoId ? `${p.nome} (escalado)` : p.id === duplaId ? `${p.nome} (dupla)` : p.nome}</option>
              ))}
            </select>
            <p className="text-[11.5px] text-tinta-4">Se for outra pessoa, vira um desvio de escala no fechamento.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="comentario" className="text-[12.5px] font-medium text-tinta-2">Comentário <span className="text-tinta-4 font-normal">(opcional)</span></label>
            <textarea id="comentario" name="comentario" rows={3} placeholder="O que valeu registrar sobre esta entrega"
              className="px-3 py-2 rounded-lg border border-linha bg-superficie-2 text-[13px] resize-none" />
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => ref.current?.close()}
              className="min-h-10 px-4 rounded-lg border border-linha bg-superficie-2 text-[13px] text-tinta-3 hover:text-tinta-2">
              Cancelar
            </button>
            <Submit ocupado="Entregando..." className="min-h-10 px-4 rounded-lg bg-verde text-verde-ink text-[13px] font-semibold hover:brightness-110">
              Confirmar entrega
            </Submit>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** Ajuste avulso — fora do dialogo de entrega, pra corrigir tempo de uma tarefa ja
 * entregue ou somar tempo que o cronometro nao pegou. Sempre com motivo, sempre
 * separado do que o relogio contou (mesma tabela ajustes_tempo da entrega). */
export function DialogoAjuste({
  acao,
  titulo,
}: {
  acao: (formData: FormData) => void | Promise<void>;
  titulo: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()}
        className="min-h-8 px-2.5 rounded-md border border-linha-2 bg-superficie-2 text-[11.5px] text-tinta-4 hover:text-tinta-2 transition">
        ajustar tempo
      </button>

      <dialog
        ref={ref}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(420px,92vw)] rounded-xl bg-superficie text-tinta border border-linha p-0 backdrop:bg-black/60"
      >
        <form action={acao} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Ajustar tempo</h2>
            <p className="text-[13px] text-tinta-2">{titulo}</p>
            <p className="text-[11.5px] text-tinta-4">
              Soma ou desconta minutos do total, sem mexer no que o cronômetro mediu.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="minutos-ajuste" className="text-[12.5px] font-medium text-tinta-2">Minutos</label>
            <input
              id="minutos-ajuste" name="minutos" type="number" step={5} required
              placeholder="ex.: 20 ou -20"
              className="num w-32 min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[14px]"
            />
            <p className="text-[11.5px] text-tinta-4">Negativo desconta.</p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="motivo-ajuste" className="text-[12.5px] font-medium text-tinta-2">Motivo</label>
            <textarea id="motivo-ajuste" name="motivo" rows={2} required
              placeholder="ex.: cronômetro ficou aberto por engano"
              className="px-3 py-2 rounded-lg border border-linha bg-superficie-2 text-[13px] resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => ref.current?.close()}
              className="min-h-10 px-4 rounded-lg border border-linha bg-superficie-2 text-[13px] text-tinta-3 hover:text-tinta-2">
              Cancelar
            </button>
            <Submit ocupado="Salvando..." className="min-h-10 px-4 rounded-lg border border-linha bg-elevado text-[13px] font-semibold text-tinta-2 hover:bg-linha">
              Salvar ajuste
            </Submit>
          </div>
        </form>
      </dialog>
    </>
  );
}

/** "Atividade desnecessária" — materiais/sincronização só fazem sentido se tiver
 * material novo pra aquela competição; sem isso, nem o líder nem quem for fazer
 * conseguem saber de antemão. Fica pra quem chegou na tarefa decidir, sem virar
 * "entregue" mentindo sobre o que aconteceu. */
export function DialogoDesnecessaria({
  acao,
  titulo,
}: {
  acao: (formData: FormData) => void | Promise<void>;
  titulo: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()}
        className="min-h-8 px-2.5 rounded-md border border-linha-2 bg-superficie-2 text-[11.5px] text-tinta-4 hover:text-tinta-2 transition">
        não necessária
      </button>

      <dialog
        ref={ref}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(420px,92vw)] rounded-xl bg-superficie text-tinta border border-linha p-0 backdrop:bg-black/60"
      >
        <form action={acao} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Marcar como não necessária</h2>
            <p className="text-[13px] text-tinta-2">{titulo}</p>
            <p className="text-[11.5px] text-tinta-4">
              Sai da contagem de pendentes sem virar &quot;entregue&quot; — o sistema não vai cobrar tempo dela.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="motivo" className="text-[12.5px] font-medium text-tinta-2">
              Por quê <span className="text-tinta-4 font-normal">(opcional)</span>
            </label>
            <textarea id="motivo" name="motivo" rows={2} placeholder="ex.: sem material novo pra essa competição"
              className="px-3 py-2 rounded-lg border border-linha bg-superficie-2 text-[13px] resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => ref.current?.close()}
              className="min-h-10 px-4 rounded-lg border border-linha bg-superficie-2 text-[13px] text-tinta-3 hover:text-tinta-2">
              Cancelar
            </button>
            <Submit ocupado="..." className="min-h-10 px-4 rounded-lg border border-linha bg-elevado text-[13px] font-semibold text-tinta-2 hover:bg-linha">
              Confirmar
            </Submit>
          </div>
        </form>
      </dialog>
    </>
  );
}
