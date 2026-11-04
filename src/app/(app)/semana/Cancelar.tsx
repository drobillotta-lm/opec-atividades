"use client";

import { useRef } from "react";
import { Submit } from "./Cronometro";

/** "Cancelar" (04/11): começou sem querer, joga fora o trecho que está rodando e a atividade volta
 * a ficar como estava antes de clicar Iniciar. Com "apagar também o tempo de antes", some todo o
 * tempo da pessoa nela (sessões e ajustes dela; o de outras pessoas fica).
 * modo "zerar": a mesma limpeza total, numa atividade que já está pausada. */
export function BotaoCancelar({ acao, quantas = 1, modo = "cancelar" }: {
  acao: (formData: FormData) => void | Promise<void>; quantas?: number; modo?: "cancelar" | "zerar";
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const zerar = modo === "zerar";
  const plural = quantas > 1;
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} title={zerar ? "Apagar o tempo que marquei" : "Comecei sem querer"}
        className={zerar
          ? "min-h-8 px-2.5 rounded-md border border-linha-2 bg-superficie-2 text-[11.5px] text-tinta-4 hover:text-rosa transition"
          : "flex items-center min-h-[42px] px-3 rounded-[9px] border border-linha-2 bg-superficie-2 text-[12px] text-tinta-4 hover:text-rosa transition"}>
        {zerar ? "zerar meu tempo" : "Cancelar"}
      </button>
      <dialog ref={ref} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(420px,92vw)] rounded-xl bg-superficie text-tinta border border-linha p-0 backdrop:bg-black/60">
        <form action={acao} onSubmit={() => setTimeout(() => ref.current?.close(), 0)} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">
              {zerar ? "Zerar o seu tempo nesta atividade?" : `Cancelar ${plural ? `as ${quantas} atividades` : "esta atividade"}?`}
            </h2>
            <p className="text-[12.5px] text-tinta-3">
              {zerar
                ? "Todo o tempo que você marcou nela é apagado, incluindo ajustes seus, e ela volta a ficar como se você nunca tivesse começado. O tempo de outras pessoas fica."
                : `O tempo que está correndo agora é descartado e ${plural ? "elas voltam" : "ela volta"} a ficar como ${plural ? "estavam" : "estava"} antes de você clicar em Iniciar.`}
            </p>
          </div>
          {!zerar && (
            <label className="flex items-start gap-2.5 rounded-lg bg-superficie-2 border border-linha px-3 py-2.5 cursor-pointer">
              <input type="checkbox" name="tudo" value="1" className="mt-0.5 h-4 w-4 accent-[var(--rosa)]" />
              <span className="text-[12.5px] text-tinta-2">
                Apagar também o tempo que eu já tinha marcado antes {plural ? "nelas" : "nela"}
                <span className="block text-[11.5px] text-tinta-4">{plural ? "Elas voltam" : "Volta"} como se nunca tivesse sido começada. O tempo de outras pessoas fica.</span>
              </span>
            </label>
          )}
          <p className="text-[11.5px] text-tinta-4">Atividade começada do zero que ficar sem tempo nenhum é apagada.</p>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => ref.current?.close()}
              className="min-h-10 px-4 rounded-lg border border-linha bg-superficie-2 text-[13px] text-tinta-3 hover:text-tinta-2">Voltar</button>
            <Submit ocupado="..." className="min-h-10 px-4 rounded-lg border border-rosa-borda bg-rosa-fundo text-[13px] font-semibold text-rosa hover:brightness-110">
              {zerar ? "Zerar meu tempo" : "Descartar e cancelar"}
            </Submit>
          </div>
        </form>
      </dialog>
    </>
  );
}
