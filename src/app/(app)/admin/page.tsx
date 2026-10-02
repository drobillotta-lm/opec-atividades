import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { classificarCompeticao, criarFrenteEClassificar, sincronizarAgora } from "../acoes";
import { ClassificarFrente } from "@/componentes/ClassificarFrente";
import { Submit } from "../semana/Cronometro";
import type { ResumoSincronizacao } from "@/lib/escala/sincronizar";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const supabase = await criarClienteServidor();
  const { data: pessoas } = await supabase
    .from("pessoas").select("id, nome, nivel, h_dia, papel, saida, restrito_a").order("saida", { nullsFirst: true }).order("nome");
  const { data: frentes } = await supabase
    .from("frentes").select("id, sigla, nome, regime, ativa, lider_id").order("sigla");
  const { data: semFrente } = await supabase
    .from("competicoes").select("nome, entrega_padrao").is("frente_id", null).order("nome");
  const { count: indefinidos } = await supabase
    .from("eventos").select("id", { count: "exact", head: true }).is("entrega", null)
    .gte("data", "2026-09-21");

  // Log de cada rodada (038): relógio do n8n ou botão daqui.
  const { data: sincs } = await supabase
    .from("sincronizacoes").select("id, iniciada_em, terminada_em, disparo, ok, resumo, erro")
    .order("iniciada_em", { ascending: false }).limit(3);
  const ultimaOk = (sincs ?? []).find((s) => s.ok);

  const nomePor = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));
  const frentesAtivas = (frentes ?? []).filter((f) => f.ativa);
  const quando = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const ultimaSinc = ultimaOk?.terminada_em ? quando(ultimaOk.terminada_em) : "nunca";

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[1080px]">
      <header className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[23px] font-semibold tracking-[-0.02em]">Admin</h1>
          <p className="text-[12.5px] text-tinta-3">Só Yuri e Daniel abrem esta tela</p>
        </div>
        <form action={sincronizarAgora} className="flex items-center gap-3">
          <span className="text-[11.5px] text-tinta-4">Escala lida às {ultimaSinc}</span>
          <Submit ocupado="Sincronizando..." className="min-h-9 px-3.5 rounded-[9px] border border-linha bg-elevado text-[12.5px] font-medium hover:bg-linha transition">
            Sincronizar agora
          </Submit>
        </form>
      </header>

      {(semFrente ?? []).length > 0 && (
        <Cartao titulo="Competições sem frente" nota="não geram tarefa até alguém classificar">
          {(semFrente ?? []).map((c) => (
            <div key={c.nome} className="flex items-center justify-between gap-3 py-2 border-t border-linha-2 text-[12.5px]">
              <div className="flex flex-col min-w-0">
                <span className="truncate">{c.nome}</span>
                <span className="text-tinta-4 text-[11px]">entrega padrão: {c.entrega_padrao}</span>
              </div>
              <ClassificarFrente
                acaoClassificar={classificarCompeticao.bind(null, c.nome)}
                acaoCriar={criarFrenteEClassificar.bind(null, c.nome)}
                frentes={frentesAtivas}
              />
            </div>
          ))}
        </Cartao>
      )}

      {!!indefinidos && indefinidos > 0 && (
        <Link href="/admin/eventos"
          className="rounded-xl bg-superficie border border-linha p-5 flex items-center justify-between gap-3 hover:bg-elevado transition">
          <div className="flex flex-col gap-1">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-tinta-3">Eventos esperando decisão de entrega</h2>
            <span className="text-[12.5px] text-tinta-3">{indefinidos} eventos — a decisão é tomada na Escala, aqui é só a visão</span>
          </div>
          <span className="text-tinta-4">→</span>
        </Link>
      )}

      <Link href="/admin/eventos"
        className="rounded-xl bg-superficie border border-linha p-5 flex items-center justify-between gap-3 hover:bg-elevado transition">
        <div className="flex flex-col gap-1">
          <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-tinta-3">Gestão de eventos</h2>
          <span className="text-[12.5px] text-tinta-3">Cada evento, se tem entrega, e as atividades e responsáveis que ele gerou</span>
        </div>
        <span className="text-tinta-4">→</span>
      </Link>

      <Cartao titulo="Última sincronização" nota="as 3 últimas rodadas com a Escala">
        {(sincs ?? []).length === 0 && <p className="py-2 text-[12.5px] text-tinta-4">Nenhuma rodada registrada ainda.</p>}
        {(sincs ?? []).map((s) => {
          const r = s.resumo as ResumoSincronizacao | null;
          return (
            <div key={s.id} className="flex flex-col gap-0.5 py-2 border-t border-linha-2 text-[12.5px]">
              <span className={s.ok === false ? "text-rosa" : "text-tinta-2"}>
                {quando(s.iniciada_em)} · {s.disparo === "botao" ? "botão" : "relógio"} ·{" "}
                {s.ok === null ? "rodando ou interrompida" : s.ok ? `ok em ${((r?.duracao_ms ?? 0) / 1000).toFixed(1)} s` : "falhou"}
              </span>
              <span className="text-[11.5px] text-tinta-4">
                {s.erro ? s.erro : r ? [
                  `${r.lidos.eventos} eventos lidos`,
                  `entrega ${r.entrega.sim} sim / ${r.entrega.nao} não / ${r.entrega.indefinido} indefinido`,
                  `${r.tarefas?.criadas ?? 0} tarefas criadas`,
                  `${(r.sem_entrega?.apagadas ?? 0) + (r.sem_entrega?.marcadas_na ?? 0)} sem entrega`,
                  `${(r.fora_da_cadeia?.apagadas ?? 0) + (r.fora_da_cadeia?.marcadas_na ?? 0)} fora da cadeia`,
                  `${r.reaplicadas.reduce((n, x) => n + x.reescaladas, 0)} reescaladas`,
                ].join(" · ") : ""}
              </span>
            </div>
          );
        })}
        <p className="pt-2 border-t border-linha-2 text-[11.5px] text-tinta-4">
          Desde 21/09 o plantão é dos freelas; fixo em plantão é exceção.
        </p>
      </Cartao>

      <Cartao titulo="Pessoas" nota={`${(pessoas ?? []).filter((p) => !p.saida).length} ativas`}>
        <div className="grid grid-cols-[1.2fr_1.1fr_0.5fr_1.4fr] gap-3 pb-2">
          {["Pessoa", "Nível", "Jornada", "Situação"].map((h) => (
            <span key={h} className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-tinta-4">{h}</span>
          ))}
        </div>
        {(pessoas ?? []).map((p) => (
          <div key={p.id} className={`grid grid-cols-[1.2fr_1.1fr_0.5fr_1.4fr] gap-3 py-2 border-t border-linha-2 text-[12.5px] ${p.saida ? "text-tinta-4" : ""}`}>
            <span className="font-medium">{p.nome}</span>
            <span>{p.nivel}</span>
            <span className="num">{p.h_dia}h</span>
            <span className="text-tinta-3">
              {p.saida ? `saiu em ${p.saida} · histórico preservado`
                : p.restrito_a?.length ? `só ${p.restrito_a.join(", ")}`
                : p.papel === "gestor" ? "gestor da área" : "—"}
            </span>
          </div>
        ))}
      </Cartao>

      <Cartao titulo="Frentes" nota={`${(frentes ?? []).filter((f) => f.ativa).length} ativas`}>
        <div className="grid grid-cols-[1fr_1fr_1.2fr] gap-3 pb-2">
          {["Frente", "Líder", "Regime"].map((h) => (
            <span key={h} className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-tinta-4">{h}</span>
          ))}
        </div>
        {(frentes ?? []).map((f) => (
          <div key={f.sigla} className={`grid grid-cols-[1fr_1fr_1.2fr] gap-3 py-2 border-t border-linha-2 text-[12.5px] ${f.ativa ? "" : "text-tinta-4"}`}>
            <span className="font-medium">{f.nome}</span>
            <span className="text-tinta-3">{f.lider_id ? nomePor.get(f.lider_id) : "—"}</span>
            <span className="text-tinta-3">{f.regime.replace(/_/g, " ")}</span>
          </div>
        ))}
      </Cartao>

      <p className="rounded-[10px] bg-superficie-2 border border-dashed border-linha px-4 py-3 text-[12.5px] leading-relaxed text-tinta-3">
        Quem faz o quê em cada mês continua sendo decidido no modelo de dimensionamento: o solver
        propõe, o Yuri aprova. Este app lê o mapa aprovado e nunca decide alocação sozinho.
      </p>
    </div>
  );
}

function Cartao({ titulo, nota, children }: { titulo: string; nota: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col">
      <div className="flex items-baseline justify-between gap-3 pb-2">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-tinta-3">{titulo}</h2>
        <span className="text-[11.5px] text-tinta-4">{nota}</span>
      </div>
      {children}
    </section>
  );
}
