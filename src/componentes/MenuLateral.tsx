"use client";

import { useEffect, useState } from "react";
import { Rosto } from "@/componentes/SrMinutos";

/**
 * O menu da esquerda, com a opção de recolher (pedido do Daniel, 08/10).
 * A preferência fica em localStorage (`opec-menu` = "recolhido") e é aplicada no <html> como
 * `data-menu` ANTES da primeira pintura pelo script anti-pisca do tema (Tema.tsx); aqui só se
 * lê o atributo e se alterna. O CSS em globals.css faz o resto: 232 px aberto, 56 px
 * recolhido, `.so-aberto` / `.so-recolhido` escolhem o que aparece em cada estado.
 * No celular (< 768 px) começa recolhido.
 */
export const CHAVE_MENU = "opec-menu";

export function MenuLateral({ nav, pessoa, acoes }: {
  nav: React.ReactNode;
  pessoa: { nome: string; iniciais: string; rotuloPapel: string };
  acoes: React.ReactNode;
}) {
  const [recolhido, setRecolhido] = useState(false);

  useEffect(() => {
    setRecolhido(document.documentElement.getAttribute("data-menu") === "recolhido");
  }, []);

  function alternar() {
    const novo = !recolhido;
    if (novo) document.documentElement.setAttribute("data-menu", "recolhido");
    else document.documentElement.removeAttribute("data-menu");
    try { localStorage.setItem(CHAVE_MENU, novo ? "recolhido" : "aberto"); } catch {}
    setRecolhido(novo);
  }

  const rotulo = recolhido ? "Abrir o menu" : "Recolher o menu";

  return (
    <aside data-menu-lateral
      className="w-[232px] shrink-0 bg-fundo-nav border-r border-linha flex flex-col p-[22px_14px] gap-6 transition-[width,padding] duration-150">
      <div className="flex items-center gap-2.5 px-2">
        <button type="button" onClick={alternar} aria-label={rotulo} title={rotulo}
          className="so-recolhido mx-auto rounded-full outline-none focus-visible:ring-2 focus-visible:ring-verde">
          <Rosto estado="verde" tamanho={32} />
        </button>
        <span className="so-aberto shrink-0"><Rosto estado="verde" tamanho={32} /></span>
        <div className="so-aberto flex flex-col min-w-0">
          <span className="font-display text-[19px] font-extrabold uppercase leading-none">Atividades</span>
          <span className="text-[10px] uppercase tracking-[0.08em] text-tinta-4">OPEC</span>
        </div>
        <button type="button" onClick={alternar} aria-label={rotulo} title={rotulo}
          className="so-aberto ml-auto w-7 h-7 grid place-items-center rounded-lg border border-linha text-tinta-3 hover:text-tinta transition">
          <SetaRecolher />
        </button>
      </div>

      <nav className="flex flex-col gap-0.5" aria-label="Navegação principal">{nav}</nav>

      <div className="mt-auto flex flex-col gap-2">
        <div className="flex items-center gap-2.5 rounded-[10px] bg-superficie border border-linha px-3 py-2.5 [html[data-menu=recolhido]_&]:px-0 [html[data-menu=recolhido]_&]:justify-center"
          title={`${pessoa.nome} · ${pessoa.rotuloPapel}`}>
          <div className="w-[30px] h-[30px] rounded-full bg-linha grid place-items-center shrink-0">
            <span className="text-xs font-semibold text-tinta-2">{pessoa.iniciais}</span>
          </div>
          <div className="so-aberto flex flex-col min-w-0">
            <span className="text-[12.5px] font-medium truncate">{pessoa.nome}</span>
            <span className="text-[11px] text-tinta-4">{pessoa.rotuloPapel}</span>
          </div>
        </div>
        {acoes}
      </div>
    </aside>
  );
}

function SetaRecolher() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 3 5 8l5 5" />
    </svg>
  );
}
