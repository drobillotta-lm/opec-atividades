import { criarClienteServidor } from "@/lib/supabase/server";
import { hhmm, ROTULO_ATIVIDADE } from "@/lib/semana";

export const dynamic = "force-dynamic";

const COMPETENCIA = "2026-09-01";

export default async function Painel() {
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
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[23px] font-semibold tracking-[-0.02em]">Painel · setembro 2026</h1>
        <p className="text-[12.5px] text-tinta-3">O que o mapa previu e o que de fato aconteceu</p>
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
            <span className="inline-flex items-center gap-2"><span className="w-4 h-2 rounded bg-azul" />Medido</span>
            <span className="inline-flex items-center gap-2"><span className="w-0.5 h-3.5 bg-tinta-3" />Previsto</span>
          </div>
        </div>
        {linhas.length === 0 && <p className="text-[12.5px] text-tinta-4">Ninguém registrou tempo ainda neste mês.</p>}
        {linhas.map((l) => (
          <div key={l.pessoa_id} className="grid grid-cols-[130px_1fr_110px_60px] gap-4 items-center py-2 border-t border-linha-2">
            <span className="text-[13px] font-medium truncate">{l.nome}</span>
            <div className="relative h-2.5">
              <div className="absolute inset-0 rounded-full bg-[#252b35]" />
              <div className="absolute left-0 top-0 h-2.5 rounded-full bg-azul"
                   style={{ width: `${Math.min(100, (100 * (l.minutos_medidos ?? 0)) / escala)}%` }} />
              <div className="absolute -top-1 w-0.5 h-4.5 bg-tinta-3"
                   style={{ left: `${Math.min(100, (100 * (l.minutos_previstos ?? 0)) / escala)}%`, boxShadow: "0 0 0 2px #161a20" }} />
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

function Tile({ rotulo, valor, nota }: { rotulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-xl bg-superficie border border-linha px-4 py-3.5 flex flex-col gap-1.5">
      <span className="text-[11.5px] text-tinta-3">{rotulo}</span>
      <span className="num text-[26px] font-medium tracking-[-0.02em]">{valor}</span>
      <span className="text-[11px] text-tinta-4">{nota}</span>
    </div>
  );
}
