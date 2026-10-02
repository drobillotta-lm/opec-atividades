"use client";

import { useRef } from "react";
import { Submit } from "./Cronometro";
import { tempoLegivel } from "@/lib/semana";

export type Parte = {
  id: string;
  titulo: string;
  status: "pendente" | "feita";
  pessoa_id: string;
  pessoa: string;
  segundos: number;
  rodandoPor: string[];
  minha: boolean;      // eu estou cronometrando esta parte agora
};

type Pessoa = { id: string; nome: string };

/** As partes de uma tarefa: quem faz cada uma, quanto já levou, iniciar e concluir.
 * O tempo de cada parte soma no total da tarefa (030). */
export function DialogoPartes({
  titulo,
  partes,
  time,
  euId,
  criar,
  iniciar,
  concluir,
  reabrir,
  apagar,
}: {
  titulo: string;
  partes: Parte[];
  time: Pessoa[];
  euId: string;
  criar: (formData: FormData) => void | Promise<void>;
  iniciar: (id: string) => void | Promise<void>;
  concluir: (id: string) => void | Promise<void>;
  reabrir: (id: string) => void | Promise<void>;
  apagar: (id: string) => void | Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const pendentes = partes.filter((p) => p.status === "pendente").length;

  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()}
        className={`min-h-8 px-2.5 rounded-md border text-[11.5px] transition ${
          partes.length ? "border-linha bg-superficie-2 text-tinta-2 hover:text-tinta" : "border-linha-2 bg-superficie-2 text-tinta-4 hover:text-tinta-2"
        }`}>
        {partes.length ? `partes · ${pendentes}/${partes.length}` : "dividir"}
      </button>

      <dialog
        ref={ref}
        onClick={(e) => { if (e.target === ref.current) ref.current?.close(); }}
        className="m-auto w-[min(520px,92vw)] rounded-xl bg-superficie text-tinta border border-linha p-0 backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-4 p-5">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-semibold tracking-[-0.01em]">Partes da tarefa</h2>
            <p className="text-[13px] text-tinta-2">{titulo}</p>
            <p className="text-[11.5px] text-tinta-4">
              Cada parte tem dono e cronômetro próprios; o tempo de todas soma no total da tarefa.
            </p>
          </div>

          {partes.length > 0 && (
            <ul className="flex flex-col">
              {partes.map((p) => (
                <li key={p.id} className="flex items-center gap-3 py-2.5 border-t border-linha-2">
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <span className={`text-[13px] ${p.status === "feita" ? "line-through text-tinta-4" : "text-tinta"}`}>{p.titulo}</span>
                    <span className="text-[11px] text-tinta-4 truncate">
                      {p.pessoa_id === euId ? "você" : p.pessoa}
                      {p.segundos > 0 && ` · ${tempoLegivel(p.segundos)}`}
                      {p.rodandoPor.length > 0 && ` · ${p.rodandoPor.join(", ")} agora`}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {p.status === "pendente" ? (
                      <>
                        {!p.minha && (
                          <form action={iniciar.bind(null, p.id)}>
                            <Submit ocupado="..." className="min-h-8 px-2.5 rounded-md border border-verde-borda bg-verde-fundo text-verde-claro text-[11.5px] font-medium hover:brightness-125 transition">
                              {p.segundos > 0 ? "Retomar" : "Iniciar"}
                            </Submit>
                          </form>
                        )}
                        <form action={concluir.bind(null, p.id)}>
                          <Submit ocupado="..." className="min-h-8 px-2.5 rounded-md bg-verde text-verde-ink text-[11.5px] font-semibold hover:brightness-110 transition">
                            Concluir
                          </Submit>
                        </form>
                        {p.segundos === 0 && !p.minha && p.rodandoPor.length === 0 && (
                          <form action={apagar.bind(null, p.id)}>
                            <Submit ocupado="..." className="min-h-8 px-2 rounded-md border border-linha-2 text-[11.5px] text-tinta-4 hover:text-tinta-2 transition" aria-label="Apagar parte">
                              ×
                            </Submit>
                          </form>
                        )}
                      </>
                    ) : (
                      <form action={reabrir.bind(null, p.id)}>
                        <Submit ocupado="..." className="min-h-8 px-2.5 rounded-md border border-linha bg-superficie-2 text-[11.5px] text-tinta-3 hover:text-tinta-2 transition">
                          reabrir
                        </Submit>
                      </form>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form action={criar} className="flex flex-col gap-2 border-t border-linha-2 pt-4">
            <label htmlFor="titulo-parte" className="text-[12.5px] font-medium text-tinta-2">Nova parte</label>
            <div className="flex gap-2">
              <input id="titulo-parte" name="titulo" type="text" required placeholder="ex.: cortes do 1º tempo"
                className="flex-1 min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[13px]" />
              <select name="pessoa" defaultValue={euId} aria-label="Quem faz"
                className="min-h-10 px-3 rounded-lg border border-linha bg-superficie-2 text-[13px]">
                {time.map((p) => (
                  <option key={p.id} value={p.id}>{p.id === euId ? "você" : p.nome}</option>
                ))}
              </select>
              <Submit ocupado="..." className="min-h-10 px-3.5 rounded-lg border border-linha bg-elevado text-[13px] font-medium hover:bg-linha">
                Adicionar
              </Submit>
            </div>
          </form>

          <div className="flex justify-end">
            <button type="button" onClick={() => ref.current?.close()}
              className="min-h-10 px-4 rounded-lg border border-linha bg-superficie-2 text-[13px] text-tinta-3 hover:text-tinta-2">
              Fechar
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
