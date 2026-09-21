"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { relogio, hhmm } from "@/lib/semana";

export function Relogio({ desde, baseMin }: { desde: string; baseMin: number }) {
  const [seg, setSeg] = useState(() => calc(desde, baseMin));
  useEffect(() => {
    setSeg(calc(desde, baseMin));
    const t = setInterval(() => setSeg(calc(desde, baseMin)), 1000);
    return () => clearInterval(t);
  }, [desde, baseMin]);
  return <span className="num text-[29px] font-medium tracking-[-0.02em]">{relogio(seg)}</span>;
}

const calc = (desde: string, baseMin: number) =>
  baseMin * 60 + (Date.now() - new Date(desde).getTime()) / 1000;

export function Submit({ children, ocupado, className }: { children: React.ReactNode; ocupado: string; className: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>
      {pending ? ocupado : children}
    </button>
  );
}

/** Tempo curto nao pode virar 0h00: quem acabou de cronometrar precisa ver que contou. */
export function tempoLegivel(minutos: number) {
  if (minutos <= 0) return "0h00";
  if (minutos < 1) return "<1min";
  return hhmm(minutos);
}

export function TempoParado({ minutos, estimativa }: { minutos: number; estimativa: number }) {
  return (
    <span className="num text-[12.5px] text-tinta-4 shrink-0">
      {tempoLegivel(minutos)} / {hhmm(estimativa)}
    </span>
  );
}

type Pessoa = { id: string; nome: string };

export function DialogoEntrega({
  acao,
  titulo,
  subtitulo,
  minutosMedidos,
  estimativaMin,
  escaladoId,
  time,
  classeBotao,
  rotuloBotao,
}: {
  acao: (formData: FormData) => void | Promise<void>;
  titulo: string;
  subtitulo: string;
  minutosMedidos: number;
  estimativaMin: number;
  escaladoId: string;
  time: Pessoa[];
  classeBotao: string;
  rotuloBotao: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [minutos, setMinutos] = useState(Math.max(0, Math.round(minutosMedidos)));

  return (
    <>
      <button type="button" onClick={() => { setMinutos(Math.max(0, Math.round(minutosMedidos))); ref.current?.showModal(); }} className={classeBotao}>
        {rotuloBotao}
      </button>

      <dialog
        ref={ref}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(440px,92vw)] rounded-xl bg-superficie text-tinta border border-linha p-0 backdrop:bg-black/60"
      >
        <form action={acao} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Entregar tarefa</h2>
            <p className="text-[13px] text-tinta-2">{titulo}</p>
            <p className="text-[11.5px] text-tinta-4">{subtitulo}</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="minutos" className="text-[12.5px] font-medium text-tinta-2">Tempo gasto</label>
            <div className="flex items-center gap-2">
              <input
                id="minutos" name="minutos" type="number" min={0} step={5} required
                value={minutos}
                onChange={(e) => setMinutos(Number(e.target.value))}
                className="num w-28 min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[14px]"
              />
              <span className="text-[12.5px] text-tinta-4">minutos · {tempoLegivel(minutos)}</span>
            </div>
            <p className="text-[11.5px] text-tinta-4">
              O cronômetro mediu {tempoLegivel(minutosMedidos)}. A taxa prevista é {hhmm(estimativaMin)}.
              Se você mudar o número, a diferença fica registrada como ajuste, separada do que o relógio contou.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="quem" className="text-[12.5px] font-medium text-tinta-2">Quem fez</label>
            <select id="quem" name="quem" defaultValue={escaladoId}
              className="min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[13px]">
              {time.map((p) => (
                <option key={p.id} value={p.id}>{p.id === escaladoId ? `${p.nome} (escalado)` : p.nome}</option>
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
            <Submit ocupado="Entregando..." className="min-h-10 px-4 rounded-lg bg-verde text-[#07120d] text-[13px] font-semibold hover:brightness-110">
              Confirmar entrega
            </Submit>
          </div>
        </form>
      </dialog>
    </>
  );
}
