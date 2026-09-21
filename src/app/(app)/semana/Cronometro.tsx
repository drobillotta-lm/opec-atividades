"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { relogio, hhmm } from "@/lib/semana";

export function Relogio({ desde, baseMin }: { desde: string; baseMin: number }) {
  const [seg, setSeg] = useState(() => calc(desde, baseMin));
  useEffect(() => {
    setSeg(calc(desde, baseMin));
    const t = setInterval(() => setSeg(calc(desde, baseMin)), 1000);
    return () => clearInterval(t);
  }, [desde, baseMin]);
  return <span className="num text-[29px] font-medium tracking-[-0.02em]">{relogio(seg)}</span>;
}

function calc(desde: string, baseMin: number) {
  return baseMin * 60 + (Date.now() - new Date(desde).getTime()) / 1000;
}

/** Botao de submit que sabe que o formulario esta em voo. */
export function Submit({
  children,
  ocupado,
  className,
}: {
  children: React.ReactNode;
  ocupado: string;
  className: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-50`}>
      {pending ? ocupado : children}
    </button>
  );
}

export function TempoParado({ minutos, estimativa }: { minutos: number; estimativa: number }) {
  return (
    <span className="num text-[12.5px] text-tinta-4 shrink-0">
      {hhmm(minutos)} / {hhmm(estimativa)}
    </span>
  );
}
