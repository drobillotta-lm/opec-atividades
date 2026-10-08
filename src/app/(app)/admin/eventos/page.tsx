import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { diaCurto, ROTULO_ATIVIDADE, ROTULO_STATUS, escaladosDe } from "@/lib/semana";
import { classificarCompeticao, classificarEvento, criarFrenteEClassificar } from "../../acoes";
import { ClassificarEvento } from "./ClassificarEvento";
import { nomeEvento } from "@/componentes/nome-tarefa";

export const dynamic = "force-dynamic";

const ESCALA_ENTREGA_URL = "https://escala-opec.vercel.app/entrega.html";

function somarDias(base: string, dias: number) {
  const d = new Date(base + "T00:00:00");
  d.setDate(d.getDate() + dias);
  return d.toLocaleDateString("en-CA");
}

export default async function GestaoEventos() {
  const supabase = await criarClienteServidor();
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const de = somarDias(hoje, -7);
  const ate = somarDias(hoje, 30);

  const { data: eventosBrutos } = await supabase
    .from("eventos")
    .select(`id, evento_id_origem, confronto, competicao, data, entrega, entrega_origem, frentes ( sigla )`)
    .gte("data", de).lte("data", ate)
    .order("data");

  const eventos = (eventosBrutos ?? []).map((e) => ({
    ...e,
    frente: Array.isArray(e.frentes) ? e.frentes[0] : e.frentes,
  }));
  const ids = eventos.map((e) => e.id);

  const { data: tarefasBrutas } = ids.length
    ? await supabase
        .from("tarefas")
        .select("id, evento_id, atividade, status, escalado_id, dupla_id, responsavel_real_id")
        .in("evento_id", ids)
    : { data: [] };

  const { data: pessoas } = await supabase.from("pessoas").select("id, nome");
  const nomePor = new Map((pessoas ?? []).map((p) => [p.id, p.nome]));

  const { data: frentes } = await supabase.from("frentes").select("id, nome").eq("ativa", true).order("nome");

  const tarefasPorEvento = new Map<string, typeof tarefasBrutas>();
  (tarefasBrutas ?? []).forEach((t) => {
    const lista = tarefasPorEvento.get(t.evento_id) ?? [];
    lista.push(t);
    tarefasPorEvento.set(t.evento_id, lista);
  });

  const pendentesDeDecisao = eventos.filter((e) => e.entrega === null).length;

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[1140px]">
      <header className="flex flex-col gap-1.5">
        <Link href="/admin" className="text-[12px] text-tinta-4 hover:text-tinta-2 transition w-fit">← Admin</Link>
        <h1 className="text-[23px] font-semibold tracking-[-0.02em]">Gestão de eventos</h1>
        <p className="text-[12.5px] text-tinta-3">
          {diaCurto(de)} a {diaCurto(ate)} · {eventos.length} eventos · {pendentesDeDecisao} sem decisão de entrega
        </p>
        <p className="text-[11.5px] text-tinta-4">
          Quem decide &quot;tem entrega?&quot; é o líder de frente, na Escala — aqui é só a visão.{" "}
          <a href={ESCALA_ENTREGA_URL} target="_blank" rel="noreferrer" className="text-verde-claro hover:underline">
            abrir a fila de entrega na Escala ↗
          </a>
        </p>
      </header>

      {eventos.length === 0 && (
        <p className="rounded-[10px] border border-dashed border-linha px-4 py-5 text-[12.5px] text-tinta-4">
          Nenhum evento nesta janela.
        </p>
      )}

      <div className="flex flex-col gap-2.5">
        {eventos.map((e) => {
          const tarefas = tarefasPorEvento.get(e.id) ?? [];
          return (
            <div key={e.id} className="rounded-xl bg-superficie border border-linha p-4 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[13.5px] font-medium truncate">{nomeEvento(e.competicao, e.confronto, e.evento_id_origem)}</span>
                  <span className="text-[11.5px] text-tinta-4 truncate" title={e.evento_id_origem}>
                    {diaCurto(e.data)} {e.frente ? `· ${e.frente.sigla}` : "· sem frente"}
                  </span>
                </div>
                <EntregaBadge entrega={e.entrega} origem={e.entrega_origem} />
              </div>

              {tarefas.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-linha-2">
                  {tarefas.map((t) => {
                    const desvio = t.responsavel_real_id && t.responsavel_real_id !== t.escalado_id && t.responsavel_real_id !== t.dupla_id;
                    const cor = t.status === "entregue" ? "text-verde-claro border-verde-borda bg-verde-fundo"
                      : t.status === "fora_do_prazo" ? "text-rosa border-linha bg-superficie-2"
                      : t.status === "na" ? "text-tinta-4 border-linha-2 bg-superficie-2 line-through decoration-tinta-4"
                      : "text-tinta-3 border-linha bg-superficie-2";
                    return (
                      <span key={t.id} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] ${cor}`}>
                        {ROTULO_ATIVIDADE[t.atividade] ?? t.atividade}
                        {t.status !== "na" && (
                          <>
                            <span className="text-tinta-4">·</span>
                            {desvio ? nomePor.get(t.responsavel_real_id!) ?? "—" : escaladosDe(nomePor, t.escalado_id, t.dupla_id)}
                            {desvio && <span className="text-ambar-claro">(desvio)</span>}
                          </>
                        )}
                        <span className="text-tinta-4">· {ROTULO_STATUS[t.status] ?? t.status}</span>
                      </span>
                    );
                  })}
                </div>
              )}

              {tarefas.length === 0 && e.entrega === true && (
                <p className="text-[11.5px] text-ambar-claro pt-1.5 border-t border-linha-2">
                  Tem entrega mas nenhuma tarefa gerada — confira se a competição já tem frente e cadeia.
                </p>
              )}

              {!e.frente && (
                <ClassificarEvento
                  acaoClassificarCompeticao={classificarCompeticao.bind(null, e.competicao)}
                  acaoClassificarEvento={classificarEvento.bind(null, e.id)}
                  acaoCriarFrente={criarFrenteEClassificar.bind(null, e.competicao)}
                  frentes={frentes ?? []}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EntregaBadge({ entrega, origem }: { entrega: boolean | null; origem: string | null }) {
  if (entrega === null) {
    return (
      <span className="shrink-0 rounded-md border border-linha bg-superficie-2 px-2.5 py-1 text-[11px] font-medium text-tinta-4">
        sem decisão
      </span>
    );
  }
  return (
    <span className={`shrink-0 rounded-md border px-2.5 py-1 text-[11px] font-medium ${
      entrega ? "text-verde-claro border-verde-borda bg-verde-fundo" : "text-tinta-4 border-linha bg-superficie-2"
    }`}>
      {entrega ? "tem entrega" : "sem entrega"} · {origem}
    </span>
  );
}
