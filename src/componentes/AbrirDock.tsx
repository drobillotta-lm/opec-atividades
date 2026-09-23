"use client";

import { useEffect, useRef, useState } from "react";

const L = 372, A = 188;

/**
 * Janela comum (`window.open`), não Document Picture-in-Picture.
 *
 * A PiP ficava sempre por cima de tudo, mas o navegador fecha ela junto com a
 * aba que abriu — é regra da API, não dá pra evitar (o Daniel topou trocar
 * isso por ficar aberta o dia inteiro independente da aba principal).
 *
 * Sem iframe, sem mirror de tema: `/dock` é uma página normal, com o mesmo
 * script anti-pisca do layout raiz — o tema já chega certo sozinho, e
 * `BotaoTema` já ouve o evento `storage` de outra janela.
 */
export function AbrirDock() {
  const [aberto, setAberto] = useState(false);
  const janelaRef = useRef<Window | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => {
      if (janelaRef.current?.closed) { janelaRef.current = null; setAberto(false); }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  function abrir() {
    setErro(null);
    if (janelaRef.current && !janelaRef.current.closed) { janelaRef.current.focus(); return; }

    const esquerda = window.screen.width - L - 24;
    const janela = window.open(
      "/dock",
      "opec-dock",
      `width=${L},height=${A},left=${esquerda},top=24,menubar=no,toolbar=no,location=no,status=no,resizable=yes`,
    );
    if (!janela) { setErro("O navegador bloqueou a janela. Permita pop-ups para continuar."); return; }
    janelaRef.current = janela;
    setAberto(true);
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button" onClick={abrir}
        className="flex items-center gap-2 min-h-[38px] px-3 rounded-[9px] border border-linha bg-superficie text-[12.5px] text-tinta-2 hover:bg-elevado transition"
      >
        <IconeDock /> {aberto ? "Dock aberto" : "Abrir dock"}
      </button>
      {erro && <span className="text-[11px] text-ambar-claro">{erro}</span>}
    </div>
  );
}

function IconeDock() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
      <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
      <rect x="8" y="8" width="5.5" height="4.5" rx="1" fill="currentColor" stroke="none" opacity=".55" />
    </svg>
  );
}
