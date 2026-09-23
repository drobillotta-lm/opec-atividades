"use client";

import { useState } from "react";
import { Submit } from "../../semana/Cronometro";

type Frente = { id: string; nome: string };

/** Evento sem frente: decide se a classificação vale pra competição inteira (o
 * padrão) ou só pra este evento (a exceção — "esse é diferente dos outros"). */
export function ClassificarEvento({
  acaoClassificarCompeticao,
  acaoClassificarEvento,
  acaoCriarFrente,
  frentes,
}: {
  acaoClassificarCompeticao: (formData: FormData) => void | Promise<void>;
  acaoClassificarEvento: (formData: FormData) => void | Promise<void>;
  acaoCriarFrente: (formData: FormData) => void | Promise<void>;
  frentes: Frente[];
}) {
  const [escopo, setEscopo] = useState<"competicao" | "evento">("competicao");
  const [criando, setCriando] = useState(false);

  if (criando) {
    return (
      <form action={acaoCriarFrente} className="flex flex-col gap-1.5 items-end pt-1.5 border-t border-linha-2">
        <span className="text-[11px] text-tinta-4">Frente nova vale pra competição inteira</span>
        <div className="flex gap-1.5 flex-wrap justify-end">
          <input name="nome_frente" placeholder="nome da frente" required
            className="min-h-8 w-36 px-2 rounded-md border border-linha bg-superficie-2 text-[12px] text-tinta-2" />
          <input name="sigla" placeholder="sigla" maxLength={6} required
            className="min-h-8 w-16 px-2 rounded-md border border-linha bg-superficie-2 text-[12px] text-tinta-2 uppercase" />
          <select name="regime" defaultValue="rotacao_mensal"
            className="min-h-8 px-2 rounded-md border border-linha bg-superficie-2 text-[12px] text-tinta-2">
            <option value="rotacao_mensal">rotação mensal</option>
            <option value="rotacao_torneio">rotação por torneio</option>
            <option value="dupla_fixa">dupla fixa</option>
          </select>
          <Submit ocupado="criando..." className="min-h-8 px-2.5 rounded-md border border-azul-borda bg-azul-fundo text-azul-claro text-[12px] font-medium">
            criar
          </Submit>
          <button type="button" onClick={() => setCriando(false)} className="text-[11px] text-tinta-4 hover:text-tinta-2">
            cancelar
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={escopo === "competicao" ? acaoClassificarCompeticao : acaoClassificarEvento}
      className="flex flex-col gap-1.5 items-end pt-1.5 border-t border-linha-2">
      <div className="flex gap-3 text-[11px] text-tinta-3">
        <label className="flex items-center gap-1">
          <input type="radio" name="escopo" checked={escopo === "competicao"} onChange={() => setEscopo("competicao")} />
          esta competição inteira
        </label>
        <label className="flex items-center gap-1">
          <input type="radio" name="escopo" checked={escopo === "evento"} onChange={() => setEscopo("evento")} />
          só este evento
        </label>
      </div>
      <div className="flex gap-1.5 items-center">
        <select name="frente_id" defaultValue=""
          className="min-h-8 px-2 rounded-md border border-linha bg-superficie-2 text-[12px] text-tinta-2">
          <option value="" disabled>qual frente?</option>
          {frentes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
        </select>
        <Submit ocupado="..." className="min-h-8 px-2.5 rounded-md border border-linha bg-elevado text-[12px] text-tinta-2">ok</Submit>
        <button type="button" onClick={() => setCriando(true)} className="text-[11px] text-azul-claro hover:underline whitespace-nowrap">
          + nova frente
        </button>
      </div>
    </form>
  );
}
