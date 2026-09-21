import { criarClienteServidor } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Admin() {
  const supabase = await criarClienteServidor();
  const { data: pessoas } = await supabase
    .from("pessoas").select("id, nome, nivel, h_dia, papel, saida, restrito_a").order("saida", { nullsFirst: true }).order("nome");
  const { data: frentes } = await supabase
    .from("frentes").select("sigla, nome, regime, ativa, lider_id").order("sigla");
  const { data: semFrente } = await supabase
    .from("competicoes").select("nome, entrega_padrao").is("frente_id", null).order("nome");
  const { data: indefinidos } = await supabase
    .from("eventos").select("id, evento_id_origem, competicao, data").is("entrega", null)
    .gte("data", "2026-09-21").order("data").limit(20);

  const nomePor = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[1080px]">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[23px] font-semibold tracking-[-0.02em]">Admin</h1>
        <p className="text-[12.5px] text-tinta-3">Só Yuri e Daniel abrem esta tela</p>
      </header>

      {(semFrente ?? []).length > 0 && (
        <Cartao titulo="Competições sem frente" nota="não geram tarefa até alguém classificar">
          {(semFrente ?? []).map((c) => (
            <div key={c.nome} className="flex items-center justify-between gap-3 py-2 border-t border-linha-2 text-[12.5px]">
              <span className="truncate">{c.nome}</span>
              <span className="text-tinta-4 shrink-0">entrega: {c.entrega_padrao}</span>
            </div>
          ))}
        </Cartao>
      )}

      {(indefinidos ?? []).length > 0 && (
        <Cartao titulo="Eventos esperando decisão de entrega" nota={`${indefinidos!.length} eventos`}>
          {(indefinidos ?? []).map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 py-2 border-t border-linha-2 text-[12.5px]">
              <span className="truncate">{e.evento_id_origem}</span>
              <span className="num text-tinta-4 shrink-0">{e.data}</span>
            </div>
          ))}
        </Cartao>
      )}

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
