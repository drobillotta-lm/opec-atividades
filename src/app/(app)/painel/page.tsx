import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { hhmm, ROTULO_ATIVIDADE } from "@/lib/semana";
import { Corpo } from "@/componentes/SrMinutos";

export const dynamic = "force-dynamic";

/** Competência = primeiro dia do mês. Sem `?mes=`, o mês corrente. */
function competenciaDe(mes?: string) {
  const m = mes && /^\d{4}-\d{2}$/.test(mes) ? new Date(`${mes}-01T12:00:00-03:00`) : new Date();
  return new Date(Date.UTC(m.getFullYear(), m.getMonth(), 1));
}
const chaveMes = (d: Date) => d.toISOString().slice(0, 7);
const deslocarMes = (d: Date, n: number) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
const rotuloMes = (d: Date) => d.toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function Painel({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const sp = await searchParams;
  const competencia = competenciaDe(sp.mes);
  const COMPETENCIA = competencia.toISOString().slice(0, 10);
  const supabase = await criarClienteServidor();
  const { data: pessoas } = await supabase
    .from("v_mes_pessoa").select("*").eq("competencia", COMPETENCIA).order("minutos_previstos", { ascending: false });
  const { data: taxas } = await supabase
    .from("v_taxa_real").select("*").eq("competencia", COMPETENCIA).order("amostras", { ascending: false });

  const linhas = pessoas ?? [];
  const escala = Math.max(60, ...linhas.flatMap((l) => [l.minutos_medidos ?? 0, l.minutos_previstos ?? 0]));
  const totPrev = linhas.reduce((s, l) => s + (l.minutos_previstos ?? 0), 0);
  const totFeito = linhas.reduce((s, l) => s + (l.minutos_medidos ?? 0), 0);

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[1080px]">
      <header className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[34px]">Painel · {rotuloMes(competencia)}</h1>
          <p className="text-[12.5px] text-tinta-3">O que o mapa previu e o que de fato aconteceu</p>
        </div>
        <div className="flex items-center gap-2">
          <Seta href={`/painel?mes=${chaveMes(deslocarMes(competencia, -1))}`} rotulo="Mês anterior">‹</Seta>
          <Seta href="/painel" rotulo="Mês atual">hoje</Seta>
          <Seta href={`/painel?mes=${chaveMes(deslocarMes(competencia, 1))}`} rotulo="Próximo mês">›</Seta>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Tile rotulo="Previsto pelas taxas" valor={hhmm(totPrev)} nota={`${linhas.length} pessoas com tarefa`} />
        <Tile rotulo="Medido no app" valor={hhmm(totFeito)} nota={totPrev ? `${Math.round((100 * totFeito) / totPrev)}% do previsto` : "—"} />
        <Tile rotulo="Tarefas entregues" valor={String(linhas.reduce((s, l) => s + (l.entregues ?? 0), 0))}
              nota={`de ${linhas.reduce((s, l) => s + (l.tarefas ?? 0), 0)}`} />
      </div>

      <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-[-0.01em]">Horas por pessoa</h2>
          <div className="flex items-center gap-4 text-[11.5px] text-tinta-3">
            <span className="inline-flex items-center gap-2"><span className="w-4 h-2 rounded bg-creme" />Medido</span>
            <span className="inline-flex items-center gap-2"><span className="w-0.5 h-3.5 bg-verde" />Previsto</span>
          </div>
        </div>
        {linhas.length === 0 && <p className="text-[12.5px] text-tinta-4">Ninguém registrou tempo ainda neste mês.</p>}
        {linhas.map((l) => (
          <div key={l.pessoa_id} className="grid grid-cols-[130px_1fr_110px_60px] gap-4 items-center py-2 border-t border-linha-2">
            <span className="text-[13px] font-medium truncate">{l.nome}</span>
            <div className="relative h-2.5">
              <div className="absolute inset-0 rounded-full bg-trilho" />
              <div className={`absolute left-0 top-0 h-2.5 rounded-full ${(l.minutos_medidos ?? 0) > (l.minutos_previstos ?? 0) ? "bg-ambar" : "bg-creme"}`}
                   style={{ width: `${Math.min(100, (100 * (l.minutos_medidos ?? 0)) / escala)}%` }} />
              <div className="absolute -top-1 w-0.5 h-4.5 bg-verde"
                   style={{ left: `${Math.min(100, (100 * (l.minutos_previstos ?? 0)) / escala)}%`, boxShadow: "0 0 0 2px var(--superficie)" }} />
            </div>
            <span className="num text-[12px] text-tinta-2 text-right">
              {hhmm(l.minutos_medidos ?? 0)} / {hhmm(l.minutos_previstos ?? 0)}
            </span>
            <span className="text-[11.5px] text-tinta-3 text-right">
              {l.desvio_pct === null || l.desvio_pct === undefined ? "—" : `${l.desvio_pct > 0 ? "+" : ""}${l.desvio_pct}%`}
            </span>
          </div>
        ))}
      </section>

      {(() => {
        // Ele comenta a taxa, nunca a pessoa (docs/06). Só quando passa de 15%.
        const d = [...(taxas ?? [])].filter((t) => Math.abs(t.desvio_pct) > 15)
          .sort((a, b) => Math.abs(b.desvio_pct) - Math.abs(a.desvio_pct))[0];
        return d ? (
          <div className="relative h-[92px] -mb-3">
            <Corpo pose="apontando" altura={104} className="right-10 bottom-[-6px]"
              fala={`${ROTULO_ATIVIDADE[d.atividade] ?? d.atividade} tá ${Math.abs(d.desvio_pct)}% ${d.desvio_pct > 0 ? "acima" : "abaixo"} da taxa. Hora de rever.`} />
          </div>
        ) : null;
      })()}
      <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-[-0.01em]">A taxa ainda vale?</h2>
        {(taxas ?? []).length === 0 ? (
          <p className="text-[12.5px] text-tinta-4">
            Ainda não há tarefa entregue com tempo cronometrado. Esta é a tabela que diz se as taxas
            medidas em julho continuam valendo.
          </p>
        ) : (
          <div className="flex flex-col">
            <div className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr_0.6fr] gap-3 pb-2">
              {["Atividade", "Amostras", "Taxa", "Medido", "Desvio"].map((h) => (
                <span key={h} className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-tinta-4">{h}</span>
              ))}
            </div>
            {(taxas ?? []).map((t) => (
              <div key={t.atividade} className="grid grid-cols-[1.4fr_0.7fr_0.8fr_0.8fr_0.6fr] gap-3 py-2 border-t border-linha-2 text-[12.5px]">
                <span>{ROTULO_ATIVIDADE[t.atividade] ?? t.atividade}</span>
                <span className="num text-tinta-3">{t.amostras}</span>
                <span className="num text-tinta-3">{hhmm(t.taxa_vigente_min)}</span>
                <span className="num text-tinta-2">{hhmm(t.media_medida_min)}</span>
                <span className="num text-tinta-3">{t.desvio_pct > 0 ? "+" : ""}{t.desvio_pct}%</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="rounded-[10px] bg-superficie-2 border border-dashed border-linha px-4 py-3 text-[12.5px] leading-relaxed text-tinta-3">
        Hora não vira ranking. Alguém acima da taxa não é alguém lento: é uma taxa provavelmente
        defasada, medida uma única vez em julho.
      </p>
    </div>
  );
}

function Seta({ href, rotulo, children }: { href: string; rotulo: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={rotulo}
      className="min-h-[36px] min-w-[36px] px-3 grid place-items-center rounded-lg border border-linha bg-superficie text-[12.5px] text-tinta-2 hover:bg-elevado transition">
      {children}
    </Link>
  );
}

function Tile({ rotulo, valor, nota }: { rotulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-xl bg-superficie border border-linha px-4 py-3.5 flex flex-col gap-1.5">
      <span className="text-[11.5px] text-tinta-3">{rotulo}</span>
      <span className="num text-[26px] font-medium tracking-[-0.02em]">{valor}</span>
      <span className="text-[11px] text-tinta-4">{nota}</span>
    </div>
  );
}
