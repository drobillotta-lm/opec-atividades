"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Notch, AJUSTES_PADRAO, MARGEM, type Ajustes, type ProximaNotch, type TarefaNotch } from "@/componentes/Notch";
import { Rosto } from "@/componentes/SrMinutos";

/**
 * O notch dentro do app nativo (Tauri, contrato com a janela APP em 02/10; listas em 06/10).
 * A página nunca vê o token de pareamento: tudo passa por window.__TAURI__.core.invoke.
 * Recolhido 98×53 (53×98 nas laterais) mais a MARGEM transparente; no hover ou aberto, pede
 * uma janela maior. Cliques são otimistas: a tela muda na hora e depois troca pelo estado
 * que o app devolve; se der erro, volta ao estado de antes.
 * Vários cronômetros por pessoa (044): `correndo` é lista, e iniciar não pausa as outras.
 */

type Frente = { sigla: string; nome: string };
type Estado = {
  pareado: boolean;
  pessoa: { nome: string } | null;
  correndo: TarefaNotch[];
  pausadas: TarefaNotch[];
  proximas: ProximaNotch[];
  atrasadas: ProximaNotch[];
  frentes?: Frente[];
};

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
declare global {
  interface Window { __TAURI__?: { core: { invoke: Invoke } } }
}
const invoke: Invoke = (cmd, args) => window.__TAURI__!.core.invoke(cmd, args);

/** As ações devolvem o estado inteiro; aceita também { estado } por garantia. Normaliza as
 * listas (um app 0.2.0 ainda devolve só `tarefa`). */
const comoEstado = (r: unknown): Estado | null => {
  let e: Record<string, unknown> | null = null;
  if (r && typeof r === "object") {
    if ("pareado" in r) e = r as Record<string, unknown>;
    else if ("estado" in r) e = (r as { estado: Record<string, unknown> }).estado;
  }
  if (!e) return null;
  const lista = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
  const tarefa = e.tarefa as TarefaNotch | null | undefined;
  const correndo = "correndo" in e ? lista<TarefaNotch>(e.correndo) : tarefa?.correndoDesde ? [tarefa] : [];
  const pausadas = "pausadas" in e ? lista<TarefaNotch>(e.pausadas) : tarefa && !tarefa.correndoDesde ? [tarefa] : [];
  return {
    pareado: !!e.pareado,
    pessoa: (e.pessoa as Estado["pessoa"]) ?? null,
    correndo, pausadas,
    proximas: lista<ProximaNotch>(e.proximas),
    atrasadas: lista<ProximaNotch>(e.atrasadas),
    frentes: lista<Frente>(e.frentes),
  };
};

const fimDoDia = () => { const d = new Date(); d.setHours(23, 59, 0, 0); return d.toISOString(); };
const congelar = (t: TarefaNotch): TarefaNotch => ({
  ...t,
  segundos: t.segundos + (t.correndoDesde ? (Date.now() - new Date(t.correndoDesde).getTime()) / 1000 : 0),
  correndoDesde: null,
});
const semId = <T extends { id: string }>(lista: T[], id: string) => lista.filter((x) => x.id !== id);

export function NotchApp() {
  const [tauri, setTauri] = useState<boolean | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const estadoRef = useRef<Estado | null>(null);
  const [ajustes, setAjustes] = useState<Ajustes>(AJUSTES_PADRAO);
  const [hover, setHover] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState("");
  const [novaFrente, setNovaFrente] = useState("");
  const [falha, setFalha] = useState<string | null>(null);
  const [valeu, setValeu] = useState<{ atrasada: boolean } | null>(null);

  const mudar = useCallback((e: Estado | null) => { estadoRef.current = e; setEstado(e); }, []);

  useEffect(() => { setTauri(!!window.__TAURI__); }, []);

  const carregar = useCallback(async () => {
    try { mudar(comoEstado(await invoke<unknown>("estado"))); } catch { /* o relógio local segue; tenta de novo em 15 s */ }
  }, [mudar]);

  useEffect(() => {
    if (!tauri) return;
    carregar();
    const t = setInterval(carregar, 15000);
    return () => clearInterval(t);
  }, [tauri, carregar]);

  // Hover na página inteira = mouse em cima da janela nativa.
  useEffect(() => {
    const raiz = document.documentElement;
    const entra = () => setHover(true);
    const sai = () => setHover(false);
    raiz.addEventListener("mouseenter", entra);
    raiz.addEventListener("mouseleave", sai);
    return () => { raiz.removeEventListener("mouseenter", entra); raiz.removeEventListener("mouseleave", sai); };
  }, []);

  useEffect(() => {
    if (!valeu) return;
    const t = setTimeout(() => setValeu(null), 2500);
    return () => clearTimeout(t);
  }, [valeu]);

  const lateral = ajustes.canto === "dir-alto" || ajustes.canto === "esq-alto";
  const pareado = estado?.pareado ?? true;
  const nCorrendo = estado?.correndo.length ?? 0;
  const nPausadas = estado?.pausadas.length ?? 0;
  useEffect(() => {
    if (!tauri) return;
    const grande = !pareado || hover || aberto;
    const alturaHover = Math.min(460, 180 + 128 * Math.max(1, nCorrendo) + 104 * nPausadas);
    const [largura, altura] = !pareado ? [300 + 2 * MARGEM, 230 + MARGEM]
      : grande ? [300 + 2 * MARGEM, (aberto ? 620 : alturaHover) + MARGEM]
      : lateral ? [53 + MARGEM, 98 + 2 * MARGEM] : [98 + 2 * MARGEM, 53 + MARGEM];
    invoke("tamanho", { largura, altura, canto: ajustes.canto, recuoX: ajustes.recuoX, recuoY: ajustes.recuoY }).catch(() => {});
  }, [tauri, pareado, hover, aberto, ajustes, lateral, nCorrendo, nPausadas]);

  /** Mostra `previa` na hora, chama o app e fica com o que ele devolver; erro desfaz. */
  const agir = useCallback(async (previa: Estado | null, cmd: string, args?: Record<string, unknown>) => {
    const antes = estadoRef.current;
    if (previa) mudar(previa);
    setFalha(null);
    try {
      const r = comoEstado(await invoke<unknown>(cmd, args));
      if (r) mudar(r); else await carregar();
      return true;
    } catch (e) {
      mudar(antes);
      setFalha(e instanceof Error ? e.message : typeof e === "string" ? e : "Não deu certo. Tente de novo.");
      return false;
    }
  }, [mudar, carregar]);

  const pausar = useCallback(async (tarefaId: string) => {
    const e = estadoRef.current;
    const t = e?.correndo.find((x) => x.id === tarefaId);
    const previa = e && t ? { ...e, correndo: semId(e.correndo, tarefaId), pausadas: [congelar(t), ...semId(e.pausadas, tarefaId)] } : null;
    await agir(previa, "pausar", { tarefaId });
  }, [agir]);

  const iniciarTarefa = useCallback(async (tarefaId: string) => {
    const e = estadoRef.current;
    let previa: Estado | null = null;
    if (e && !e.correndo.some((x) => x.id === tarefaId)) {
      const agora = new Date().toISOString();
      const pausada = e.pausadas.find((x) => x.id === tarefaId);
      const prox = e.proximas.find((x) => x.id === tarefaId) ?? e.atrasadas.find((x) => x.id === tarefaId);
      // Estimativa real chega no retorno; até lá o aro usa 1h.
      const nova: TarefaNotch | null = pausada ? { ...pausada, correndoDesde: agora }
        : prox ? { id: prox.id, titulo: prox.titulo, sub: prox.sub, prazoEm: prox.prazoEm, estimativaMin: 60, segundos: 0, correndoDesde: agora }
        : null;
      if (nova) previa = {
        ...e, correndo: [nova, ...e.correndo], pausadas: semId(e.pausadas, tarefaId),
        proximas: semId(e.proximas, tarefaId), atrasadas: semId(e.atrasadas, tarefaId),
      };
    }
    await agir(previa, "iniciar", { tarefaId });
  }, [agir]);

  const entregar = useCallback(async (tarefaId: string) => {
    const e = estadoRef.current;
    const t = e?.correndo.find((x) => x.id === tarefaId) ?? e?.pausadas.find((x) => x.id === tarefaId);
    const previa = e ? { ...e, correndo: semId(e.correndo, tarefaId), pausadas: semId(e.pausadas, tarefaId) } : null;
    const antes = estadoRef.current;
    if (previa) mudar(previa);
    setFalha(null);
    try {
      const r = comoEstado(await invoke<unknown>("entregar", { tarefaId }));
      if (r) mudar(r); else await carregar();
      setValeu({ atrasada: !!t && new Date(t.prazoEm).getTime() < Date.now() });
    } catch (err) {
      mudar(antes);
      const msg = err instanceof Error ? err.message : String(err ?? "");
      // App 0.2.0 não tem o comando: o Tauri 2 responde "Command entregar not allowed by ACL"
      // (a permissão allow-entregar só existe no 0.3.0). Entrega pelo site, como antes.
      if (/not allowed by ACL|not found|unknown command|não encontrado/i.test(msg)) {
        invoke("abrir", { caminho: "/semana" }).catch(() => {});
        setFalha("Esta versão do app não entrega daqui. Abri Minha semana; atualize o app em Atividades › Notch.");
      } else {
        setFalha(msg || "Não deu certo. Tente de novo.");
      }
    }
  }, [mudar, carregar]);

  async function comecar(ev: React.FormEvent) {
    ev.preventDefault();
    const titulo = novoTitulo.trim().slice(0, 120);
    if (!titulo) return;
    const e = estadoRef.current;
    const frente = e?.frentes?.find((f) => f.sigla === novaFrente);
    const nova: TarefaNotch = { id: "novo", titulo: frente ? `${titulo} · ${frente.nome}` : titulo, sub: frente ? "" : "Começada do zero", prazoEm: fimDoDia(), estimativaMin: 60, segundos: 0, correndoDesde: new Date().toISOString() };
    const previa = e ? { ...e, correndo: [nova, ...e.correndo] } : null;
    setNovoTitulo("");
    await agir(previa, "comecar", { titulo, frente: novaFrente });
  }

  async function parear(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true); setErro(null);
    try {
      const r = await invoke<{ ok: boolean; nome?: string; erro?: string }>("parear", { codigo: codigo.trim().toUpperCase() });
      if (r.ok) { setCodigo(""); await carregar(); } else setErro(r.erro ?? "Código não aceito. Gere outro em Atividades › Notch.");
    } catch {
      setErro("Sem conexão com o app. Tente de novo.");
    } finally { setEnviando(false); }
  }

  if (tauri === null) return null;

  if (!tauri) {
    return (
      <main data-notch-janela className="min-h-screen grid place-items-center p-6">
        <div className="flex items-center gap-3 rounded-[14px] border border-linha bg-superficie px-4 py-3">
          <Rosto estado="creme" tamanho={28} />
          <span className="text-[13px] text-tinta-2">Abra pelo app Atividades OPEC.</span>
        </div>
      </main>
    );
  }

  if (!pareado) {
    return (
      <main data-notch-janela className="fixed inset-0 grid place-items-end p-6">
        <form onSubmit={parear}
          className="w-full rounded-[18px] bg-[var(--notch-preto)] text-[var(--notch-mostrador)] p-4 flex flex-col gap-2.5 shadow-[0_18px_44px_rgb(0_0_0/0.45)]">
          <div className="flex items-center gap-2.5">
            <Rosto estado="verde" tamanho={30} />
            <b className="font-display text-[20px] font-extrabold uppercase leading-none">Parear com o Sr. Minutos</b>
          </div>
          <label htmlFor="codigo" className="text-[11.5px] text-[var(--notch-tinta-3)]">
            Código de 8 letras, gerado em Atividades › Notch
          </label>
          <input id="codigo" value={codigo} onChange={(e) => setCodigo(e.target.value)} maxLength={8} autoFocus
            autoComplete="off" spellCheck={false} placeholder="ABCD1234"
            className="num min-h-[38px] rounded-[9px] border border-[var(--notch-linha)] bg-[var(--notch-botao)] px-3 text-[16px] tracking-[0.2em] uppercase outline-none focus:border-[var(--notch-verde)]" />
          {erro && <span role="alert" className="text-[11.5px] text-rosa">{erro}</span>}
          <button type="submit" disabled={enviando || codigo.trim().length < 8}
            className="min-h-[36px] rounded-[9px] bg-[var(--notch-verde)] text-[var(--notch-ink)] text-[12.5px] font-bold disabled:opacity-50">
            {enviando ? "Pareando..." : "Parear"}
          </button>
        </form>
      </main>
    );
  }

  const frentes = estado?.frentes ?? [];
  const campo = "min-h-[32px] rounded-[8px] border border-[var(--notch-linha)] bg-[var(--notch-botao)] px-2.5 text-[12px] outline-none focus:border-[var(--notch-verde)]";

  return (
    <div data-notch-janela className="contents">
      <Notch
        correndo={estado?.correndo ?? []}
        pausadas={estado?.pausadas ?? []}
        proximas={estado?.proximas ?? []}
        atrasadas={estado?.atrasadas ?? []}
        pausar={pausar}
        retomar={iniciarTarefa}
        entregar={entregar}
        abrirSemana={() => { invoke("abrir", { caminho: "/semana" }).catch(() => {}); }}
        aoMudarAjustes={setAjustes}
        aoAbrirFechar={setAberto}
        aviso={
          valeu ? (
            <span className="inline-flex items-center gap-2 rounded-[10px] bg-[var(--notch-verde)]/15 border border-[var(--notch-verde)] px-2.5 py-1.5">
              <Rosto estado="verde" tamanho={18} />
              <b className="font-display text-[15px] font-extrabold uppercase text-[var(--notch-verde)]">Valeu cara</b>
              <span className="text-[11px] text-[var(--notch-tinta-2)]">{valeu.atrasada ? "Fechou, mesmo atrasada." : "Entregue."}</span>
            </span>
          ) : falha ? <span role="alert" className="text-rosa">{falha}</span> : null
        }
        rodapePainel={
          <form onSubmit={comecar} className="flex flex-col gap-1.5">
            <label htmlFor="novo-titulo" className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--notch-tinta-3)]">
              Começar do zero
            </label>
            <input id="novo-titulo" value={novoTitulo} onChange={(e) => setNovoTitulo(e.target.value)} maxLength={120}
              placeholder="O que você vai fazer?" autoComplete="off" className={campo} />
            <div className="flex gap-1.5">
              <select id="nova-frente" value={novaFrente} onChange={(e) => setNovaFrente(e.target.value)} aria-label="Frente"
                className={`${campo} flex-1 min-w-0`}>
                <option value="">Sem frente</option>
                {frentes.map((f) => <option key={f.sigla} value={f.sigla}>{f.nome}</option>)}
              </select>
              <button type="submit" disabled={!novoTitulo.trim()}
                className="shrink-0 min-h-[32px] px-3 rounded-[8px] bg-[var(--notch-verde)] text-[var(--notch-ink)] text-[12px] font-bold disabled:opacity-50">
                Começar
              </button>
            </div>
          </form>
        }
      />
    </div>
  );
}
