import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { Aba } from "@/componentes/Aba";
import { Chip } from "@/componentes/Chip";
import { QuadroKanban, type TarefaQuadro } from "@/componentes/QuadroKanban";
import { semanaDe, deslocarSemana, diaCurto, hhmm, tempoLegivel, ROTULO_ATIVIDADE, escaladosDe, hojeISO, diaBRT, somarDias } from "@/lib/semana";
import { Relogio, Submit, TempoParado, DialogoEntrega, DialogoDesnecessaria, DialogoAjuste } from "./Cronometro";
import { DialogoPartes, type Parte } from "./Partes";
import {
  iniciar, pausar, entregar, marcarDesnecessaria, reverterDesnecessaria, ajustarTempo,
  criarSubtarefa, iniciarSubtarefa, concluirSubtarefa, reabrirSubtarefa, apagarSubtarefa,
} from "../acoes";
import { AbrirDock } from "@/componentes/AbrirDock";
import { AutoAtualiza } from "@/componentes/AutoAtualiza";
import { Rosto } from "@/componentes/SrMinutos";
import { Corpo, Animado } from "@/componentes/SrMinutos";
import { nomeTarefa, SEM_EVENTO } from "@/componentes/nome-tarefa";

export const dynamic = "force-dynamic";

// "Minhas atividades" (13/10, mockup aprovado pelo Daniel): não existe mais semana. Sem filtro
// aparece tudo que está aberto, por prazo, com as atrasadas sempre no topo -- tarefa vencida
// sumia quando a semana virava. Filtros por evento, tipo, entrega prevista e status, todos na
// URL; valem para a Lista e para o Kanban, nas minhas ou (líder) na frente inteira.

const CAMPOS_TAREFA = `id, atividade, titulo, status, estimativa_min, abre_em, prazo_em, concluida_em,
             escalado_id, dupla_id, responsavel_real_id, excecao_desc,
             frentes ( sigla, nome ),
             eventos ( competicao, data, evento_id_origem, confronto )`;

const TIPOS = ["materiais", "sincronizacao", "roteiro", "auditoria"] as const;
const PRAZOS = [
  ["atrasadas", "Atrasadas"], ["hoje", "Hoje"], ["2d", "Próx. 2 dias"], ["3d", "Próx. 3 dias"],
  ["semana", "Esta semana"], ["prox", "Próxima semana"],
] as const;
const ESTADOS = [["pendente", "Pendente"], ["fazendo", "Fazendo"], ["feita", "Feita"]] as const;
const ESTADOS_PADRAO = ["pendente", "fazendo"];

type Params = {
  evento?: string; tipo?: string; prazo?: string; de?: string; ate?: string; status?: string;
  ver?: string; quem?: string; busca?: string;
};

const lista = (csv?: string) => (csv ? csv.split(",").filter(Boolean) : []);
const alternar = (itens: string[], v: string) => (itens.includes(v) ? itens.filter((x) => x !== v) : [...itens, v]);

/** Janela de entrega prevista [de, até] em dias de Brasília, ou null (sem filtro de data). */
function janelaDe(sp: Params, hoje: string): [string, string] | null {
  const semana = semanaDe();
  switch (sp.prazo) {
    case "hoje": return [hoje, hoje];
    case "2d": return [hoje, somarDias(hoje, 2)];
    case "3d": return [hoje, somarDias(hoje, 3)];
    case "semana": return [semana.inicio, semana.fim];
    case "prox": { const p = deslocarSemana(semana.inicio, 1); return [p.inicio, p.fim]; }
  }
  if (sp.de || sp.ate) return [sp.de || "0000-01-01", sp.ate || "9999-12-31"];
  return null;
}

/** Acha tarefa de qualquer pessoa, pelo nome do jogo/competição ou pelo nome de quem
 * está escalado — pra alguém puxar pra si ou ajudar em conjunto (022 liberou a leitura). */
async function buscarTarefas(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, termo: string) {
  const { data: pessoasAchadas } = await supabase.from("pessoas").select("id").ilike("nome", `%${termo}%`);
  const idsPessoas = (pessoasAchadas ?? []).map((p) => p.id);
  const condicoes = [
    idsPessoas.length ? `escalado_id.in.(${idsPessoas.join(",")})` : null,
    idsPessoas.length ? `dupla_id.in.(${idsPessoas.join(",")})` : null,
    `eventos.evento_id_origem.ilike.%${termo}%`,
    `eventos.competicao.ilike.%${termo}%`,
    `eventos.confronto.ilike.%${termo}%`,
  ].filter(Boolean).join(",");

  return supabase
    .from("tarefas")
    .select(`id, atividade, titulo, status, estimativa_min, prazo_em, escalado_id, dupla_id,
             frentes ( sigla ), eventos!inner ( competicao, data, evento_id_origem, confronto )`)
    .in("status", ["pendente", "fora_do_prazo"])
    .or(condicoes)
    .order("prazo_em")
    .limit(25);
}

export default async function MinhasAtividades({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const hoje = hojeISO();
  const vista = sp.ver === "kanban" ? "kanban" : "lista";
  const tipos = lista(sp.tipo);
  const estados = sp.status !== undefined ? lista(sp.status) : ESTADOS_PADRAO;
  const janela = janelaDe(sp, hoje);
  const termoEvento = sp.evento?.trim().toLowerCase() ?? "";
  const temFiltro = Boolean(termoEvento || tipos.length || sp.prazo || sp.de || sp.ate || sp.status !== undefined);

  // Links: muda só o que foi pedido e guarda o resto. Valor vazio tira o parâmetro.
  const link = (mudar: Partial<Params>) => {
    const q = new URLSearchParams();
    const final: Params = { ...sp, ...mudar };
    for (const [k, v] of Object.entries(final)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/semana?${s}` : "/semana";
  };

  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome, papel").eq("auth_user_id", user!.id).single();
  const gestor = pessoa!.papel === "gestor";
  const lider = pessoa!.papel === "lider" || gestor;
  const daFrente = lider && sp.quem === "frente";

  // Escopo: as minhas (escalado, dupla ou quem entregou) ou, pro líder, as frentes dele
  // (gestor: todas as ativas mais as começadas do zero sem frente).
  const { data: minhasFrentes } = daFrente
    ? await (gestor ? supabase.from("frentes").select("id").eq("ativa", true)
                    : supabase.from("frentes").select("id").eq("lider_id", pessoa!.id))
    : { data: [] as { id: string }[] };
  const idsFrentes = (minhasFrentes ?? []).map((f) => f.id);
  const filtroEscopo = !daFrente
    ? `escalado_id.eq.${pessoa!.id},dupla_id.eq.${pessoa!.id},responsavel_real_id.eq.${pessoa!.id}`
    : gestor
      ? `frente_id.in.(${idsFrentes.join(",")}),and(frente_id.is.null,origem.eq.registrada)`
      : `frente_id.in.(${idsFrentes.join(",")})`;
  const escopoVazio = daFrente && idsFrentes.length === 0 && !gestor;

  // Abertas: todas, sem janela (é isso que impede a vencida de sumir). Feitas só quando o
  // filtro pede, e aí dentro da janela -- ou dos últimos 30 dias, sem janela.
  const querFeitas = estados.includes("feita");
  const [{ data: abertas }, { data: feitas }] = escopoVazio
    ? [{ data: [] }, { data: [] }]
    : await Promise.all([
      supabase.from("tarefas").select(CAMPOS_TAREFA).eq("status", "pendente").or(filtroEscopo).order("prazo_em").limit(600),
      querFeitas
        ? supabase.from("tarefas").select(CAMPOS_TAREFA).in("status", ["entregue", "fora_do_prazo", "na"]).or(filtroEscopo)
            .gte("prazo_em", `${janela ? janela[0] : somarDias(hoje, -30)}T00:00:00-03:00`)
            .lte("prazo_em", `${janela ? janela[1] : somarDias(hoje, 1)}T23:59:59-03:00`)
            .order("prazo_em").limit(300)
        : Promise.resolve({ data: [] }),
    ]);

  // Quem ajuda a tarefa de outra pessoa (puxou pela busca) tem sessão mas não é escalado nem
  // responsável -- sem isto ela nunca aparece de volta aqui. O mesmo vale para quem recebeu
  // uma parte (030) e ainda nem começou.
  const [{ data: sessoesMinhas }, { data: partesMinhas }] = await Promise.all([
    supabase.from("sessoes").select("tarefa_id").eq("pessoa_id", pessoa!.id),
    supabase.from("subtarefas").select("tarefa_id").eq("pessoa_id", pessoa!.id).eq("status", "pendente"),
  ]);
  const idsJaTem = new Set([...(abertas ?? []), ...(feitas ?? [])].map((t) => t.id));
  const idsAjudando = [...new Set([...(sessoesMinhas ?? []), ...(partesMinhas ?? [])].map((s) => s.tarefa_id))]
    .filter((id) => !idsJaTem.has(id));
  const { data: ajudando } = !daFrente && idsAjudando.length
    ? await supabase.from("tarefas").select(CAMPOS_TAREFA).eq("status", "pendente").in("id", idsAjudando)
    : { data: [] as typeof abertas };

  const tarefas = [...(abertas ?? []), ...(ajudando ?? []), ...(feitas ?? [])];
  const ids = tarefas.map((t) => t.id);

  const termo = sp.busca?.trim().replace(/[,()]/g, "");
  const { data: resultadosBusca } = termo ? await buscarTarefas(supabase, termo) : { data: [] };

  const { data: tempos } = ids.length
    ? await supabase.from("v_tempo_tarefa").select("*").in("tarefa_id", ids)
    : { data: [] as { tarefa_id: string; segundos_total: number; sessao_aberta_desde: string | null }[] };

  // O relógio agregado (v_tempo_tarefa) é por tarefa, não por pessoa -- correto pro total
  // (várias pessoas cronometram a mesma tarefa), errado pro botão: "Pausar" tem que fechar
  // A MINHA sessão, não mostrar rodando só porque outra pessoa está nela.
  const { data: sessoesDaTarefa } = ids.length
    ? await supabase.from("sessoes").select("tarefa_id, pessoa_id, inicio, fim, subtarefa_id").in("tarefa_id", ids)
    : { data: [] as { tarefa_id: string; pessoa_id: string; inicio: string; fim: string | null; subtarefa_id: string | null }[] };

  const [{ data: time }, { data: subtarefas }, { data: temposParte }] = await Promise.all([
    supabase.from("pessoas").select("id, nome").is("saida", null).order("nome"),
    ids.length
      ? supabase.from("subtarefas").select("id, tarefa_id, titulo, status, pessoa_id").in("tarefa_id", ids).order("created_at")
      : Promise.resolve({ data: [] as { id: string; tarefa_id: string; titulo: string; status: "pendente" | "feita"; pessoa_id: string }[] }),
    ids.length
      ? supabase.from("v_tempo_subtarefa").select("subtarefa_id, segundos").in("tarefa_id", ids)
      : Promise.resolve({ data: [] as { subtarefa_id: string; segundos: number }[] }),
  ]);
  const nomePor = new Map((time ?? []).map((p) => [p.id, p.nome]));
  const segundosParte = new Map((temposParte ?? []).map((t) => [t.subtarefa_id, Number(t.segundos)]));
  const tituloParte = new Map((subtarefas ?? []).map((s) => [s.id, s.titulo]));

  const porId = new Map((tempos ?? []).map((t) => [t.tarefa_id, t]));
  const sessoesPorTarefa = new Map<string, typeof sessoesDaTarefa>();
  (sessoesDaTarefa ?? []).forEach((s) => {
    const l = sessoesPorTarefa.get(s.tarefa_id) ?? [];
    l.push(s);
    sessoesPorTarefa.set(s.tarefa_id, l);
  });

  const agora = Date.now();
  const comTempo = tarefas.map((t) => {
    const sessoes = sessoesPorTarefa.get(t.id) ?? [];
    const minhaAberta = sessoes.find((s) => s.pessoa_id === pessoa!.id && !s.fim);
    const outrosRodando = [...new Set(
      sessoes.filter((s) => s.pessoa_id !== pessoa!.id && !s.fim).map((s) => nomePor.get(s.pessoa_id) ?? "alguém"),
    )];
    const contribuintes = [...new Set(sessoes.map((s) => s.pessoa_id))]
      .map((id) => ({
        nome: nomePor.get(id) ?? "—",
        segundos: sessoes.filter((s) => s.pessoa_id === id)
          .reduce((soma, s) => soma + (new Date(s.fim ?? Date.now()).getTime() - new Date(s.inicio).getTime()) / 1000, 0),
      }))
      .filter((c) => c.segundos > 0);

    const partes: Parte[] = (subtarefas ?? [])
      .filter((s) => s.tarefa_id === t.id)
      .map((s) => ({
        id: s.id,
        titulo: s.titulo,
        status: s.status,
        pessoa_id: s.pessoa_id,
        pessoa: nomePor.get(s.pessoa_id) ?? "—",
        segundos: segundosParte.get(s.id) ?? 0,
        rodandoPor: [...new Set(
          sessoes.filter((x) => x.subtarefa_id === s.id && !x.fim && x.pessoa_id !== pessoa!.id).map((x) => nomePor.get(x.pessoa_id) ?? "alguém"),
        )],
        minha: minhaAberta?.subtarefa_id === s.id,
      }));

    const correndo = minhaAberta?.inicio ?? null;
    const aberta = t.status === "pendente";
    return {
      ...t,
      frente: Array.isArray(t.frentes) ? t.frentes[0] : t.frentes,
      evento: Array.isArray(t.eventos) ? t.eventos[0] : t.eventos,
      segundos: Number(porId.get(t.id)?.segundos_total ?? 0),
      correndo,
      minhaParte: minhaAberta?.subtarefa_id ? tituloParte.get(minhaAberta.subtarefa_id) ?? null : null,
      outrosRodando,
      contribuintes,
      partes,
      diaPrazo: diaBRT(t.prazo_em),
      atrasada: aberta && new Date(t.prazo_em).getTime() < agora,
      fechada: aberta && t.abre_em > hoje,
      estado: !aberta ? "feita" : correndo || (daFrente && outrosRodando.length > 0) ? "fazendo" : "pendente",
    };
  });

  type Tarefa = (typeof comTempo)[number];
  const textoDe = (t: Tarefa) =>
    [t.titulo, t.evento?.confronto, t.evento?.competicao, t.evento?.evento_id_origem].filter(Boolean).join(" ").toLowerCase();
  const visiveis = comTempo.filter((t) => {
    if (!estados.includes(t.estado)) return false;
    if (tipos.length && !tipos.includes(t.atividade)) return false;
    if (termoEvento && !textoDe(t).includes(termoEvento)) return false;
    if (sp.prazo === "atrasadas") return t.atrasada;
    // Atrasada aparece sempre, qualquer que seja a janela (decisão do Daniel, 13/10).
    if (janela && !t.atrasada && (t.diaPrazo < janela[0] || t.diaPrazo > janela[1])) return false;
    return true;
  });

  // Vários cronômetros por pessoa (044): "em andamento" é lista, a mais recente primeiro.
  const emAndamento = visiveis.filter((t) => t.correndo)
    .sort((a, b) => new Date(b.correndo!).getTime() - new Date(a.correndo!).getTime());
  const abertasVisiveis = visiveis.filter((t) => t.status === "pendente" && !t.correndo);
  const atrasadas = abertasVisiveis.filter((t) => t.atrasada);
  const porDia = new Map<string, Tarefa[]>();
  abertasVisiveis.filter((t) => !t.atrasada).forEach((t) => porDia.set(t.diaPrazo, [...(porDia.get(t.diaPrazo) ?? []), t]));
  const dias = [...porDia.keys()].sort();
  const entregues = visiveis.filter((t) => t.status === "entregue" || t.status === "fora_do_prazo");
  const naoAplicaveis = visiveis.filter((t) => t.status === "na");
  const nAtrasadas = visiveis.filter((t) => t.atrasada).length;
  const minutosPrevistos = visiveis.filter((t) => t.status === "pendente").reduce((s, t) => s + t.estimativa_min, 0);

  // Fala do Sr. Minutos no cartão de andamento: regra fixa (docs/06), sobre a próxima de hoje.
  const venceHoje = porDia.get(hoje)?.[0];
  const falaSrMinutos = venceHoje ? `${venceHoje.titulo ?? ROTULO_ATIVIDADE[venceHoje.atividade] ?? venceHoje.atividade} vence hoje.` : undefined;
  const idsExistentes = new Set(ids);
  const resultados = (resultadosBusca ?? [])
    .map((r) => ({
      ...r,
      frente: Array.isArray(r.frentes) ? r.frentes[0] : r.frentes,
      evento: Array.isArray(r.eventos) ? r.eventos[0] : r.eventos,
    }))
    .filter((r) => !idsExistentes.has(r.id));

  const quadro: TarefaQuadro[] | null = vista !== "kanban" ? null : visiveis.map((t) => ({
    id: t.id, titulo: t.titulo, atividade: t.atividade, status: t.status,
    escalado_id: t.escalado_id, dupla_id: t.dupla_id, responsavel_real_id: t.responsavel_real_id,
    frente: t.frente ?? null, evento: t.evento ?? null, segundos: t.segundos,
    rodando: [...(t.correndo ? [pessoa!.nome] : []), ...t.outrosRodando],
  }));

  const linha = (t: Tarefa) => (
    <LinhaAberta key={t.id} t={t} euId={pessoa!.id} time={time ?? []} daFrente={daFrente} nomePor={nomePor} />
  );

  return (
    <div className={`p-6 px-8 flex flex-col gap-5 ${vista === "kanban" ? "max-w-[1280px]" : "max-w-[1080px]"}`}>
      <AutoAtualiza segundos={30} />
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[34px]">{daFrente ? "Atividades da frente" : "Minhas atividades"}</h1>
          <p className="text-[12.5px] text-tinta-3">
            <span className="num">{visiveis.length}</span> atividades{temFiltro ? " no filtro" : ""}
            {" · "}<span className={nAtrasadas ? "text-rosa font-medium" : ""}><span className="num">{nAtrasadas}</span> atrasadas</span>
            {" · "}<span className="num">{hhmm(minutosPrevistos)}</span> previstas em aberto
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav className="flex gap-1 rounded-[10px] bg-superficie-2 border border-linha p-1" aria-label="Como ver">
            <Aba href={link({ ver: undefined })} ativa={vista === "lista"}>Lista</Aba>
            <Aba href={link({ ver: "kanban" })} ativa={vista === "kanban"}>Quadro kanban</Aba>
          </nav>
          {lider && (
            <nav className="flex gap-1 rounded-[10px] bg-superficie-2 border border-linha p-1" aria-label="De quem">
              <Aba href={link({ quem: undefined })} ativa={!daFrente}>Minhas</Aba>
              <Aba href={link({ quem: "frente" })} ativa={daFrente}>Toda a frente</Aba>
            </nav>
          )}
          <AbrirDock />
        </div>
      </header>

      <section aria-label="Filtros" className="flex flex-col gap-3 rounded-[14px] bg-superficie border border-linha p-4">
        <form method="GET" className="flex flex-wrap items-center gap-2">
          {Object.entries(sp).filter(([k, v]) => v && !["evento", "de", "ate", "prazo"].includes(k))
            .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <label htmlFor="f-evento" className={ROTULO}>Evento</label>
          <input id="f-evento" type="search" name="evento" defaultValue={sp.evento ?? ""}
            placeholder="Jogo ou competição, ex.: Corinthians"
            className="flex-1 min-w-[200px] min-h-9 px-3 rounded-[9px] border border-linha bg-fundo text-[12.5px]" />
          <span className="text-[12px] text-tinta-3">entrega de</span>
          <input type="date" name="de" defaultValue={sp.de ?? ""} aria-label="Entrega a partir de"
            className="min-h-9 px-2 rounded-[9px] border border-linha bg-fundo text-[12.5px]" />
          <span className="text-[12px] text-tinta-3">até</span>
          <input type="date" name="ate" defaultValue={sp.ate ?? ""} aria-label="Entrega até"
            className="min-h-9 px-2 rounded-[9px] border border-linha bg-fundo text-[12.5px]" />
          <button type="submit" className="min-h-9 px-3.5 rounded-[9px] border border-linha bg-elevado text-[12.5px] font-medium hover:bg-linha transition">
            Filtrar
          </button>
        </form>
        <div className="flex flex-wrap items-center gap-2">
          <span className={ROTULO}>Tipo</span>
          {TIPOS.map((v) => (
            <Chip key={v} href={link({ tipo: alternar(tipos, v).join(",") })} ativo={tipos.includes(v)}>{ROTULO_ATIVIDADE[v]}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={ROTULO}>Entrega prevista</span>
          {PRAZOS.map(([v, r]) => (
            <Chip key={v} href={link({ prazo: sp.prazo === v ? undefined : v, de: undefined, ate: undefined })}
              ativo={sp.prazo === v} rosa={v === "atrasadas"}>{r}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={ROTULO}>Status</span>
          {ESTADOS.map(([v, r]) => (
            <Chip key={v} href={link({ status: alternar(estados, v).join(",") || "nenhum" })} ativo={estados.includes(v)}>{r}</Chip>
          ))}
          {temFiltro && (
            <Link href={link({ evento: undefined, tipo: undefined, prazo: undefined, de: undefined, ate: undefined, status: undefined })}
              className="ml-auto text-[12px] text-tinta-3 underline hover:text-tinta-2">Limpar filtros</Link>
          )}
        </div>
      </section>

      {quadro && (
        quadro.length === 0
          ? <Vazio>Nenhuma atividade com esses filtros.</Vazio>
          : <QuadroKanban tarefas={quadro} nomePor={nomePor} />
      )}

      {!quadro && emAndamento.map((emCurso, i) => (
        <div key={emCurso.id} className={`relative ${i === 0 ? "mt-[118px]" : ""} flex items-center gap-5 rounded-xl bg-verde-fundo border border-verde-borda px-5 py-4`}>
          {i === 0 && <Corpo pose="apontando" altura={116} fala={falaSrMinutos} className="right-10 bottom-[calc(100%-6px)]" />}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-verde-claro">
              <Rosto estado="verde" tamanho={16} />Em andamento{emAndamento.length > 1 ? ` · ${i + 1} de ${emAndamento.length}` : ""}
              {emCurso.atrasada && <PrazoVenceu dia={emCurso.diaPrazo} />}
            </span>
            <span className="text-[16px] font-semibold tracking-[-0.01em]">
              {nomeTarefa(emCurso, "nome")}
            </span>
            <span className="text-[12px] text-tinta-3 truncate">
              {emCurso.evento ? <>evento {diaCurto(emCurso.evento.data)}</> : SEM_EVENTO} · entrega até {diaCurto(emCurso.diaPrazo)}
            </span>
            {emCurso.minhaParte && (
              <span className="text-[12px] text-verde-claro truncate">parte: {emCurso.minhaParte}</span>
            )}
            {emCurso.outrosRodando.length > 0 && (
              <span className="text-[11px] text-verde-claro truncate">
                {emCurso.outrosRodando.join(", ")} também {emCurso.outrosRodando.length > 1 ? "estão" : "está"} nisso agora
              </span>
            )}
          </div>
          <div className="flex flex-col items-end">
            <Relogio desde={emCurso.correndo!} baseSeg={emCurso.segundos} />
            <span className="num text-[11px] text-tinta-4">de {hhmm(emCurso.estimativa_min)}</span>
          </div>
          <div className="flex gap-2">
            <form action={pausar.bind(null, emCurso.id)}>
              <Submit ocupado="..." className="flex items-center gap-2 min-h-[42px] px-3.5 rounded-[9px] border border-linha bg-elevado text-[12.5px] font-medium hover:bg-linha transition">
                Pausar
              </Submit>
            </form>
            <DialogoEntrega
              acao={entregar.bind(null, emCurso.id)}
              titulo={`${nomeTarefa(emCurso)}`}
              subtitulo={emCurso.evento ? `evento ${diaCurto(emCurso.evento.data)}` : SEM_EVENTO}
              segundosMedidos={emCurso.segundos}
              estimativaMin={emCurso.estimativa_min}
              escaladoId={emCurso.escalado_id}
              duplaId={emCurso.dupla_id}
              euId={pessoa!.id}
              time={time ?? []}
              contribuintes={emCurso.contribuintes}
              atrasada={emCurso.atrasada}
              rotuloBotao="Entregar"
              classeBotao="flex items-center gap-2 min-h-[42px] px-3.5 rounded-[9px] bg-verde text-verde-ink text-[12.5px] font-semibold hover:brightness-110 transition"
            />
            <DialogoPartes
              titulo={`${nomeTarefa(emCurso)}`}
              partes={emCurso.partes} time={time ?? []} euId={pessoa!.id}
              criar={criarSubtarefa.bind(null, emCurso.id)}
              iniciar={iniciarSubtarefa} concluir={concluirSubtarefa} reabrir={reabrirSubtarefa} apagar={apagarSubtarefa}
            />
          </div>
        </div>
      ))}

      {!quadro && (<>
      {visiveis.length === 0 && (temFiltro
        ? <Vazio>Nenhuma atividade com esses filtros. Use “Limpar filtros” para voltar a ver tudo.</Vazio>
        : <VazioComEle pose="ferias" titulo="Hoje não tem nada aberto." texto="Nenhuma atividade pendente. Vai viver." />)}

      {atrasadas.length > 0 && (
        <Secao titulo="Atrasadas" contagem={`${atrasadas.length}`} rosa>{atrasadas.map(linha)}</Secao>
      )}

      {dias.map((dia) => (
        <Secao key={dia} contagem={`${porDia.get(dia)!.length}`}
          titulo={dia === hoje ? "Vence hoje" : dia === somarDias(hoje, 1) ? `Amanhã · ${diaCurto(dia)}` : `Vence ${diaCurto(dia)}`}>
          {porDia.get(dia)!.map(linha)}
        </Secao>
      ))}

      {entregues.length > 0 && (
        <Secao titulo="Entregues" contagem={`${entregues.length} · ${tempoLegivel(entregues.reduce((s, t) => s + t.segundos, 0))}`}>
          {entregues.map((t) => (
            <Linha key={t.id} apagada>
              <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium shrink-0 ${
                t.status === "fora_do_prazo" ? "bg-rosa-fundo border-rosa-borda text-rosa" : "bg-verde-fundo border-verde-borda text-verde-claro"}`}>
                <Rosto estado={t.status === "fora_do_prazo" ? "rosa" : "verde"} />
                {t.status === "fora_do_prazo" ? "Entregue fora do prazo" : "Entregue"}
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-[13.5px] text-tinta-2">
                  {nomeTarefa(t, "nome")}
                </span>
                <span className="text-[11.5px] text-tinta-4 truncate">
                  {t.evento ? `evento ${diaCurto(t.evento.data)}` : SEM_EVENTO}
                  {daFrente ? ` · ${escaladosDe(nomePor, t.escalado_id, t.dupla_id)}` : ""}
                </span>
              </div>
              <TempoParado segundos={t.segundos} estimativaMin={t.estimativa_min} />
              <DialogoAjuste
                acao={ajustarTempo.bind(null, t.id)}
                titulo={`${nomeTarefa(t)}`}
              />
            </Linha>
          ))}
        </Secao>
      )}

      {naoAplicaveis.length > 0 && (
        <Secao titulo="Não aplicável" contagem={`${naoAplicaveis.length}`}>
          {naoAplicaveis.map((t) => (
            <Linha key={t.id} apagada>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-elevado border border-linha-2 px-2.5 py-1 text-[11px] font-medium text-tinta-4 shrink-0">
                <Rosto estado="cinza" />
                não necessária
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-[13.5px] text-tinta-3 line-through decoration-tinta-4">
                  {nomeTarefa(t, "nome")}
                </span>
                <span className="text-[11.5px] text-tinta-4 truncate">
                  {t.evento ? `evento ${diaCurto(t.evento.data)}` : SEM_EVENTO}{t.excecao_desc ? ` · ${t.excecao_desc}` : ""}
                </span>
              </div>
              <form action={reverterDesnecessaria.bind(null, t.id)}>
                <Submit ocupado="..." className="min-h-8 px-2.5 rounded-md border border-linha bg-superficie-2 text-[11.5px] text-tinta-3 hover:text-tinta-2 transition">
                  desfazer
                </Submit>
              </form>
            </Linha>
          ))}
        </Secao>
      )}

      <section className="flex flex-col gap-2 pt-2">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-tinta-3">Ajudar alguém</h2>
        <form method="GET" className="flex gap-2">
          {Object.entries(sp).filter(([k, v]) => v && k !== "busca")
            .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
          <input
            type="text" name="busca" defaultValue={sp.busca ?? ""} placeholder="nome do jogo, da competição ou de alguém do time"
            className="flex-1 min-h-9 px-3 rounded-[9px] border border-linha bg-superficie text-[12.5px]"
          />
          <button type="submit" className="min-h-9 px-3.5 rounded-[9px] border border-linha bg-elevado text-[12.5px] font-medium hover:bg-linha transition">
            Buscar
          </button>
        </form>

        {termo && resultados.length === 0 && (
          <Vazio>Nada pendente com &quot;{termo}&quot; no jogo, na competição ou no nome de quem está escalado.</Vazio>
        )}

        {resultados.map((t) => (
          <Linha key={t.id}>
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <span className="text-[13.5px] font-medium">
                {nomeTarefa(t, "sigla")}
              </span>
              <span className="text-[11.5px] text-tinta-3 truncate">
                {t.evento ? <>evento {diaCurto(t.evento.data)}</> : SEM_EVENTO} · escalado: {escaladosDe(nomePor, t.escalado_id, t.dupla_id)}
              </span>
            </div>
            <form action={iniciar.bind(null, t.id)} className="shrink-0">
              <Submit ocupado="..." className="flex items-center gap-2 min-h-[38px] px-3.5 rounded-[9px] border border-verde-borda bg-verde-fundo text-verde-claro text-[12.5px] font-medium hover:brightness-125 transition">
                Puxar pra mim
              </Submit>
            </form>
          </Linha>
        ))}
      </section>
      </>)}
    </div>
  );
}

const ROTULO = "min-w-[120px] text-[10.5px] font-semibold uppercase tracking-[0.1em] text-tinta-3";

/** Tarefa aberta (pausada ou não começada) na lista: mesma linha em qualquer grupo. */
function LinhaAberta({ t, euId, time, daFrente, nomePor }: {
  t: {
    id: string; atividade: string; titulo: string | null; status: string; estimativa_min: number;
    escalado_id: string; dupla_id: string | null; abre_em: string; diaPrazo: string;
    atrasada: boolean; fechada: boolean; segundos: number; outrosRodando: string[];
    contribuintes: { nome: string; segundos: number }[]; partes: Parte[];
    frente?: { sigla: string; nome?: string } | null;
    evento?: { competicao: string; data: string; evento_id_origem: string | null; confronto: string | null } | null;
  };
  euId: string; time: { id: string; nome: string }[]; daFrente: boolean; nomePor: Map<string, string>;
}) {
  const pausada = t.segundos > 0;
  return (
    <Linha pausada={pausada && !t.atrasada} destaque={t.atrasada}>
      {pausada ? (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-ambar-fundo border border-ambar-borda px-2.5 py-1 text-[11px] font-medium text-ambar shrink-0">
          <Rosto estado="ambar" />Pausada
        </span>
      ) : <Etiqueta atrasada={t.atrasada} fechada={t.fechada} abre={t.abre_em} />}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <span className="text-[13.5px] font-medium">{nomeTarefa(t, daFrente ? "sigla" : "nome")}</span>
        <span className="text-[11.5px] text-tinta-3 truncate">
          {t.evento ? <>evento {diaCurto(t.evento.data)}</> : SEM_EVENTO} ·{" "}
          {t.atrasada ? "prazo venceu" : "entrega até"} {diaCurto(t.diaPrazo)}
          {daFrente ? ` · ${escaladosDe(nomePor, t.escalado_id, t.dupla_id)}` : ""}
        </span>
        {t.outrosRodando.length > 0 && (
          <span className="text-[11px] text-verde-claro truncate">
            {t.outrosRodando.join(", ")} também {t.outrosRodando.length > 1 ? "estão" : "está"} nisso agora
          </span>
        )}
      </div>
      <TempoParado segundos={t.segundos} estimativaMin={t.estimativa_min} />
      <div className="flex gap-2 shrink-0">
        <form action={iniciar.bind(null, t.id)}>
          <Submit ocupado="..." disabled={t.fechada} className={`flex items-center gap-2 min-h-[38px] px-3.5 rounded-[9px] border text-[12.5px] font-medium transition disabled:cursor-not-allowed ${
            pausada ? "border-verde-borda bg-verde-fundo text-verde-claro hover:brightness-125" : "border-linha bg-elevado hover:bg-linha"}`}>
            {pausada ? "Retomar" : "Iniciar"}
          </Submit>
        </form>
        <DialogoEntrega
          acao={entregar.bind(null, t.id)}
          titulo={`${nomeTarefa(t)}`}
          subtitulo={t.evento ? `evento ${diaCurto(t.evento.data)}` : SEM_EVENTO}
          segundosMedidos={t.segundos}
          estimativaMin={t.estimativa_min}
          escaladoId={t.escalado_id}
          duplaId={t.dupla_id}
          euId={euId}
          time={time}
          contribuintes={t.contribuintes}
          atrasada={t.atrasada}
          rotuloBotao="Entregar"
          classeBotao={pausada
            ? "min-h-[38px] px-3.5 rounded-[9px] bg-verde text-verde-ink text-[12.5px] font-semibold hover:brightness-110 transition"
            : "min-h-[38px] px-3 rounded-[9px] border border-linha bg-superficie-2 text-[12.5px] text-tinta-3 hover:text-tinta-2 transition"}
        />
        <DialogoDesnecessaria acao={marcarDesnecessaria.bind(null, t.id)} titulo={`${nomeTarefa(t)}`} />
        <DialogoAjuste acao={ajustarTempo.bind(null, t.id)} titulo={`${nomeTarefa(t)}`} />
        <DialogoPartes
          titulo={`${nomeTarefa(t)}`}
          partes={t.partes} time={time} euId={euId}
          criar={criarSubtarefa.bind(null, t.id)}
          iniciar={iniciarSubtarefa} concluir={concluirSubtarefa} reabrir={reabrirSubtarefa} apagar={apagarSubtarefa}
        />
      </div>
    </Linha>
  );
}

function Secao({ titulo, contagem, rosa, children }: { titulo: string; contagem: string; rosa?: boolean; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2.5">
        <h2 className={`text-[11.5px] font-semibold uppercase tracking-[0.1em] ${rosa ? "text-rosa" : "text-tinta-3"}`}>{titulo}</h2>
        <span className="num text-[11.5px] text-tinta-4">{contagem}</span>
      </div>
      {children}
    </section>
  );
}

function Linha({ children, destaque, apagada, pausada }: { children: React.ReactNode; destaque?: boolean; apagada?: boolean; pausada?: boolean }) {
  return (
    <div className={`flex items-center gap-3.5 rounded-[10px] px-4 py-3 border ${
      pausada ? "bg-elevado border-ambar-borda" : destaque ? "bg-rosa-fundo border-rosa-borda" : apagada ? "bg-superficie-2 border-linha-2" : "bg-superficie border-linha"
    }`}>
      {children}
    </div>
  );
}

function PrazoVenceu({ dia }: { dia: string }) {
  return (
    <span className="ml-2 inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium align-middle bg-rosa-fundo border-rosa-borda text-rosa">
      prazo venceu {diaCurto(dia)}
    </span>
  );
}

function Etiqueta({ atrasada, fechada, abre }: { atrasada: boolean; fechada: boolean; abre: string }) {
  if (fechada) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-linha px-2.5 py-1 text-[11px] font-medium shrink-0 text-tinta-3">
        <Rosto estado="cinza" />abre {diaCurto(abre)}
      </span>
    );
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium shrink-0 ${
      atrasada ? "bg-rosa-fundo border-rosa-borda text-rosa" : "bg-elevado border-linha text-tinta-2"}`}>
      <Rosto estado={atrasada ? "rosa" : "creme"} />
      {atrasada ? "Fora do prazo" : "Pendente"}
    </span>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[10px] border border-dashed border-linha px-4 py-5 text-[12.5px] text-tinta-4">{children}</p>;
}

function VazioComEle({ pose, titulo, texto }: { pose: "ferias" | "triste"; titulo: string; texto: string }) {
  return (
    <div className="flex items-end">
      <div className="hidden sm:block shrink-0 -mr-8 z-[2]"><Animado pose={pose} altura={170} /></div>
      <div className="flex-1 min-w-0 rounded-[14px] bg-superficie border border-linha px-6 py-5 sm:pl-12 flex flex-col gap-1.5">
        <b className="font-display text-[24px] font-extrabold uppercase leading-[0.95]">{titulo}</b>
        <p className="text-[12.5px] text-tinta-3">{texto}</p>
      </div>
    </div>
  );
}
