import { criarClienteServidor } from "@/lib/supabase/server";
import { Seta } from "@/componentes/Seta";
import { Aba } from "@/componentes/Aba";
import { QuadroKanban, type TarefaQuadro } from "@/componentes/QuadroKanban";
import { tarefasDaFrente } from "@/lib/quadro";
import { semanaDe, deslocarSemana, rotuloSemana, diaCurto, hhmm, tempoLegivel, ROTULO_ATIVIDADE, escaladosDe } from "@/lib/semana";
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

const CAMPOS_TAREFA = `id, atividade, titulo, status, estimativa_min, abre_em, prazo_em, concluida_em,
             escalado_id, dupla_id, responsavel_real_id, excecao_desc,
             frentes ( sigla, nome ),
             eventos ( competicao, data, evento_id_origem, confronto )`;

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

export default async function MinhaSemana({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; busca?: string; ver?: string; quem?: string }>;
}) {
  const sp = await searchParams;
  const { inicio, fim } = sp.semana ? deslocarSemana(sp.semana, 0) : semanaDe();
  const anterior = deslocarSemana(inicio, -1).inicio;
  const proxima = deslocarSemana(inicio, 1).inicio;
  // Lista (padrão) ou "Quadro kanban" (06/10): as minhas tarefas em colunas; o líder pode
  // trocar pra toda a frente. Os links guardam a semana e a vista.
  const vista = sp.ver === "kanban" ? "kanban" : "lista";
  const link = (p: { semana?: string; ver?: string; quem?: string }) => {
    const q = new URLSearchParams();
    const semana = "semana" in p ? p.semana : sp.semana;
    const ver = "ver" in p ? p.ver : (vista === "kanban" ? "kanban" : undefined);
    const quem = "quem" in p ? p.quem : sp.quem;
    if (semana) q.set("semana", semana);
    if (ver) q.set("ver", ver);
    if (ver === "kanban" && quem) q.set("quem", quem);
    const s = q.toString();
    return s ? `/semana?${s}` : "/semana";
  };

  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome, papel").eq("auth_user_id", user!.id).single();
  const lider = pessoa!.papel === "lider" || pessoa!.papel === "gestor";
  const quadroDaFrente = vista === "kanban" && lider && sp.quem === "frente";

  const { data: minhas } = await supabase
    .from("tarefas")
    .select(CAMPOS_TAREFA)
    .lte("abre_em", fim)
    .gte("prazo_em", `${inicio}T00:00:00Z`)
    .or(`escalado_id.eq.${pessoa!.id},dupla_id.eq.${pessoa!.id},responsavel_real_id.eq.${pessoa!.id}`)
    .order("prazo_em");

  // Quem ajuda a tarefa de outra pessoa (puxou pela busca) tem sessao mas nao e
  // escalado nem responsavel -- sem isto ela nunca aparece de volta aqui. O mesmo vale
  // para quem recebeu uma parte (030) e ainda nem comecou.
  const [{ data: sessoesMinhas }, { data: partesMinhas }] = await Promise.all([
    supabase.from("sessoes").select("tarefa_id, fim").eq("pessoa_id", pessoa!.id),
    supabase.from("subtarefas").select("tarefa_id").eq("pessoa_id", pessoa!.id).eq("status", "pendente"),
  ]);
  const idsComSessao = [...new Set([...(sessoesMinhas ?? []), ...(partesMinhas ?? [])].map((s) => s.tarefa_id))];
  const idsJaTem = new Set((minhas ?? []).map((t) => t.id));
  const idsAjudando = idsComSessao.filter((id) => !idsJaTem.has(id));
  const { data: ajudando } = idsAjudando.length
    ? await supabase.from("tarefas").select(CAMPOS_TAREFA)
        .lte("abre_em", fim).gte("prazo_em", `${inicio}T00:00:00Z`).in("id", idsAjudando)
    : { data: [] as typeof minhas };

  // Nada que esteja rodando pode ficar invisível (06/10): a Julia ligou o cronômetro pelo
  // notch em tarefas vencidas de semanas atrás e a semana atual não mostrava nada. Tarefa
  // pendente em que EU tenho sessão aberta, ou fechada hoje, entra aqui mesmo fora da janela,
  // marcada. Amanhã, sem mexer, volta a aparecer só na semana dela.
  const hojeBRT = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const inicioHoje = new Date(`${hojeBRT}T00:00:00-03:00`).toISOString();
  const idsTocadasHoje = [...new Set((sessoesMinhas ?? []).filter((s) => !s.fim || s.fim >= inicioHoje).map((s) => s.tarefa_id))];
  const idsNaTela = new Set([...idsJaTem, ...(ajudando ?? []).map((t) => t.id)]);
  const idsForaDaJanela = idsTocadasHoje.filter((id) => !idsNaTela.has(id));
  const { data: foraDaJanela } = idsForaDaJanela.length
    ? await supabase.from("tarefas").select(CAMPOS_TAREFA).eq("status", "pendente").in("id", idsForaDaJanela)
    : { data: [] as typeof minhas };
  const idsFora = new Set((foraDaJanela ?? []).map((t) => t.id));

  const tarefas = [...(minhas ?? []), ...(ajudando ?? []), ...(foraDaJanela ?? [])];
  const ids = tarefas.map((t) => t.id);

  const termo = sp.busca?.trim().replace(/[,()]/g, "");
  const { data: resultadosBusca } = termo ? await buscarTarefas(supabase, termo) : { data: [] };

  const { data: tempos } = ids.length
    ? await supabase.from("v_tempo_tarefa").select("*").in("tarefa_id", ids)
    : { data: [] as { tarefa_id: string; segundos_total: number; sessao_aberta_desde: string | null }[] };

  // O relogio agregado (v_tempo_tarefa) e por tarefa, nao por pessoa -- correto pro
  // total (varias pessoas cronometram a mesma tarefa), errado pro botao: "Pausar" tem
  // que fechar A MINHA sessao, nao mostrar rodando so porque outra pessoa esta nela.
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
    const lista = sessoesPorTarefa.get(s.tarefa_id) ?? [];
    lista.push(s);
    sessoesPorTarefa.set(s.tarefa_id, lista);
  });

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

    return {
      ...t,
      frente: Array.isArray(t.frentes) ? t.frentes[0] : t.frentes,
      evento: Array.isArray(t.eventos) ? t.eventos[0] : t.eventos,
      segundos: Number(porId.get(t.id)?.segundos_total ?? 0),
      correndo: minhaAberta?.inicio ?? null,
      minhaParte: minhaAberta?.subtarefa_id ? tituloParte.get(minhaAberta.subtarefa_id) ?? null : null,
      outrosRodando,
      contribuintes,
      partes,
      foraDaJanela: idsFora.has(t.id),
    };
  });

  // Vários cronômetros por pessoa (044): "em andamento" é lista, a mais recente primeiro.
  const emAndamento = comTempo.filter((t) => t.correndo)
    .sort((a, b) => new Date(b.correndo!).getTime() - new Date(a.correndo!).getTime());
  const paradas = comTempo.filter((t) => t.status === "pendente" && !t.correndo);
  const pausadas = paradas.filter((t) => t.segundos > 0);
  const pendentes = paradas.filter((t) => t.segundos <= 0);
  const entregues = comTempo.filter((t) => t.status === "entregue" || t.status === "fora_do_prazo");
  const naoAplicaveis = comTempo.filter((t) => t.status === "na");
  const daSemana = comTempo.filter((t) => !t.foraDaJanela);
  const horasPrevistas = daSemana.reduce((s, t) => s + t.estimativa_min, 0);
  const segundosFeitos = daSemana.reduce((s, t) => s + t.segundos, 0);
  const agora = Date.now();
  // Fala do Sr. Minutos no cartão de andamento: regra fixa (docs/06), sobre a próxima de hoje.
  const venceHoje = pendentes.find((t) => t.prazo_em.slice(0, 10) === hojeBRT);
  const falaSrMinutos = venceHoje ? `${venceHoje.titulo ?? ROTULO_ATIVIDADE[venceHoje.atividade] ?? venceHoje.atividade} vence hoje.` : undefined;
  const idsExistentes = new Set(ids);
  const resultados = (resultadosBusca ?? [])
    .map((r) => ({
      ...r,
      frente: Array.isArray(r.frentes) ? r.frentes[0] : r.frentes,
      evento: Array.isArray(r.eventos) ? r.eventos[0] : r.eventos,
    }))
    .filter((r) => !idsExistentes.has(r.id));

  // Quadro kanban: as minhas tarefas (as mesmas da lista) ou, pro líder, toda a frente.
  const quadroMinhas: TarefaQuadro[] = comTempo.map((t) => ({
    id: t.id, titulo: t.titulo, atividade: t.atividade, status: t.status,
    escalado_id: t.escalado_id, dupla_id: t.dupla_id, responsavel_real_id: t.responsavel_real_id,
    frente: t.frente ?? null, evento: t.evento ?? null, segundos: t.segundos,
    rodando: [...(t.correndo ? [pessoa!.nome] : []), ...t.outrosRodando],
  }));
  const quadro = vista !== "kanban" ? null
    : quadroDaFrente ? (await tarefasDaFrente(supabase, pessoa!, inicio, fim, nomePor)) ?? quadroMinhas
    : quadroMinhas;

  return (
    <div className={`p-6 px-8 flex flex-col gap-5 ${vista === "kanban" ? "max-w-[1280px]" : "max-w-[1080px]"}`}>
      <AutoAtualiza segundos={30} />
      <header className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[34px]">Minha semana</h1>
          <p className="text-[12.5px] text-tinta-3">
            {rotuloSemana(inicio, fim)} · {quadroDaFrente && quadro
              ? <>{quadro.length} tarefas da frente</>
              : <>{comTempo.length} tarefas · {tempoLegivel(segundosFeitos)} de {hhmm(horasPrevistas)}</>}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <nav className="flex gap-1 rounded-[10px] bg-superficie-2 border border-linha p-1" aria-label="Como ver">
            <Aba href={link({ ver: undefined })} ativa={vista === "lista"}>Lista</Aba>
            <Aba href={link({ ver: "kanban" })} ativa={vista === "kanban"}>Quadro kanban</Aba>
          </nav>
          {vista === "kanban" && lider && (
            <nav className="flex gap-1 rounded-[10px] bg-superficie-2 border border-linha p-1" aria-label="De quem">
              <Aba href={link({ quem: undefined })} ativa={!quadroDaFrente}>Minhas</Aba>
              <Aba href={link({ quem: "frente" })} ativa={quadroDaFrente}>Toda a frente</Aba>
            </nav>
          )}
          <AbrirDock />
          <Seta href={link({ semana: anterior })} rotulo="Semana anterior">‹</Seta>
          <Seta href={link({ semana: undefined })} rotulo="Semana atual">hoje</Seta>
          <Seta href={link({ semana: proxima })} rotulo="Próxima semana">›</Seta>
        </div>
      </header>

      {quadro && (
        quadro.length === 0
          ? <Vazio>{quadroDaFrente ? "Nenhuma tarefa da frente nesta semana." : "Nenhuma tarefa sua nesta semana."}</Vazio>
          : <QuadroKanban tarefas={quadro} nomePor={nomePor} />
      )}

      {!quadro && emAndamento.map((emCurso, i) => (
        <div key={emCurso.id} className={`relative ${i === 0 ? "mt-[118px]" : ""} flex items-center gap-5 rounded-xl bg-verde-fundo border border-verde-borda px-5 py-4`}>
          {i === 0 && <Corpo pose="apontando" altura={116} fala={falaSrMinutos} className="right-10 bottom-[calc(100%-6px)]" />}
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-verde-claro">
              <Rosto estado="verde" tamanho={16} />Em andamento{emAndamento.length > 1 ? ` · ${i + 1} de ${emAndamento.length}` : ""}
              {emCurso.foraDaJanela && <OutraSemana prazo={emCurso.prazo_em} />}
            </span>
            <span className="text-[16px] font-semibold tracking-[-0.01em]">
              {nomeTarefa(emCurso, "nome")}
            </span>
            <span className="text-[12px] text-tinta-3 truncate">
              {emCurso.evento ? <>evento {diaCurto(emCurso.evento.data)}</> : SEM_EVENTO}
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
              atrasada={new Date(emCurso.prazo_em).getTime() < agora}
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
      {pausadas.length > 0 && (
        <Secao titulo="Pausadas" contagem={`${pausadas.length} · ${tempoLegivel(pausadas.reduce((s, t) => s + t.segundos, 0))} ja contados`}>
          {pausadas.map((t) => (
            <Linha key={t.id} pausada>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-ambar-fundo border border-ambar-borda px-2.5 py-1 text-[11px] font-medium text-ambar shrink-0">
                <Rosto estado="ambar" />
                Pausada
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-[13.5px] font-medium">
                  {nomeTarefa(t, "nome")}
                  {t.foraDaJanela && <OutraSemana prazo={t.prazo_em} />}
                </span>
                <span className="text-[11.5px] text-tinta-3 truncate">
                  {t.evento ? `evento ${diaCurto(t.evento.data)}` : SEM_EVENTO} · entrega até {diaCurto(t.prazo_em.slice(0, 10))}
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
                  <Submit ocupado="..." className="flex items-center gap-2 min-h-[38px] px-3.5 rounded-[9px] border border-verde-borda bg-verde-fundo text-verde-claro text-[12.5px] font-medium hover:brightness-125 transition">
                    Retomar
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
                  euId={pessoa!.id}
                  time={time ?? []}
                  contribuintes={t.contribuintes}
                  atrasada={new Date(t.prazo_em).getTime() < agora}
                  rotuloBotao="Entregar"
                  classeBotao="min-h-[38px] px-3.5 rounded-[9px] bg-verde text-verde-ink text-[12.5px] font-semibold hover:brightness-110 transition"
                />
                <DialogoDesnecessaria
                  acao={marcarDesnecessaria.bind(null, t.id)}
                  titulo={`${nomeTarefa(t)}`}
                />
                <DialogoAjuste
                  acao={ajustarTempo.bind(null, t.id)}
                  titulo={`${nomeTarefa(t)}`}
                />
                <DialogoPartes
                  titulo={`${nomeTarefa(t)}`}
                  partes={t.partes} time={time ?? []} euId={pessoa!.id}
                  criar={criarSubtarefa.bind(null, t.id)}
                  iniciar={iniciarSubtarefa} concluir={concluirSubtarefa} reabrir={reabrirSubtarefa} apagar={apagarSubtarefa}
                />
              </div>
            </Linha>
          ))}
        </Secao>
      )}

      {emAndamento.length === 0 && segundosFeitos === 0 && pendentes.length > 0 && (
        <VazioComEle pose="triste" titulo="Ninguém ligou o cronômetro essa semana."
          texto={`Sem número eu não sirvo pra nada. ${pendentes.length === 1 ? "Tem 1 tarefa aberta" : `Tem ${pendentes.length} tarefas abertas`} pra você. Esqueceu de marcar? Ajuste o tempo com o motivo, vale mais do que nada.`} />
      )}

      <Secao titulo="Pendentes" contagem={`${pendentes.length}`}>
        {pendentes.length === 0 && <VazioComEle pose="ferias" titulo="Hoje não tem nada aberto." texto="Nada pendente nesta semana. Vai viver." />}
        {pendentes.map((t) => {
          const atrasada = new Date(t.prazo_em).getTime() < agora;
          return (
            <Linha key={t.id} destaque={atrasada}>
              <Etiqueta atrasada={atrasada} />
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-[13.5px] font-medium">
                  {nomeTarefa(t, "nome")}
                </span>
                <span className="text-[11.5px] text-tinta-3 truncate">
                  {t.evento ? <>evento {diaCurto(t.evento.data)}</> : SEM_EVENTO} ·{" "}
                  {atrasada ? "prazo venceu" : "entrega até"} {diaCurto(t.prazo_em.slice(0, 10))}
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
                  <Submit ocupado="..." className="flex items-center gap-2 min-h-[38px] px-3.5 rounded-[9px] border border-linha bg-elevado text-[12.5px] font-medium hover:bg-linha transition">
                    Iniciar
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
                  euId={pessoa!.id}
                  time={time ?? []}
                  contribuintes={t.contribuintes}
                  atrasada={atrasada}
                  rotuloBotao="Entregar"
                  classeBotao="min-h-[38px] px-3 rounded-[9px] border border-linha bg-superficie-2 text-[12.5px] text-tinta-3 hover:text-tinta-2 transition"
                />
                <DialogoDesnecessaria
                  acao={marcarDesnecessaria.bind(null, t.id)}
                  titulo={`${nomeTarefa(t)}`}
                />
                <DialogoAjuste
                  acao={ajustarTempo.bind(null, t.id)}
                  titulo={`${nomeTarefa(t)}`}
                />
                <DialogoPartes
                  titulo={`${nomeTarefa(t)}`}
                  partes={t.partes} time={time ?? []} euId={pessoa!.id}
                  criar={criarSubtarefa.bind(null, t.id)}
                  iniciar={iniciarSubtarefa} concluir={concluirSubtarefa} reabrir={reabrirSubtarefa} apagar={apagarSubtarefa}
                />
              </div>
            </Linha>
          );
        })}
      </Secao>

      {entregues.length > 0 && (
        <Secao titulo="Entregues" contagem={`${entregues.length} · ${hhmm(entregues.reduce((s, t) => s + t.segundos, 0))}`}>
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
                <span className="text-[11.5px] text-tinta-4 truncate">{t.evento ? `evento ${diaCurto(t.evento.data)}` : SEM_EVENTO}</span>
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
          {sp.semana && <input type="hidden" name="semana" value={sp.semana} />}
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

function Secao({ titulo, contagem, children }: { titulo: string; contagem: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-tinta-3">{titulo}</h2>
        <span className="num text-[11.5px] text-tinta-4">{contagem}</span>
      </div>
      {children}
    </section>
  );
}

function Linha({ children, destaque, apagada, pausada }: { children: React.ReactNode; destaque?: boolean; apagada?: boolean; pausada?: boolean }) {
  return (
    <div className={`flex items-center gap-3.5 rounded-[10px] px-4 py-3 border ${
      pausada ? "bg-elevado border-ambar-borda" : destaque ? "bg-superficie border-rosa-borda" : apagada ? "bg-superficie-2 border-linha-2" : "bg-superficie border-linha"
    }`}>
      {children}
    </div>
  );
}

/** Tarefa tocada hoje que não é desta semana (prazo já passou ou ainda não abriu). */
function OutraSemana({ prazo }: { prazo: string }) {
  const venceu = new Date(prazo).getTime() < Date.now();
  return (
    <span className={`ml-2 inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-medium align-middle ${
      venceu ? "bg-rosa-fundo border-rosa-borda text-rosa" : "bg-elevado border-linha text-tinta-3"}`}>
      de outra semana · {venceu ? "prazo venceu" : "prazo"} {diaCurto(prazo.slice(0, 10))}
    </span>
  );
}

function Etiqueta({ atrasada }: { atrasada: boolean }) {
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
