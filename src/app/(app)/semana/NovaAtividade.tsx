"use client";

import { useRef } from "react";
import { Submit } from "./Cronometro";

/** "Começar do zero" no site (04/11): antes só existia no notch. Atividade que não estava no
 * mapa nasce registrada, com a pessoa como dona, e o cronômetro já liga. Mesma função do banco
 * do notch (notch_comecar_do_zero, 043). */
export function NovaAtividade({ acao, frentes }: {
  acao: (formData: FormData) => void | Promise<void>;
  frentes: { sigla: string; nome: string }[];
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()}
        className="min-h-9 px-3.5 rounded-[9px] bg-verde text-verde-ink text-[12.5px] font-semibold hover:brightness-110 transition">
        + Começar atividade não mapeada
      </button>
      <dialog ref={ref} onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(440px,92vw)] rounded-xl bg-superficie text-tinta border border-linha p-0 backdrop:bg-black/60">
        <form action={acao} onSubmit={() => setTimeout(() => ref.current?.close(), 0)} className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Começar atividade não mapeada</h2>
            <p className="text-[11.5px] text-tinta-4">
              Pra trabalho que não apareceu na sua lista. Ela fica no seu nome e o cronômetro já começa.
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="titulo-nova" className="text-[12.5px] font-medium text-tinta-2">O que você vai fazer</label>
            <input id="titulo-nova" name="titulo" required maxLength={120}
              placeholder="ex.: Roteiro Kings League Brazil, jogo 2"
              className="min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[13px]" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="frente-nova" className="text-[12.5px] font-medium text-tinta-2">Frente <span className="text-tinta-4 font-normal">(opcional)</span></label>
            <select id="frente-nova" name="frente" defaultValue=""
              className="min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[13px]">
              <option value="">não sei / nenhuma</option>
              {frentes.map((f) => <option key={f.sigla} value={f.sigla}>{f.nome}</option>)}
            </select>
            <p className="text-[11.5px] text-tinta-4">Sem frente, o gestor encaixa depois.</p>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={() => ref.current?.close()}
              className="min-h-10 px-4 rounded-lg border border-linha bg-superficie-2 text-[13px] text-tinta-3 hover:text-tinta-2">Cancelar</button>
            <Submit ocupado="Começando..." className="min-h-10 px-4 rounded-lg bg-verde text-verde-ink text-[13px] font-semibold hover:brightness-110">
              Começar agora
            </Submit>
          </div>
        </form>
      </dialog>
    </>
  );
}
