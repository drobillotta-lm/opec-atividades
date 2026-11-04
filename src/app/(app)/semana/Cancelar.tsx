"use client";

import { useRef } from "react";
import { Submit } from "./Cronometro";

/** "Cancelar" (04/11): começou sem querer, joga fora o trecho que está rodando e a atividade volta
 * a ficar como estava antes de clicar Iniciar. O que já tinha de tempo antes continua. */
export function BotaoCancelar({ acao, quantas = 1 }: { acao: () => void | Promise<void>; quantas?: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} title="Comecei sem querer"
        className="flex items-center min-h-[42px] px-3 rounded-[9px] border border-linha-2 bg-superficie-2 text-[12px] text-tinta-4 hover:text-rosa transition">
        Cancelar
      </button>
      <dialog ref={ref} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(420px,92vw)] rounded-xl bg-superficie text-tinta border border-linha p-0 backdrop:bg-black/60">
        <form action={acao} onSubmit={() => setTimeout(() => ref.current?.close(), 0)} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Cancelar {quantas > 1 ? `as ${quantas} atividades` : "esta atividade"}?</h2>
            <p className="text-[12.5px] text-tinta-3">
              O tempo que está correndo agora é descartado e {quantas > 1 ? "elas voltam" : "ela volta"} a ficar como
              {quantas > 1 ? " estavam" : " estava"} antes de você clicar em Iniciar. O tempo de vezes anteriores continua.
              Atividade começada do zero, sem nenhum outro tempo, é apagada.
            </p>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => ref.current?.close()}
              className="min-h-10 px-4 rounded-lg border border-linha bg-superficie-2 text-[13px] text-tinta-3 hover:text-tinta-2">Voltar</button>
            <Submit ocupado="..." className="min-h-10 px-4 rounded-lg border border-rosa-borda bg-rosa-fundo text-[13px] font-semibold text-rosa hover:brightness-110">
              Descartar e cancelar
            </Submit>
          </div>
        </form>
      </dialog>
    </>
  );
}
