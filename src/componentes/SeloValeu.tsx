"use client";

import { useEffect, useState } from "react";

/**
 * Selo "Valeu cara" (docs/06, decisão 5): aparece em TODA entrega, 3 segundos, e some sozinho.
 * Não guarda nada, não vira pontuação. Fora do prazo muda o texto, não a pose.
 * Fica montado no layout porque o diálogo de entrega some da tela quando a tarefa vira
 * entregue; quem entrega só dispara o evento.
 */
const EVENTO = "sr-minutos:valeu";

export function avisarValeu(atrasada: boolean) {
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { atrasada } }));
}

export function SeloValeu() {
  const [selo, setSelo] = useState<{ atrasada: boolean } | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const mostrar = (e: Event) => {
      setSelo({ atrasada: !!(e as CustomEvent).detail?.atrasada });
      clearTimeout(timer);
      timer = setTimeout(() => setSelo(null), 3000);
    };
    window.addEventListener(EVENTO, mostrar);
    return () => { window.removeEventListener(EVENTO, mostrar); clearTimeout(timer); };
  }, []);

  if (!selo) return null;
  return (
    <div role="status" aria-live="polite" onClick={() => setSelo(null)}
      className="fixed inset-0 z-50 grid place-items-center bg-fundo/85 backdrop-blur-[4px] cursor-pointer">
      <div className="flex flex-col items-center text-center">
        <picture>
          <source srcSet="/sr-minutos/joinha.png" media="(prefers-reduced-motion: reduce)" />
          {/* eslint-disable-next-line @next/next/no-img-element -- WebP animado, o otimizador do Next congelaria */}
          <img src="/sr-minutos/anim/joinha.webp" alt="" width={190} height={207} className="h-[190px] w-auto" />
        </picture>
        <b className="font-display text-[52px] font-extrabold uppercase leading-[0.9] text-verde -rotate-3">Valeu cara</b>
        <span className="mt-2 font-display text-[20px] font-bold uppercase text-tinta-2">
          {selo.atrasada ? "Fechou, mesmo atrasada." : "Aprovado pelo Sr. Minutos"}
        </span>
      </div>
    </div>
  );
}
