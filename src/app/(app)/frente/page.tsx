import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { semanaDe, deslocarSemana, diaCurto, hhmm, tempoLegivel, escaladosDe, ROTULO_STATUS, ROTULO_ATIVIDADE, hojeISO, diaBRT, somarDias } from "@/lib/semana";
import { definirQuemFez, marcarDesnecessaria, reverterDesnecessaria } from "../acoes";
import { Submit, DialogoDesnecessaria } from "../semana/Cronometro";
import { Corpo } from "@/componentes/SrMinutos";
import { nomeTarefa, SEM_EVENTO } from "@/componentes/nome-tarefa";
import { Seta } from "@/componentes/Seta";
import { Chip } from "@/componentes/Chip";
import { SemFrente } from "@/componentes/SemFrente";
import { Aba } from "@/componentes/Aba";

export const dynamic = "force-dynamic";

const CAMPOS = `id, atividade, titulo, status, estimativa_min, abre_em, prazo_em, concluida_em, escalado_id, dupla_id, responsavel_real_id,
                excecao_desc, frente_id, origem, frentes ( sigla, nome ), eventos ( competicao, data, evento_id_origem, confronto )`;
const FEITOS = ["entregue", "fora_do_prazo", "na"];
const POR_PAGINA = 50;
const GRADE = "grid grid-cols-[1.9fr_0.8fr_1.5fr_0.9fr] gap-3";
const GRADE_FEITAS = "grid grid-cols-[1.9fr_1fr_1fr_0.9fr] gap-3";

/**
 * Minha frente (líder) / Frentes (gestor). Desde 13/10 sem semana: todas as pendentes (atrasadas
 * em rosa) com filtros por entrega prevista, tipo e evento, as feitas com tempo medido × previsto, tem a aba Histórico (todas as concluídas, com filtro) e,
 * pro gestor, o bloco "Sem frente" das tarefas começadas do zero sem frente.
 */
export default async function MinhaFrente({ searchParams }: {
  searchParams: Promise<{ ver?: string; pagina?: string; pessoa?: string; mes?: string; prazo?: string; tipo?: string; evento?: string }>;
}) {
  const sp = await searchParams;
  const historico = sp.ver === "historico";
  const hoje = hojeISO();

  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome, papel").eq("auth_user_id", user!.id).single();

  const gestor = pessoa!.papel === "gestor";
  const { data: minhasFrentes } = gestor
    ? await supabase.from("frentes").select("id, sigla, nome").eq("ativa", true).order("sigla")
    : await supabase.from("frentes").select("id, sigla, nome").eq("lider_id", pessoa!.id);
  const frentes = minhasFrentes ?? [];
  const { data: time } = await supabase.from("pessoas").select("id, nome").order("nome");
  const nomePor = new Map((time ?? []).map((p) => [p.id, p.nome]));

  // Gestor vê também as tarefas começadas do zero sem frente (044). Líder, só as dele.
  const idsFrentes = frentes.map((f) => f.id);
  const ouGestor = `frente_id.in.(${idsFrentes.join(",")}),and(frente_id.is.null,origem.eq.registrada)`;

  const titulo = gestor ? "Frentes" : `Frente · ${frentes[0]?.nome ?? "—"}`;
  const abas = (
    <nav className="flex gap-1 rounded-[10px] bg-superficie-2 border border-linha p-1" aria-label="Ver">
      <Aba href="/frente" ativa={!historico}>Abertas</Aba>
      <Aba href="/frente?ver=historico" ativa={historico}>Histórico</Aba>
    </nav>
  );

  if (frentes.length === 0) {
    return (
      <div className="p-6 px-8 flex flex-col gap-5 max-w-[1140px]">
        <header className="flex flex-col gap-1.5"><h1 className="text-[34px]">{titulo}</h1></header>
        <Vazio>Você não lidera nenhuma frente.</Vazio>
      </div>
    );
  }

  // ---------------------------------------------------------------- Histórico
  if (historico) {
    const pagina = Math.max(1, Number(sp.pagina) || 1);
    const mes = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? sp.mes! : "";
    const quem = sp.pessoa && nomePor.has(sp.pessoa) ? sp.pessoa : "";
    const base = supabase.from("tarefas").select(CAMPOS, { count: "exact" });
    let consulta = (gestor ? base.or(ouGestor) : base.in("frente_id", idsFrentes))
      .in("status", FEITOS)
      .order("concluida_em", { ascending: false, nullsFirst: false })
      .range((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA - 1);
    if (quem) consulta = consulta.eq("responsavel_real_id", quem);
    if (mes) {
      const [a, m] = mes.split("-").map(Number);
      const prox = `${m === 12 ? a + 1 : a}-${String(m === 12 ? 1 : m + 1).padStart(2, "0")}-01`;
      consulta = consulta.gte("concluida_em", `${mes}-01T00:00:00-03:00`).lt("concluida_em", `${prox}T00:00:00-03:00`);
    }
    const { data: linhas, count } = await consulta;
    const tarefas = await comTempo(supabase, linhas ?? []);
    const total = count ?? tarefas.length;
    const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
    const link = (p: number) => `/frente?ver=historico&pagina=${p}${quem ? `&pessoa=${quem}` : ""}${mes ? `&mes=${mes}` : ""}`;
    const totalSeg = tarefas.reduce((s, t) => s + t.segundos, 0);
    const totalPrev = tarefas.reduce((s, t) => s + t.estimativa_min, 0);

    return (
      <div className="p-6 px-8 flex flex-col gap-5 max-w-[1140px]">
        <header className="flex items-end justify-between gap-5">
          <div className="flex flex-col gap-1.5">
            <h1 className="text-[34px]">{titulo}</h1>
            <p className="text-[12.5px] text-tinta-3">
              Histórico · {total} concluídas{quem ? ` por ${nomePor.get(quem)}` : ""}{mes ? ` em ${mes.split("-").reverse().join("/")}` : ""}
              {tarefas.length > 0 && <> · nesta página {tempoLegivel(totalSeg)} de {hhmm(totalPrev)} previstos</>}
            </p>
          </div>
          {abas}
        </header>

        <form method="GET" className="flex flex-wrap gap-2 items-center">
          <input type="hidden" name="ver" value="historico" />
          <label htmlFor="pessoa" className="sr-only">Pessoa</label>
          <select id="pessoa" name="pessoa" defaultValue={quem}
            className="min-h-9 px-2.5 rounded-[9px] border border-linha bg-superficie text-[12.5px] text-tinta-2">
            <option value="">todo mundo</option>
            {(time ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <label htmlFor="mes" className="sr-only">Mês</label>
          <input id="mes" name="mes" type="month" defaultValue={mes}
            className="min-h-9 px-2.5 rounded-[9px] border border-linha bg-superficie text-[12.5px] text-tinta-2" />
          <button type="submit" className="min-h-9 px-3.5 rounded-[9px] border border-linha bg-elevado text-[12.5px] font-medium hover:bg-linha transition">
            Filtrar
          </button>
          {(quem || mes) && <Link href="/frente?ver=historico" className="text-[12px] text-tinta-4 hover:text-tinta-2">limpar</Link>}
        </form>

        {tarefas.length === 0 ? <Vazio>Nenhuma tarefa concluída com esse filtro.</Vazio> : (
          <TabelaFeitas tarefas={tarefas} nomePor={nomePor} mostrarFrente={gestor} />
        )}

        {paginas > 1 && (
          <div className="flex items-center justify-between text-[12.5px] text-tinta-3">
            <span>Página {pagina} de {paginas}</span>
            <div className="flex gap-2">
              {pagina > 1 && <Seta href={link(pagina - 1)} rotulo="Página anterior">‹</Seta>}
              {pagina < paginas && <Seta href={link(pagina + 1)} rotulo="Próxima página">›</Seta>}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------------------------------------------------------------- Abertas
  // Sem semana (13/10): toda pendente aparece, atrasadas no topo -- a vencida sumia quando a
  // semana virava. Os chips filtram por entrega prevista, tipo e evento (mesmos de Minhas atividades).
  const janela = janelaDe(sp.prazo, hoje);
  const tipos = (sp.tipo ?? "").split(",").filter((v) => (TIPOS as readonly string[]).includes(v));
  const termoEvento = sp.evento?.trim().toLowerCase() ?? "";
  const daFrente = () => {
    const q = supabase.from("tarefas").select(CAMPOS);
    return gestor ? q.or(ouGestor) : q.in("frente_id", idsFrentes);
  };
  const [{ data: pend }, { data: conc }] = await Promise.all([
    daFrente().eq("status", "pendente").order("prazo_em").limit(1000),
    janela
      ? daFrente().in("status", FEITOS)
          .gte("prazo_em", `${janela[0]}T00:00:00-03:00`).lte("prazo_em", `${janela[1]}T23:59:59-03:00`).order("prazo_em")
      : daFrente().in("status", FEITOS)
          .gte("concluida_em", `${somarDias(hoje, -14)}T00:00:00-03:00`).order("concluida_em", { ascending: false }),
  ]);
  const agora = Date.now();
  const atrasou = (t: { status: string; prazo_em: string }) => t.status === "pendente" && new Date(t.prazo_em).getTime() < agora;
  const passa = (t: Linha) => {
    if (tipos.length && !tipos.includes(t.atividade)) return false;
    if (termoEvento) {
      const ev = Array.isArray(t.eventos) ? t.eventos[0] : t.eventos;
      const texto = `${ev?.confronto ?? ""} ${ev?.competicao ?? ""} ${ev?.evento_id_origem ?? ""} ${t.titulo ?? ""}`.toLowerCase();
      if (!texto.includes(termoEvento)) return false;
    }
    if (sp.prazo === "atrasadas") return atrasou(t);
    if (!janela || t.status !== "pendente") return true;
    const dia = diaBRT(t.prazo_em);
    return atrasou(t) || (dia >= janela[0] && dia <= janela[1]);
  };
  const todas = await comTempo(supabase, [...(pend ?? []), ...(conc ?? [])].filter(passa));
  const semFrente = todas.filter((t) => !t.frente_id);
  // A tabela principal: pendentes e "não necessária" (que o líder pode desfazer ali).
  const tarefas = todas.filter((t) => !!t.frente_id && (t.status === "pendente" || t.status === "na"));
  const feitas = todas.filter((t) => !!t.frente_id && (t.status === "entregue" || t.status === "fora_do_prazo"));
  const atrasadas = tarefas.filter(atrasou).length;
  // Quem fez sendo o escalado ou a dupla nao e desvio.
  const ehDesvio = (t: { responsavel_real_id: string | null; escalado_id: string; dupla_id: string | null }) =>
    !!t.responsavel_real_id && t.responsavel_real_id !== t.escalado_id && t.responsavel_real_id !== t.dupla_id;
  const desvios = todas.filter(ehDesvio).length;
  const aResolver = tarefas.filter((t) => !t.responsavel_real_id && t.status === "pendente").length;
  const segFeitas = feitas.reduce((s, t) => s + t.segundos, 0);
  const prevFeitas = feitas.reduce((s, t) => s + t.estimativa_min, 0);
  const { data: frentesAtivas } = gestor && semFrente.length
    ? await supabase.from("frentes").select("id, nome").eq("ativa", true).order("nome")
    : { data: [] as { id: string; nome: string }[] };

  const link = (mudar: { prazo?: string; tipo?: string; evento?: string }) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries({ prazo: sp.prazo, tipo: sp.tipo, evento: sp.evento, ...mudar })) if (v) q.set(k, v);
    return q.size ? `/frente?${q}` : "/frente";
  };
  const temFiltro = Boolean(sp.prazo || tipos.length || termoEvento);
  const ROTULO = "text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tinta-4 w-[118px] shrink-0";

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[1140px]">
      <header className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[34px]">{titulo}</h1>
          <p className="text-[12.5px] text-tinta-3">
            {tarefas.length} pendentes · <span className={atrasadas ? "text-rosa" : ""}>{atrasadas} atrasadas</span> · {feitas.length} feitas{janela ? "" : " nos últimos 14 dias"} · {aResolver} sem quem fez · {desvios} desvios
          </p>
        </div>
        {abas}
      </header>

      <section className="flex flex-col gap-2.5 rounded-xl bg-superficie border border-linha p-4">
        <form method="GET" className="flex flex-wrap items-center gap-2">
          {sp.prazo && <input type="hidden" name="prazo" value={sp.prazo} />}
          {sp.tipo && <input type="hidden" name="tipo" value={sp.tipo} />}
          <label htmlFor="f-evento" className={ROTULO}>Evento</label>
          <input id="f-evento" type="search" name="evento" defaultValue={sp.evento ?? ""}
            placeholder="Jogo ou competição, ex.: Corinthians"
            className="flex-1 min-w-[200px] min-h-9 px-3 rounded-[9px] border border-linha bg-fundo text-[12.5px]" />
          <button type="submit" className="min-h-9 px-3.5 rounded-[9px] border border-linha bg-elevado text-[12.5px] font-medium hover:bg-linha transition">
            Filtrar
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className={ROTULO}>Tipo</span>
          {TIPOS.map((v) => (
            <Chip key={v} href={link({ tipo: tipos.includes(v) ? tipos.filter((x) => x !== v).join(",") : [...tipos, v].join(",") })}
              ativo={tipos.includes(v)}>{ROTULO_ATIVIDADE[v]}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={ROTULO}>Entrega prevista</span>
          {PRAZOS.map(([v, r]) => (
            <Chip key={v} href={link({ prazo: sp.prazo === v ? "" : v })} ativo={sp.prazo === v} rosa={v === "atrasadas"}>{r}</Chip>
          ))}
          {temFiltro && (
            <Link href="/frente" className="ml-auto text-[12px] text-tinta-3 underline hover:text-tinta-2">Limpar filtros</Link>
          )}
        </div>
      </section>

      {tarefas.length === 0 && feitas.length === 0 && <Vazio>Nenhuma tarefa com esses filtros.</Vazio>}

      {tarefas.length > 0 && (
        <div className="relative h-[64px] -mb-5" aria-hidden>
          <Corpo pose="debrucado" altura={88} className="right-10 bottom-[-18px]" />
        </div>
      )}
      {tarefas.length > 0 && (
        <div className="rounded-xl bg-superficie border border-linha overflow-hidden">
          <div className={`${GRADE} px-4 py-2.5 bg-superficie-2`}>
            {["Tarefa", "Escalado", "Quem fez", "Prazo"].map((h) => (
              <span key={h} className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-tinta-4">{h}</span>
            ))}
          </div>
          {tarefas.map((t) => {
            const desvio = ehDesvio(t);
            const atrasada = atrasou(t);
            return (
              <div key={t.id} className={`${GRADE} items-center px-4 py-2.5 border-t border-linha-2 ${desvio ? "bg-ambar-fundo" : ""}`}>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[13px] font-medium">{nomeTarefa(t, "sigla")}</span>
                  <span className="text-[11px] text-tinta-4 truncate">
                    {t.evento ? <>evento {diaCurto(t.evento.data)}</> : SEM_EVENTO}
                    {t.status === "pendente" && t.abre_em > hoje && <> · abre {diaCurto(t.abre_em)}</>}
                    {t.segundos > 0 && <> · {tempoLegivel(t.segundos)} medidos</>}
                  </span>
                </div>
                <span className="text-[12.5px] text-tinta-3">{escaladosDe(nomePor, t.escalado_id, t.dupla_id)}</span>
                {t.status === "na" ? (
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[12px] text-tinta-4 truncate">não necessária{t.excecao_desc ? ` · ${t.excecao_desc}` : ""}</span>
                    <form action={reverterDesnecessaria.bind(null, t.id)}>
                      <Submit ocupado="..." className="text-[11px] text-verde-claro hover:underline shrink-0">desfazer</Submit>
                    </form>
                  </div>
                ) : t.responsavel_real_id ? (
                  <span className={`text-[12.5px] ${desvio ? "text-ambar-claro" : "text-tinta-2"}`}>
                    {nomePor.get(t.responsavel_real_id)}{desvio ? " · desvio" : ""}
                  </span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <form action={definirQuemFez.bind(null, t.id)} className="flex gap-1.5">
                      <label htmlFor={`q-${t.id}`} className="sr-only">Quem fez esta tarefa</label>
                      <select id={`q-${t.id}`} name="pessoa" defaultValue=""
                        className="min-h-8 px-2 rounded-md border border-linha bg-superficie-2 text-[12px] text-tinta-2">
                        <option value="" disabled>quem fez?</option>
                        {(time ?? []).map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                      </select>
                      <Submit ocupado="..." className="min-h-8 px-2.5 rounded-md border border-linha bg-elevado text-[12px] text-tinta-2">ok</Submit>
                    </form>
                    <DialogoDesnecessaria acao={marcarDesnecessaria.bind(null, t.id)} titulo={`${nomeTarefa(t)}`} />
                  </div>
                )}
                <span className={`num text-[12px] ${atrasada ? "text-rosa font-medium" : "text-tinta-4"}`}>
                  {diaCurto(diaBRT(t.prazo_em))}{atrasada ? " · atrasada" : ""}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {feitas.length > 0 && (
        <section className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-tinta-3">Feitas{janela ? "" : " · últimos 14 dias"}</h2>
            <span className="num text-[11.5px] text-tinta-4">{feitas.length} · {tempoLegivel(segFeitas)} de {hhmm(prevFeitas)} previstos</span>
          </div>
          <TabelaFeitas tarefas={feitas} nomePor={nomePor} mostrarFrente={gestor} />
        </section>
      )}

      {gestor && semFrente.length > 0 && (
        <SemFrente
          tarefas={semFrente.map((t) => ({
            id: t.id, nome: nomeTarefa(t, "sigla"), status: t.status, segundos: t.segundos,
            quem: nomePor.get(t.responsavel_real_id ?? t.escalado_id) ?? "—",
          }))}
          frentes={frentesAtivas ?? []}
        />
      )}

      <p className="rounded-[10px] bg-superficie-2 border border-dashed border-linha px-4 py-3 text-[12.5px] leading-relaxed text-tinta-3">
        A coluna <strong className="text-tinta-2 font-semibold">quem fez</strong> é a que hoje o líder
        preenche à mão no CSV de acompanhamento. Quando ela difere do escalado, vira um desvio de escala.
        Toda pendente fica aqui até ser entregue, atrasadas em rosa; o <strong className="text-tinta-2 font-semibold">Histórico</strong> lista tudo que já foi concluído na frente.
      </p>
    </div>
  );
}

const TIPOS = ["materiais", "sincronizacao", "roteiro", "auditoria"] as const;
const PRAZOS = [
  ["atrasadas", "Atrasadas"], ["hoje", "Hoje"], ["2d", "Próx. 2 dias"], ["3d", "Próx. 3 dias"],
  ["semana", "Esta semana"], ["prox", "Próxima semana"],
] as const;

/** Entrega prevista [de, até] em dias de Brasília, ou null (sem filtro de data). */
function janelaDe(prazo: string | undefined, hoje: string): [string, string] | null {
  const semana = semanaDe();
  switch (prazo) {
    case "hoje": return [hoje, hoje];
    case "2d": return [hoje, somarDias(hoje, 2)];
    case "3d": return [hoje, somarDias(hoje, 3)];
    case "semana": return [semana.inicio, semana.fim];
    case "prox": { const p = deslocarSemana(semana.inicio, 1); return [p.inicio, p.fim]; }
  }
  return null;
}

type Linha = {
  id: string; atividade: string; titulo: string | null; status: string; estimativa_min: number; abre_em: string; prazo_em: string;
  concluida_em: string | null; escalado_id: string; dupla_id: string | null; responsavel_real_id: string | null;
  excecao_desc: string | null; frente_id: string | null; origem: string;
  frentes: { sigla: string; nome: string } | { sigla: string; nome: string }[] | null;
  eventos: { competicao: string; data: string; evento_id_origem?: string | null; confronto?: string | null }
         | { competicao: string; data: string; evento_id_origem?: string | null; confronto?: string | null }[] | null;
};

/** Junta o tempo medido (v_tempo_tarefa) e achata frente/evento. */
async function comTempo(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, linhas: Linha[]) {
  const ids = linhas.map((t) => t.id);
  const { data: tempos } = ids.length
    ? await supabase.from("v_tempo_tarefa").select("tarefa_id, segundos_total").in("tarefa_id", ids)
    : { data: [] as { tarefa_id: string; segundos_total: number }[] };
  const porId = new Map((tempos ?? []).map((t) => [t.tarefa_id, Number(t.segundos_total)]));
  return linhas.map((t) => ({
    ...t,
    frente: Array.isArray(t.frentes) ? t.frentes[0] : t.frentes,
    evento: Array.isArray(t.eventos) ? t.eventos[0] : t.eventos,
    segundos: porId.get(t.id) ?? 0,
  }));
}

type Feita = Awaited<ReturnType<typeof comTempo>>[number];

function TabelaFeitas({ tarefas, nomePor, mostrarFrente }: { tarefas: Feita[]; nomePor: Map<string, string>; mostrarFrente: boolean }) {
  return (
    <div className="rounded-xl bg-superficie border border-linha overflow-hidden">
      <div className={`${GRADE_FEITAS} px-4 py-2.5 bg-superficie-2`}>
        {["Tarefa", "Quem fez", "Tempo medido × previsto", "Concluída"].map((h) => (
          <span key={h} className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-tinta-4">{h}</span>
        ))}
      </div>
      {tarefas.map((t) => {
        const estourou = t.estimativa_min > 0 && t.segundos > t.estimativa_min * 60;
        const fora = t.status === "fora_do_prazo";
        return (
          <div key={t.id} className={`${GRADE_FEITAS} items-center px-4 py-2.5 border-t border-linha-2`}>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className={`text-[13px] font-medium ${t.status === "na" ? "line-through decoration-tinta-4 text-tinta-3" : ""}`}>
                {nomeTarefa(t, "sigla")}{mostrarFrente && !t.frente ? " · sem frente" : ""}
              </span>
              <span className="text-[11px] text-tinta-4 truncate">
                {t.evento ? <>evento {diaCurto(t.evento.data)}</> : SEM_EVENTO}
                {fora && <span className="text-rosa"> · fora do prazo</span>}
                {t.status === "na" && <> · {ROTULO_STATUS.na.toLowerCase()}{t.excecao_desc ? `: ${t.excecao_desc}` : ""}</>}
              </span>
            </div>
            <span className="text-[12.5px] text-tinta-2 truncate">{nomePor.get(t.responsavel_real_id ?? t.escalado_id) ?? "—"}</span>
            <span className={`num text-[12.5px] ${estourou ? "text-ambar" : "text-tinta-2"}`}>
              {tempoLegivel(t.segundos)} <span className="text-tinta-4">× {hhmm(t.estimativa_min)}</span>
            </span>
            <span className="num text-[12px] text-tinta-4">{t.concluida_em ? diaCurto(t.concluida_em.slice(0, 10)) : "—"}</span>
          </div>
        );
      })}
    </div>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[10px] border border-dashed border-linha px-4 py-5 text-[12.5px] text-tinta-4">{children}</p>;
}
