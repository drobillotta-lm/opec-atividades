"use client";

import { useEffect, useState, useTransition } from "react";
import { relogio, hhmm } from "@/lib/semana";
import { iniciar, pausar, entregar } from "../acoes";

export function Relogio({ desde, baseMin }: { desde: string; baseMin: number }) {
  const [seg, setSeg] = useState(() => calc(desde, baseMin));
  useEffect(() => {
    const t = setInterval(() => setSeg(calc(desde, baseMin)), 1000);
    return () => clearInterval(t);
  }, [desde, baseMin]);
  return <span className="num text-[29px] font-medium tracking-[-0.02em]">{relogio(seg)}</span>;
}

function calc(desde: string, baseMin: number) {
  return baseMin * 60 + (Date.now() - new Date(desde).getTime()) / 1000;
}

export function BotaoIniciar({ id }: { id: string }) {
  const [pend, iniciarTransicao] = useTransition();
  return (
    <button
      type="button"
      disabled={pend}
      onClick={() => iniciarTransicao(() => void iniciar(id))}
      className="flex items-center gap-2 min-h-[38px] px-3.5 rounded-[9px] border border-[#3b4552] bg-elevado text-[12.5px] font-medium hover:bg-linha disabled:opacity-50 transition shrink-0"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden>
        <path d="M3.4 2.4l6 3.6-6 3.6z" />
      </svg>
      {pend ? "..." : "Iniciar"}
    </button>
  );
}

export function BotoesEmCurso({ id }: { id: string }) {
  const [pend, iniciarTransicao] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        type="button"
        disabled={pend}
        onClick={() => iniciarTransicao(() => void pausar())}
        className="flex items-center gap-2 min-h-[42px] px-3.5 rounded-[9px] border border-[#3b4552] bg-elevado text-[12.5px] font-medium hover:bg-linha disabled:opacity-50 transition"
      >
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <path d="M4.6 3v7M8.4 3v7" />
        </svg>
        Pausar
      </button>
      <button
        type="button"
        disabled={pend}
        onClick={() => iniciarTransicao(() => void entregar(id))}
        className="flex items-center gap-2 min-h-[42px] px-3.5 rounded-[9px] bg-verde text-[#07120d] text-[12.5px] font-semibold hover:brightness-110 disabled:opacity-50 transition"
      >
        <svg width="12" height="12" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M2.6 6.8l2.6 2.6 5.2-5.6" />
        </svg>
        Entregar
      </button>
    </div>
  );
}

export function TempoParado({ minutos, estimativa }: { minutos: number; estimativa: number }) {
  return (
    <span className="num text-[12.5px] text-tinta-4 shrink-0">
      {hhmm(minutos)} / {hhmm(estimativa)}
    </span>
  );
}
