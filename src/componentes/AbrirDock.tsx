"use client";

import { useEffect, useState } from "react";

const L = 360, A = 168;

/**
 * Document Picture-in-Picture e a unica forma de uma pagina web ficar acima das
 * outras janelas. Em vez de copiar folha de estilo para a janela nova, que e o
 * problema classico dessa API, montamos um iframe apontando para /dock: a pagina
 * ja chega inteira e estilizada.
 */
export function AbrirDock() {
  const [suportado, setSuportado] = useState(false);
  const [aberto, setAberto] = useState(false);

  useEffect(() => { setSuportado("documentPictureInPicture" in window); }, []);

  async function abrir() {
    const api = (window as unknown as { documentPictureInPicture?: { requestWindow: (o: object) => Promise<Window> } })
      .documentPictureInPicture;
    if (!api) return;
    const janela = await api.requestWindow({ width: L, height: A, disallowReturnToOpener: true });

    janela.document.documentElement.setAttribute(
      "data-tema",
      document.documentElement.getAttribute("data-tema") ?? "escuro",
    );
    const estilo = janela.document.createElement("style");
    estilo.textContent = "html,body{margin:0;padding:0;height:100%;background:transparent;overflow:hidden}iframe{border:0;width:100%;height:100%;display:block}";
    janela.document.head.append(estilo);

    const quadro = janela.document.createElement("iframe");
    quadro.src = "/dock";
    quadro.title = "Dock de atividades";
    janela.document.body.append(quadro);

    setAberto(true);
    janela.addEventListener("pagehide", () => setAberto(false));
  }

  if (!suportado) {
    return (
      <span className="text-[11.5px] text-tinta-4" title="Disponível no Chrome e no Edge">
        Dock flutuante precisa do Chrome
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={abrir}
      disabled={aberto}
      className="flex items-center gap-2 min-h-[38px] px-3 rounded-[9px] border border-linha bg-superficie text-[12.5px] text-tinta-2 hover:bg-elevado disabled:opacity-50 transition"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" aria-hidden>
        <rect x="1.5" y="2.5" width="13" height="11" rx="2" />
        <rect x="8" y="8" width="5.5" height="4.5" rx="1" fill="currentColor" stroke="none" opacity=".55" />
      </svg>
      {aberto ? "Dock aberto" : "Abrir dock"}
    </button>
  );
}
