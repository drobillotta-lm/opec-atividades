"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/**
 * O notch do Sr. Minutos (docs/06, 02/10): meia cabeça na borda da tela, os dois olhos de
 * fora e o corte no nariz. Os ponteiros são o bigode: um parado à esquerda, o outro varre o
 * arco junto com o aro (tempo medido ÷ previsto). Bigode reto = previsto atingido.
 * Verde rodando, âmbar pausado, rosa fora do prazo, creme sem tarefa.
 * Passar o mouse: resumo + Pausar/Retomar. Clicar: painel com o resto.
 * O corpo usa os tokens --notch-* (globals.css), iguais nos dois temas: é peça de "hardware".
 */

export type TarefaNotch = {
  id: string;
  titulo: string;
  sub: string;
  prazoEm: string;
  estimativaMin: number;
  segundos: number;
  correndoDesde: string | null;
};

type Canto = "baixo-dir" | "baixo-esq" | "dir-alto" | "esq-alto";
const CHAVE = "opec-notch-canto";
const CANTOS: { v: Canto; r: string }[] = [
  { v: "baixo-dir", r: "Embaixo, direita" }, { v: "baixo-esq", r: "Embaixo, esquerda" },
  { v: "dir-alto", r: "Lateral direita" }, { v: "esq-alto", r: "Lateral esquerda" },
];

function hms(s: number) {
  const t = Math.max(0, Math.floor(s));
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, "0")).join(":");
}

const BOTAO = "w-full min-h-[34px] rounded-[9px] border border-[var(--notch-linha)] bg-[var(--notch-botao)] text-[12px] font-medium hover:bg-[var(--notch-linha)]";

export function Notch({ tarefa, pausar, retomar }: {
  tarefa: TarefaNotch | null;
  pausar: () => Promise<void>;
  retomar: (() => Promise<void>) | null;
}) {
  const [agora, setAgora] = useState(() => Date.now());
  const [aberto, setAberto] = useState(false);
  const [canto, setCanto] = useState<Canto>("baixo-dir");
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { const c = localStorage.getItem(CHAVE) as Canto | null; if (c && CANTOS.some((x) => x.v === c)) setCanto(c); } catch {}
  }, []);
  useEffect(() => {
    if (!tarefa?.correndoDesde) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [tarefa?.correndoDesde]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("click", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  function escolher(c: Canto) {
    setCanto(c);
    try { localStorage.setItem(CHAVE, c); } catch {}
  }

  const seg = tarefa ? tarefa.segundos + (tarefa.correndoDesde ? (agora - new Date(tarefa.correndoDesde).getTime()) / 1000 : 0) : 0;
  const previsto = tarefa ? tarefa.estimativaMin * 60 : 1;
  const frac = tarefa ? Math.min(1, seg / previsto) : 0;
  const vencido = !!tarefa && new Date(tarefa.prazoEm).getTime() < agora;
  const estado = !tarefa ? "vazio" : vencido ? "vencido" : tarefa.correndoDesde ? "rodando" : "pausado";
  const cor = { rodando: "var(--verde)", pausado: "var(--ambar)", vencido: "var(--rosa)", vazio: "var(--notch-mostrador)" }[estado];
  const rotulo = { rodando: "Em andamento", pausado: "Pausada", vencido: "Prazo venceu", vazio: "Nada rodando" }[estado];
  const gb = estado === "vencido" ? 196 : frac * 180;
  const ga = estado === "vencido" ? -16 : 0;
  const lateral = canto === "dir-alto" || canto === "esq-alto";

  const posicao = {
    "baixo-dir": "bottom-0 right-24", "baixo-esq": "bottom-0 left-[260px]",
    "dir-alto": "right-0 top-24", "esq-alto": "left-0 top-24",
  }[canto];
  const giroCabeca = canto === "dir-alto" ? "rotate(-90deg)" : canto === "esq-alto" ? "rotate(90deg)" : undefined;
  const caixa = {
    "baixo-dir": "bottom-[86px] right-0 origin-bottom-right", "baixo-esq": "bottom-[86px] left-0 origin-bottom-left",
    "dir-alto": "top-0 right-[86px] origin-top-right", "esq-alto": "top-0 left-[86px] origin-top-left",
  }[canto];

  return (
    <div ref={raiz} className={`group fixed z-40 ${posicao}`} style={{ ["--nt" as string]: cor }}>
      <button type="button" onClick={() => setAberto((a) => !a)}
        aria-label={`Sr. Minutos: ${rotulo}${tarefa ? `, ${hms(seg)} de ${hms(previsto)}` : ""}. Abrir resumo`}
        aria-expanded={aberto}
        className={`relative block ${lateral ? "w-[76px] h-[140px]" : "w-[140px] h-[76px]"}`}>
        <svg viewBox="0 0 140 76" width="140" height="76" aria-hidden
          className={`absolute drop-shadow-[0_-4px_14px_rgb(0_0_0/0.35)] transition-transform duration-200 ${lateral ? "left-[-32px] top-[32px]" : "left-0 top-0 group-hover:-translate-y-[3px]"}`}
          style={giroCabeca ? { transform: giroCabeca } : undefined}>
          <circle cx="70" cy="70" r="66" fill="var(--notch-preto)" />
          <path d="M14,70 A56,56 0 0 1 126,70" fill="none" stroke="var(--notch-trilho)" strokeWidth="9" strokeLinecap="round" pathLength={100} />
          <path d="M14,70 A56,56 0 0 1 126,70" fill="none" stroke="var(--nt)" strokeWidth="9" strokeLinecap="round" pathLength={100}
            strokeDasharray={`${(estado === "vencido" ? 100 : frac * 100).toFixed(1)} 100`} className="transition-[stroke-dasharray] duration-500" />
          <circle cx="70" cy="70" r="46" fill="var(--notch-mostrador)" />
          <g fill="var(--notch-tinta)">
            <rect x="68.5" y="27" width="3" height="9" rx="1.5" />
            <rect x="68.5" y="27" width="3" height="7" rx="1.5" transform="rotate(-45 70 70)" />
            <rect x="68.5" y="27" width="3" height="7" rx="1.5" transform="rotate(45 70 70)" />
            <rect x="68.5" y="27" width="3" height="9" rx="1.5" transform="rotate(-90 70 70)" />
            <rect x="68.5" y="27" width="3" height="9" rx="1.5" transform="rotate(90 70 70)" />
          </g>
          <line x1="70" y1="70" x2="44" y2="70" stroke="var(--notch-tinta)" strokeWidth="5.5" strokeLinecap="round"
            style={{ transformOrigin: "70px 70px", transform: `rotate(${ga}deg)`, transition: "transform .6s" }} />
          <line x1="70" y1="70" x2="38" y2="70" stroke="var(--nt)" strokeWidth="4" strokeLinecap="round"
            style={{ transformOrigin: "70px 70px", transform: `rotate(${gb}deg)`, transition: "transform .6s" }} />
          {[54, 86].map((x) => (
            <g key={x}>
              <ellipse cx={x} cy="47" rx="8" ry="10.5" fill="var(--notch-branco)" stroke="var(--notch-tinta)" strokeWidth="2" />
              <ellipse cx={x + 1.5 - (estado === "pausado" ? 1.5 : 0)} cy={49.5 + (estado === "vencido" ? 2.5 : 0)} rx="4.4" ry="6.2" fill="var(--notch-tinta)" />
              <circle cx={x + 3} cy="46.5" r="1.7" fill="var(--notch-branco)" />
            </g>
          ))}
          <circle cx="70" cy="70" r="5" fill="var(--nt)" />
        </svg>
      </button>

      {/* resumo no hover; painel no clique. Mesma caixa, conteúdo a mais quando aberto. */}
      <div role="dialog" aria-label="Sr. Minutos"
        className={`absolute ${caixa} w-[280px] rounded-[18px] bg-[var(--notch-preto)] text-[var(--notch-mostrador)] p-4 text-[12.5px] shadow-[0_18px_44px_rgb(0_0_0/0.45)] transition duration-150 ${
          aberto ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:pointer-events-auto"}`}>
        <span className="block text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--nt)" }}>{rotulo}</span>
        {tarefa ? (
          <div className="flex flex-col gap-1.5 mt-1">
            <b className="text-[14px] font-semibold leading-tight">{tarefa.titulo}</b>
            <span className="text-[11.5px] text-[var(--notch-tinta-3)]">{tarefa.sub}</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="num text-[28px] font-semibold tracking-[-0.02em]">{hms(seg)}</span>
              <span className="num text-[11px] text-[var(--notch-tinta-3)]">de {hms(previsto)}</span>
            </div>
            <span className="block h-[5px] rounded-full bg-[var(--notch-trilho)] overflow-hidden">
              <i className="block h-full transition-[width] duration-500" style={{ width: `${(frac * 100).toFixed(1)}%`, background: "var(--nt)" }} />
            </span>
            <div className="flex gap-1.5 mt-1.5">
              {tarefa.correndoDesde ? (
                <form action={pausar} className="flex-1"><button type="submit" className={BOTAO}>Pausar</button></form>
              ) : retomar ? (
                <form action={retomar} className="flex-1"><button type="submit" className={BOTAO}>{estado === "vencido" ? "Iniciar" : "Retomar"}</button></form>
              ) : null}
              <Link href="/semana" className="flex-1 grid place-items-center min-h-[34px] rounded-[9px] bg-[var(--notch-verde)] text-[var(--notch-ink)] text-[12px] font-bold">Entregar</Link>
            </div>
          </div>
        ) : (
          <p className="mt-1 text-[12.5px] text-[var(--notch-tinta-2)]">Nenhum cronômetro ligado. Escolha a próxima tarefa em Minha semana.</p>
        )}
        {aberto && (
          <div className="mt-3 pt-3 border-t border-[var(--notch-linha-2)] flex flex-col gap-2">
            <Link href="/semana" className="text-[var(--notch-verde)] text-[12px] font-semibold">Abrir Minha semana</Link>
            <span className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--notch-tinta-3)]">Onde ele fica</span>
            <div className="grid grid-cols-2 gap-1.5">
              {CANTOS.map((c) => (
                <button key={c.v} type="button" onClick={() => escolher(c.v)} aria-pressed={canto === c.v}
                  className={`min-h-[30px] rounded-[8px] border text-[11px] ${canto === c.v ? "border-[var(--notch-verde)] text-[var(--notch-verde)]" : "border-[var(--notch-linha)] text-[var(--notch-tinta-2)]"}`}>
                  {c.r}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
