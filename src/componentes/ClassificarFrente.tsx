"use client";

import { useState } from "react";
import { Submit } from "@/app/(app)/semana/Cronometro";

type Frente = { id: string; nome: string };

/** Escolher entre as frentes que já existem, ou criar uma nova ali mesmo (ex.: Kings
 * League não tinha frente nenhuma). Reaproveitado no Admin (competição) e em
 * Gestão de eventos (evento avulso). */
export function ClassificarFrente({
  acaoClassificar,
  acaoCriar,
  frentes,
  rotuloOk = "ok",
}: {
  acaoClassificar: (formData: FormData) => void | Promise<void>;
  acaoCriar: (formData: FormData) => void | Promise<void>;
  frentes: Frente[];
  rotuloOk?: string;
}) {
  const [criando, setCriando] = useState(false);

  if (criando) {
    return (
      <form action={acaoCriar} className="flex gap-1.5 flex-wrap items-center justify-end">
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
        <Submit ocupado="criando..." className="min-h-8 px-2.5 rounded-md border border-verde-borda bg-verde-fundo text-verde-claro text-[12px] font-medium">
          criar e classificar
        </Submit>
        <button type="button" onClick={() => setCriando(false)} className="text-[11px] text-tinta-4 hover:text-tinta-2">
          cancelar
        </button>
      </form>
    );
  }

  return (
    <form action={acaoClassificar} className="flex gap-1.5 items-center shrink-0">
      <select name="frente_id" defaultValue=""
        className="min-h-8 px-2 rounded-md border border-linha bg-superficie-2 text-[12px] text-tinta-2">
        <option value="" disabled>qual frente?</option>
        {frentes.map((f) => <option key={f.id} value={f.id}>{f.nome}</option>)}
      </select>
      <Submit ocupado="..." className="min-h-8 px-2.5 rounded-md border border-linha bg-elevado text-[12px] text-tinta-2">{rotuloOk}</Submit>
      <button type="button" onClick={() => setCriando(true)} className="text-[11px] text-verde-claro hover:underline whitespace-nowrap">
        + nova frente
      </button>
    </form>
  );
}
