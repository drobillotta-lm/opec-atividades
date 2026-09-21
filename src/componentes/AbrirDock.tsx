"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const L = 372, A = 188;

type ApiPiP = {
  requestWindow: (o: { width?: number; height?: number; disallowReturnToOpener?: boolean; preferInitialWindowPlacement?: boolean }) => Promise<Window>;
  window: Window | null;
};
const api = () => (window as unknown as { documentPictureInPicture?: ApiPiP }).documentPictureInPicture;

/**
 * Document Picture-in-Picture e a unica forma de uma pagina web ficar acima das
 * outras janelas. Chrome e Edge desde a 116, Firefox desde a 151, Safari nao tem.
 *
 * A dor conhecida dessa API e a janela nascer sem estilo, porque voce precisa
 * clonar as folhas na mao. Aqui montamos um iframe apontando pra /dock: a rota
 * chega inteira e ja estilizada, e ainda busca os proprios dados.
 *
 * Limites confirmados na especificacao: exige gesto do usuario e HTTPS, so uma
 * janela por vez, nao da pra posicionar por codigo, e ela fecha junto com a aba
 * de origem. Por isso o cronometro vive no banco, nunca so na tela.
 */
export function AbrirDock() {
  const [suportado, setSuportado] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const janelaRef = useRef<Window | null>(null);

  useEffect(() => {
    const disponivel = typeof window !== "undefined" && "documentPictureInPicture" in window;
    setSuportado(disponivel);
    if (disponivel) setAberto(Boolean(api()?.window));
  }, []);

  // A janela flutuante e outro documento: a troca de tema na aba nao chega la sozinha.
  const espelharTema = useCallback((janela: Window) => {
    const tema = document.documentElement.getAttribute("data-tema") ?? "escuro";
    janela.document.documentElement.setAttribute("data-tema", tema);
    const quadro = janela.document.querySelector("iframe");
    quadro?.contentDocument?.documentElement.setAttribute("data-tema", tema);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const observador = new MutationObserver(() => {
      if (janelaRef.current && !janelaRef.current.closed) espelharTema(janelaRef.current);
    });
    observador.observe(document.documentElement, { attributes: true, attributeFilter: ["data-tema"] });
    return () => observador.disconnect();
  }, [aberto, espelharTema]);

  async function abrir() {
    setErro(null);
    const pip = api();
    if (!pip) return;
    if (pip.window) { pip.window.focus(); return; }

    try {
      const janela = await pip.requestWindow({
        width: L,
        height: A,
        disallowReturnToOpener: true,
        preferInitialWindowPlacement: true,
      });
      janelaRef.current = janela;

      const estilo = janela.document.createElement("style");
      estilo.textContent =
        "html,body{margin:0;padding:0;height:100%;background:transparent;overflow:hidden}" +
        "iframe{border:0;width:100%;height:100%;display:block;color-scheme:normal}";
      janela.document.head.append(estilo);

      const quadro = janela.document.createElement("iframe");
      quadro.src = "/dock";
      quadro.title = "Dock de atividades";
      quadro.addEventListener("load", () => espelharTema(janela));
      janela.document.body.append(quadro);

      espelharTema(janela);
      setAberto(true);
      janela.addEventListener("pagehide", () => { janelaRef.current = null; setAberto(false); });
    } catch (e) {
      const nome = (e as Error)?.name;
      setErro(
        nome === "NotAllowedError"
          ? "O navegador pediu um clique direto. Tente de novo."
          : "Não consegui abrir a janela flutuante.",
      );
    }
  }

  if (!suportado) {
    return (
      <a href="/dock" target="_blank" rel="noreferrer"
        className="flex items-center gap-2 min-h-[38px] px-3 rounded-[9px] border border-linha bg-superficie text-[12.5px] text-tinta-2 hover:bg-elevado transition"
        title="Seu navegador não tem janela flutuante; isto abre o dock numa aba">
        <IconeDock /> Abrir dock
      </a>
    );
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
