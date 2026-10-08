"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * O notch do Sr. Minutos (docs/06, 02/10; listas e Entregar em 06/10): meia cabeça na borda
 * da tela, os dois olhos de fora e o corte no nariz. Os ponteiros são o bigode: um parado à
 * esquerda, o outro varre o arco junto com o aro (tempo medido ÷ previsto da tarefa principal).
 * Verde rodando, âmbar pausado, rosa fora do prazo, creme sem tarefa. Mais de um cronômetro
 * ligado: um número no canto da cabeça.
 * Passar o mouse: cada tarefa correndo com relógio, Pausar e Entregar; as pausadas de hoje
 * com Retomar. Clicar: painel com Começar outra, Atrasadas, Começar do zero e Ajustes (⚙).
 * Desde 06/10 só roda dentro do app nativo (rota /notch-app); no site saiu. A janela nativa
 * já está grudada na borda do monitor, então o notch fica rente ao canto da própria janela,
 * com uma margem transparente (MARGEM) pra sombra do card não ser cortada reta pela janela.
 * O corpo usa os tokens --notch-* (globals.css), iguais nos dois temas: é peça de "hardware".
 */

export type TarefaNotch = {
  id: string;
  titulo: string;
  sub: string;
  competicao?: string | null;
  confronto?: string | null;
  prazoEm: string;
  estimativaMin: number;
  segundos: number;
  correndoDesde: string | null;
};
export type ProximaNotch = { id: string; titulo: string; sub: string; competicao?: string | null; confronto?: string | null; prazoEm: string };

export type Canto = "baixo-dir" | "baixo-esq" | "dir-alto" | "esq-alto";
export type Ajustes = { canto: Canto; recuoX: number; recuoY: number };
export const AJUSTES_PADRAO: Ajustes = { canto: "baixo-dir", recuoX: 96, recuoY: 96 };
/** Margem transparente entre o conteúdo e a borda da janela nativa (px de CSS). */
export const MARGEM = 24;
const CHAVE = "opec-notch-ajustes";
const CHAVE_ANTIGA = "opec-notch-canto";
const CANTOS: { v: Canto; r: string }[] = [
  { v: "baixo-dir", r: "Embaixo, direita" }, { v: "baixo-esq", r: "Embaixo, esquerda" },
  { v: "dir-alto", r: "Lateral direita" }, { v: "esq-alto", r: "Lateral esquerda" },
];

export function lerAjustes(): Ajustes {
  try {
    const g = localStorage.getItem(CHAVE);
    if (g) {
      const a = JSON.parse(g) as Partial<Ajustes>;
      if (a.canto && CANTOS.some((x) => x.v === a.canto)) {
        return { canto: a.canto, recuoX: num(a.recuoX, 96), recuoY: num(a.recuoY, 96) };
      }
    }
    const antigo = localStorage.getItem(CHAVE_ANTIGA) as Canto | null;
    if (antigo && CANTOS.some((x) => x.v === antigo)) return { ...AJUSTES_PADRAO, canto: antigo };
  } catch {}
  return AJUSTES_PADRAO;
}
const num = (v: unknown, padrao: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(400, Math.max(0, v)) : padrao);

function hms(s: number) {
  const t = Math.max(0, Math.floor(s));
  return [Math.floor(t / 3600), Math.floor((t % 3600) / 60), t % 60].map((n) => String(n).padStart(2, "0")).join(":");
}

const BOTAO = "min-h-[32px] px-2.5 rounded-[9px] border border-[var(--notch-linha)] bg-[var(--notch-botao)] text-[12px] font-medium hover:bg-[var(--notch-linha)] disabled:opacity-50";
const BOTAO_VERDE = "min-h-[32px] px-3 rounded-[9px] bg-[var(--notch-verde)] text-[var(--notch-ink)] text-[12px] font-bold hover:brightness-110 disabled:opacity-50";
const ROTULINHO = "text-[10.5px] uppercase tracking-[0.08em] text-[var(--notch-tinta-3)]";

export function Notch({
  correndo, pausadas, proximas = [], atrasadas = [],
  pausar, retomar, entregar, abrirSemana, aoMudarAjustes, aoAbrirFechar, rodapePainel, aviso,
}: {
  correndo: TarefaNotch[];
  pausadas: TarefaNotch[];
  proximas?: ProximaNotch[];
  atrasadas?: ProximaNotch[];
  pausar: (id: string) => Promise<void>;
  retomar: (id: string) => Promise<void>;
  entregar: (id: string) => Promise<void>;
  abrirSemana: () => void;
  aoMudarAjustes?: (a: Ajustes) => void;
  aoAbrirFechar?: (aberto: boolean) => void;
  rodapePainel?: ReactNode;
  /** Mensagem curta no card (erro, "atualize o app", "Valeu cara"). */
  aviso?: ReactNode;
}) {
  const [agora, setAgora] = useState(() => Date.now());
  const [aberto, setAberto] = useState(false);
  const [tela, setTela] = useState<"painel" | "ajustes">("painel");
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_PADRAO);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const raiz = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const a = lerAjustes();
    setAjustes(a);
    aoMudarAjustes?.(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só na montagem
  }, []);
  useEffect(() => { aoAbrirFechar?.(aberto); if (!aberto) setTela("painel"); }, [aberto, aoAbrirFechar]);
  useEffect(() => {
    if (correndo.length === 0) return;
    const t = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [correndo.length]);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (!raiz.current?.contains(e.target as Node)) setAberto(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("click", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("click", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);
  // "Confirmar entrega?" vale por 4 s; depois o botão volta ao normal.
  useEffect(() => {
    if (!confirmando) return;
    const t = setTimeout(() => setConfirmando(null), 4000);
    return () => clearTimeout(t);
  }, [confirmando]);

  function mudarAjustes(parcial: Partial<Ajustes>) {
    const a = { ...ajustes, ...parcial };
    setAjustes(a);
    try { localStorage.setItem(CHAVE, JSON.stringify(a)); } catch {}
    aoMudarAjustes?.(a);
  }

  const segundosDe = (t: TarefaNotch) =>
    t.segundos + (t.correndoDesde ? (agora - new Date(t.correndoDesde).getTime()) / 1000 : 0);

  const principal = correndo[0] ?? pausadas[0] ?? null;
  const seg = principal ? segundosDe(principal) : 0;
  const previsto = principal ? principal.estimativaMin * 60 : 1;
  const frac = principal ? Math.min(1, seg / previsto) : 0;
  const algumaVencida = correndo.some((t) => new Date(t.prazoEm).getTime() < agora)
    || (correndo.length === 0 && !!principal && new Date(principal.prazoEm).getTime() < agora);
  const estado = !principal ? "vazio" : algumaVencida ? "vencido" : correndo.length > 0 ? "rodando" : "pausado";
  const cor = { rodando: "var(--verde)", pausado: "var(--ambar)", vencido: "var(--rosa)", vazio: "var(--notch-mostrador)" }[estado];
  const rotulo = {
    rodando: correndo.length > 1 ? `Em andamento · ${correndo.length}` : "Em andamento",
    pausado: "Pausada", vencido: "Prazo venceu", vazio: "Nada rodando",
  }[estado];
  const gb = estado === "vencido" ? 196 : frac * 180;
  const ga = estado === "vencido" ? -16 : 0;
  const { canto } = ajustes;
  const lateral = canto === "dir-alto" || canto === "esq-alto";

  // Rente à borda do monitor (que é a borda da janela), com MARGEM no outro eixo pra sombra.
  const posicao = {
    "baixo-dir": "bottom-0 right-[24px]", "baixo-esq": "bottom-0 left-[24px]",
    "dir-alto": "right-0 top-[24px]", "esq-alto": "left-0 top-[24px]",
  }[canto];
  const giroCabeca = canto === "dir-alto" ? "rotate(-90deg)" : canto === "esq-alto" ? "rotate(90deg)" : undefined;
  const caixa = {
    "baixo-dir": "bottom-[62px] right-0 origin-bottom-right", "baixo-esq": "bottom-[62px] left-0 origin-bottom-left",
    "dir-alto": "top-0 right-[62px] origin-top-right", "esq-alto": "top-0 left-[62px] origin-top-left",
  }[canto];

  async function clicarEntregar(id: string) {
    if (confirmando !== id) { setConfirmando(id); return; }
    setConfirmando(null);
    await entregar(id);
  }

  const linhaTarefa = (t: TarefaNotch, rodando: boolean) => {
    const s = segundosDe(t);
    const p = t.estimativaMin * 60;
    const vencida = new Date(t.prazoEm).getTime() < agora;
    const corLinha = vencida ? "var(--rosa)" : rodando ? "var(--verde)" : "var(--ambar)";
    return (
      <div key={t.id} className="flex flex-col gap-1 rounded-[12px] border border-[var(--notch-linha-2)] bg-[var(--notch-botao)]/40 px-3 py-2">
        <b className="text-[13px] font-semibold leading-tight truncate" title={t.titulo}>{t.titulo}</b>
        <span className="text-[11px] text-[var(--notch-tinta-3)] truncate">{t.sub}{vencida ? " · prazo venceu" : ""}</span>
        <div className="flex items-baseline gap-2">
          <span className="num text-[22px] font-semibold tracking-[-0.02em]" style={{ color: corLinha }}>{hms(s)}</span>
          <span className="num text-[10.5px] text-[var(--notch-tinta-3)]">de {hms(p)}</span>
        </div>
        <span className="block h-[4px] rounded-full bg-[var(--notch-trilho)] overflow-hidden">
          <i className="block h-full transition-[width] duration-500" style={{ width: `${(Math.min(1, s / p) * 100).toFixed(1)}%`, background: corLinha }} />
        </span>
        <div className="flex gap-1.5 mt-1">
          {rodando
            ? <button type="button" onClick={() => pausar(t.id)} className={`${BOTAO} flex-1`}>Pausar</button>
            : <button type="button" onClick={() => retomar(t.id)} className={`${BOTAO} flex-1`}>Retomar</button>}
          <button type="button" onClick={() => clicarEntregar(t.id)}
            className={`${BOTAO_VERDE} flex-1 ${confirmando === t.id ? "ring-2 ring-[var(--notch-mostrador)]" : ""}`}>
            {confirmando === t.id ? "Confirmar entrega?" : "Entregar"}
          </button>
        </div>
      </div>
    );
  };

  const linhaProxima = (p: ProximaNotch) => (
    <div key={p.id} className="flex items-center gap-2 rounded-[10px] border border-[var(--notch-linha-2)] bg-[var(--notch-botao)] px-2.5 py-2">
      <div className="flex-1 min-w-0 flex flex-col">
        <b className="text-[12px] font-semibold truncate">{p.titulo}</b>
        <span className="text-[10.5px] text-[var(--notch-tinta-3)] truncate">{p.sub}</span>
      </div>
      <button type="button" onClick={() => retomar(p.id)}
        className="shrink-0 min-h-[28px] px-2.5 rounded-[8px] border border-[var(--notch-linha)] text-[11px] hover:bg-[var(--notch-linha)]">Iniciar</button>
    </div>
  );

  return (
    <div ref={raiz} className={`group fixed z-40 ${posicao}`} style={{ ["--nt" as string]: cor }}>
      <button type="button" onClick={() => setAberto((a) => !a)}
        aria-label={`Sr. Minutos: ${rotulo}${principal ? `, ${hms(seg)} de ${hms(previsto)}` : ""}. Abrir resumo`}
        aria-expanded={aberto}
        className={`relative block ${lateral ? "w-[53px] h-[98px]" : "w-[98px] h-[53px]"}`}>
        {/* Sem drop-shadow: a janela nativa tinha o tamanho exato do desenho e a sombra era
            cortada reta pela borda, virando um "quadrado meio escuro" em volta. */}
        <svg viewBox="0 0 140 76" width="98" height="53" aria-hidden
          className={`absolute transition-transform duration-200 ${lateral ? "left-[-22.5px] top-[22.5px]" : "left-0 top-0 group-hover:-translate-y-[2px]"}`}
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
          {correndo.length > 1 && (
            <g>
              <circle cx="122" cy="20" r="13" fill="var(--nt)" />
              <text x="122" y="25" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--notch-ink)">{correndo.length}</text>
            </g>
          )}
        </svg>
      </button>

      {/* resumo no hover; painel no clique. Mesma caixa, conteúdo a mais quando aberto. */}
      <div role="dialog" aria-label="Sr. Minutos"
        className={`absolute ${caixa} w-[300px] max-h-[calc(100vh-70px)] overflow-y-auto rounded-[18px] bg-[var(--notch-preto)] text-[var(--notch-mostrador)] p-4 text-[12.5px] shadow-[0_18px_44px_rgb(0_0_0/0.45)] transition duration-150 ${
          aberto ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:scale-100 group-focus-within:pointer-events-auto"}`}>
        {tela === "ajustes" ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--nt)" }}>Ajustes</span>
              <button type="button" onClick={() => setTela("painel")} className="text-[12px] text-[var(--notch-verde)] font-semibold">Voltar</button>
            </div>
            <span className={ROTULINHO}>Onde ele fica</span>
            <div className="grid grid-cols-2 gap-1.5">
              {CANTOS.map((c) => (
                <button key={c.v} type="button" onClick={() => mudarAjustes({ canto: c.v })} aria-pressed={canto === c.v}
                  className={`min-h-[30px] rounded-[8px] border text-[11px] ${canto === c.v ? "border-[var(--notch-verde)] text-[var(--notch-verde)]" : "border-[var(--notch-linha)] text-[var(--notch-tinta-2)]"}`}>
                  {c.r}
                </button>
              ))}
            </div>
            <label className="flex flex-col gap-1">
              <span className={ROTULINHO}>{lateral ? "Distância do topo" : "Distância da lateral"} · <span className="num">{lateral ? ajustes.recuoY : ajustes.recuoX} px</span></span>
              <input type="range" min={0} max={400} step={8}
                value={lateral ? ajustes.recuoY : ajustes.recuoX}
                onChange={(e) => mudarAjustes(lateral ? { recuoY: Number(e.target.value) } : { recuoX: Number(e.target.value) })}
                className="accent-[var(--notch-verde)]" />
            </label>
            <p className="text-[11px] text-[var(--notch-tinta-3)] leading-snug">
              Ele fica sempre rente à borda da tela; isto afasta ao longo dela. Nas laterais a cabeça vira de lado.
            </p>
            <button type="button" onClick={() => mudarAjustes(AJUSTES_PADRAO)} className={BOTAO}>Voltar ao padrão</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="block text-[10px] font-bold uppercase tracking-[0.1em]" style={{ color: "var(--nt)" }}>{rotulo}</span>
              {aberto && (
                <button type="button" onClick={() => setTela("ajustes")} aria-label="Ajustes do notch" title="Ajustes"
                  className="w-[26px] h-[26px] grid place-items-center rounded-[8px] border border-[var(--notch-linha)] text-[14px] text-[var(--notch-tinta-2)] hover:bg-[var(--notch-linha)]">⚙</button>
              )}
            </div>
            {aviso && <div className="mt-1.5 text-[11.5px] leading-snug">{aviso}</div>}
            {correndo.length + pausadas.length > 0 ? (
              <div className="flex flex-col gap-2 mt-2">
                {correndo.map((t) => linhaTarefa(t, true))}
                {pausadas.length > 0 && (
                  <>
                    <span className={`${ROTULINHO} mt-1`}>Pausadas</span>
                    {pausadas.map((t) => linhaTarefa(t, false))}
                  </>
                )}
              </div>
            ) : (
              <p className="mt-1 text-[12.5px] text-[var(--notch-tinta-2)]">
                Nenhum cronômetro ligado. {proximas.length > 0 ? "Clique na cabeça pra escolher a próxima." : "Nada aberto na sua semana."}
              </p>
            )}
            {aberto && (
              <div className="mt-3 pt-3 border-t border-[var(--notch-linha-2)] flex flex-col gap-2">
                {proximas.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className={ROTULINHO}>Começar outra</span>
                    <div className="flex flex-col gap-1.5 max-h-[168px] overflow-y-auto pr-0.5">
                      {proximas.map(linhaProxima)}
                    </div>
                  </div>
                )}
                {atrasadas.length > 0 && (
                  <details className="flex flex-col gap-1.5">
                    <summary className={`${ROTULINHO} cursor-pointer select-none`}>Atrasadas de outras semanas · {atrasadas.length}</summary>
                    <div className="flex flex-col gap-1.5 mt-1.5 max-h-[140px] overflow-y-auto pr-0.5">
                      {atrasadas.map(linhaProxima)}
                    </div>
                  </details>
                )}
                {rodapePainel}
                <button type="button" onClick={abrirSemana} className="text-left text-[var(--notch-verde)] text-[12px] font-semibold">Abrir Minha semana</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
