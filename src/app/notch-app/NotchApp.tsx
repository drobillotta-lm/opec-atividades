"use client";

import { useCallback, useEffect, useState } from "react";
import { Notch, type Canto, type ProximaNotch, type TarefaNotch } from "@/componentes/Notch";
import { Rosto } from "@/componentes/SrMinutos";

/**
 * O notch dentro do app nativo (Tauri, contrato com a janela APP em 02/10).
 * A página nunca vê o token de pareamento: tudo passa por window.__TAURI__.core.invoke.
 * Recolhido 98×53 (53×98 nas laterais); no hover ou aberto, pede uma janela maior.
 */

type Estado = {
  pareado: boolean;
  pessoa: { nome: string } | null;
  tarefa: TarefaNotch | null;
  proximas: ProximaNotch[];
};

type Invoke = <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
declare global {
  interface Window { __TAURI__?: { core: { invoke: Invoke } } }
}
const invoke: Invoke = (cmd, args) => window.__TAURI__!.core.invoke(cmd, args);

export function NotchApp() {
  const [tauri, setTauri] = useState<boolean | null>(null);
  const [estado, setEstado] = useState<Estado | null>(null);
  const [canto, setCanto] = useState<Canto>("baixo-dir");
  const [hover, setHover] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => { setTauri(!!window.__TAURI__); }, []);

  const carregar = useCallback(async () => {
    try { setEstado(await invoke<Estado>("estado")); } catch { /* o relógio local segue; tenta de novo em 15 s */ }
  }, []);

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

  const lateral = canto === "dir-alto" || canto === "esq-alto";
  const pareado = estado?.pareado ?? true;
  useEffect(() => {
    if (!tauri) return;
    const grande = !pareado || hover || aberto;
    const [largura, altura] = !pareado ? [300, 230] : grande ? [300, aberto ? 420 : 290] : lateral ? [53, 98] : [98, 53];
    invoke("tamanho", { largura, altura, canto }).catch(() => {});
  }, [tauri, pareado, hover, aberto, canto, lateral]);

  const pausar = useCallback(async () => { await invoke("pausar"); await carregar(); }, [carregar]);
  const iniciarTarefa = useCallback(async (tarefaId: string) => { await invoke("iniciar", { tarefaId }); await carregar(); }, [carregar]);

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
      <main className="min-h-screen grid place-items-center p-6">
        <div className="flex items-center gap-3 rounded-[14px] border border-linha bg-superficie px-4 py-3">
          <Rosto estado="creme" tamanho={28} />
          <span className="text-[13px] text-tinta-2">Abra pelo app Atividades OPEC.</span>
        </div>
      </main>
    );
  }

  if (!pareado) {
    return (
      <main className="fixed inset-0 grid place-items-end p-1">
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

  const tarefa = estado?.tarefa ?? null;
  return (
    <Notch
      modo="janela"
      tarefa={tarefa}
      pausar={pausar}
      retomar={tarefa ? () => iniciarTarefa(tarefa.id) : null}
      abrirSemana={() => { invoke("abrir", { caminho: "/semana" }).catch(() => {}); }}
      aoMudarCanto={setCanto}
      aoAbrirFechar={setAberto}
      proximas={estado?.proximas ?? []}
      iniciarTarefa={iniciarTarefa}
    />
  );
}
