"use client";

import { useState } from "react";
import { normalizar } from "@/lib/busca";

/** Busca rápida em Minhas atividades (04/11): filtra enquanto digita, sem recarregar. Cada linha
 * aberta traz `data-busca` com o texto normalizado (time, programa, competição, frente, tipo de
 * atividade); aqui só escrevemos uma regra de CSS que esconde as linhas que não têm todas as
 * palavras, e as seções que ficaram vazias. As linhas continuam sendo do servidor. */
export function BuscaRapida({ total }: { total: number }) {
  const [texto, setTexto] = useState("");
  const palavras = normalizar(texto).split(" ").filter(Boolean)
    .map((p) => p.replace(/["\\]/g, "\\$&"));
  const tem = palavras.map((p) => `[data-busca*="${p}"]`).join("");
  const css = palavras.length
    ? `[data-busca]:not(${tem}){display:none}[data-secao]:not(:has(${tem})){display:none}` +
      // Blocos fechados (11/11) abrem durante a busca, senão a linha achada fica escondida.
      `details[data-secao]::details-content{content-visibility:visible;block-size:auto}`
    : "";

  return (
    <div className="flex items-center gap-2">
      {css && <style>{css}</style>}
      <input type="search" value={texto} onChange={(e) => setTexto(e.target.value)}
        placeholder="Buscar: time, programa, competição ou tipo (ex.: flamengo auditoria)"
        aria-label="Buscar nas minhas atividades"
        className="flex-1 min-h-10 px-3.5 rounded-[10px] border border-linha bg-superficie text-[13px]" />
      {texto && (
        <button type="button" onClick={() => setTexto("")}
          className="min-h-10 px-3 rounded-[10px] border border-linha bg-superficie-2 text-[12px] text-tinta-3 hover:text-tinta-2">
          limpar
        </button>
      )}
      <span className="sr-only">{total} atividades na lista</span>
    </div>
  );
}
