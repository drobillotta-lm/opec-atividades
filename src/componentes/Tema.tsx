"use client";

import { useEffect, useState } from "react";

const CHAVE = "opec-tema";
type Tema = "claro" | "escuro";

/**
 * Script que roda antes da primeira pintura. Sem ele a tela pisca no tema
 * errado antes do React assumir. Vai inline no <head>, de proposito.
 */
export const scriptAntiPisca = `(function(){try{
var t=localStorage.getItem('${CHAVE}');
if(!t){t=window.matchMedia('(prefers-color-scheme: light)').matches?'claro':'escuro';}
document.documentElement.setAttribute('data-tema',t);
}catch(e){}})();`;

export function BotaoTema({ compacto = false }: { compacto?: boolean }) {
  const [tema, setTema] = useState<Tema>("escuro");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const atual = (document.documentElement.getAttribute("data-tema") as Tema) || "escuro";
    setTema(atual);
    setMontado(true);
  }, []);

  function trocar() {
    const novo: Tema = tema === "escuro" ? "claro" : "escuro";
    document.documentElement.setAttribute("data-tema", novo);
    try { localStorage.setItem(CHAVE, novo); } catch {}
    setTema(novo);
  }

  const rotulo = tema === "escuro" ? "Mudar para o tema claro" : "Mudar para o tema escuro";

  return (
    <button
      type="button"
      onClick={trocar}
      aria-label={rotulo}
      title={rotulo}
      className={
        compacto
          ? "w-7 h-7 grid place-items-center rounded-lg border border-linha bg-superficie-2 text-tinta-3 hover:text-tinta transition"
          : "flex items-center gap-2.5 min-h-[38px] px-3 rounded-[9px] text-[13px] text-tinta-3 hover:text-tinta-2 transition"
      }
    >
      {/* Sem tema definido ainda, nao desenhar icone nenhum evita o pisca invertido. */}
      {montado && (tema === "escuro" ? <IconeSol /> : <IconeLua />)}
      {!compacto && montado && <span>{tema === "escuro" ? "Tema claro" : "Tema escuro"}</span>}
    </button>
  );
}

function IconeSol() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden>
      <circle cx="8" cy="8" r="3.1" />
      <path d="M8 1.4v1.6M8 13v1.6M14.6 8H13M3 8H1.4M12.7 3.3l-1.1 1.1M4.4 11.6l-1.1 1.1M12.7 12.7l-1.1-1.1M4.4 4.4L3.3 3.3" />
    </svg>
  );
}

function IconeLua() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13.5 9.4A5.9 5.9 0 0 1 6.6 2.5a5.9 5.9 0 1 0 6.9 6.9z" />
    </svg>
  );
}
