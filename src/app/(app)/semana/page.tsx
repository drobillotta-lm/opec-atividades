import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
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

export const dynamic = "force-dynamic";

const CAMPOS_TAREFA = `id, atividade, status, estimativa_min, abre_em, prazo_em, concluida_em,
             escalado_id, dupla_id, responsavel_real_id, excecao_desc,
             frentes ( sigla, nome ),
             eventos ( competicao, data, evento_id_origem )`;

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
    .select(`id, atividade, status, estimativa_min, prazo_em, escalado_id, dupla_id,
             frentes ( sigla ), eventos!inner ( competicao, data, evento_id_origem )`)
    .in("status", ["pendente", "fora_do_prazo"])
    .or(condicoes)
    .order("prazo_em")
    .limit(25);
}

export default async function MinhaSemana({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string; busca?: string }>;
}) {
  const sp = await searchParams;
  const { inicio, fim } = sp.semana ? deslocarSemana(sp.semana, 0) : semanaDe();
  const anterior = deslocarSemana(inicio, -1).inicio;
  const proxima = deslocarSemana(inicio, 1).inicio;

  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome").eq("auth_user_id", user!.id).single();

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
    supabase.from("sessoes").select("tarefa_id").eq("pessoa_id", pessoa!.id),
    supabase.from("subtarefas").select("tarefa_id").eq("pessoa_id", pessoa!.id).eq("status", "pendente"),
  ]);
  const idsComSessao = [...new Set([...(sessoesMinhas ?? []), ...(partesMinhas ?? [])].map((s) => s.tarefa_id))];
  const idsJaTem = new Set((minhas ?? []).map((t) => t.id));
  const idsAjudando = idsComSessao.filter((id) => !idsJaTem.has(id));
  const { data: ajudando } = idsAjudando.length
    ? await supabase.from("tarefas").select(CAMPOS_TAREFA)
        .lte("abre_em", fim).gte("prazo_em", `${inicio}T00:00:00Z`).in("id", idsAjudando)
    : { data: [] as typeof minhas };

  const tarefas = [...(minhas ?? []), ...(ajudando ?? [])];
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
    };
  });

  const emCurso = comTempo.find((t) => t.correndo);
  const paradas = comTempo.filter((t) => t.status === "pendente" && !t.correndo);
  const pausadas = paradas.filter((t) => t.segundos > 0);
  const pendentes = paradas.filter((t) => t.segundos <= 0);
  const entregues = comTempo.filter((t) => t.status === "entregue" || t.status === "fora_do_prazo");
  const naoAplicaveis = comTempo.filter((t) => t.status === "na");
  const horasPrevistas = comTempo.reduce((s, t) => s + t.estimativa_min, 0);
  const segundosFeitos = comTempo.reduce((s, t) => s + t.segundos, 0);
  const agora = Date.now();
  // Fala do Sr. Minutos no cartão de andamento: regra fixa (docs/06), sobre a próxima de hoje.
  const hojeBRT = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const venceHoje = pendentes.find((t) => t.prazo_em.slice(0, 10) === hojeBRT);
  const falaSrMinutos = venceHoje ? `${ROTULO_ATIVIDADE[venceHoje.atividade] ?? venceHoje.atividade} vence hoje.` : undefined;
  const idsExistentes = new Set(ids);
  const resultados = (resultadosBusca ?? [])
    .map((r) => ({
      ...r,
      frente: Array.isArray(r.frentes) ? r.frentes[0] : r.frentes,
      evento: Array.isArray(r.eventos) ? r.eventos[0] : r.eventos,
    }))
    .filter((r) => !idsExistentes.has(r.id));

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[1080px]">
      <AutoAtualiza segundos={30} />
      <header className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[34px]">Minha semana</h1>
          <p className="text-[12.5px] text-tinta-3">
            {rotuloSemana(inicio, fim)} · {comTempo.length} tarefas · {tempoLegivel(segundosFeitos)} de {hhmm(horasPrevistas)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <AbrirDock />
          <Seta href={`/semana?semana=${anterior}`} rotulo="Semana anterior">‹</Seta>
          <Seta href="/semana" rotulo="Semana atual">hoje</Seta>
          <Seta href={`/semana?semana=${proxima}`} rotulo="Próxima semana">›</Seta>
        </div>
      </header>

      {emCurso && (
        <div className="relative mt-[118px] flex items-center gap-5 rounded-xl bg-verde-fundo border border-verde-borda px-5 py-4">
          <Corpo pose="apontando" altura={116} fala={falaSrMinutos} className="right-10 bottom-[calc(100%-6px)]" />
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-verde-claro">
              <Rosto estado="verde" tamanho={16} />Em andamento
            </span>
            <span className="text-[16px] font-semibold tracking-[-0.01em]">
              {ROTULO_ATIVIDADE[emCurso.atividade] ?? emCurso.atividade} · {emCurso.frente?.nome}
            </span>
            <span className="text-[12px] text-tinta-3 truncate">
              {emCurso.evento?.competicao} · evento {emCurso.evento && diaCurto(emCurso.evento.data)}
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
            <form action={pausar}>
              <Submit ocupado="..." className="flex items-center gap-2 min-h-[42px] px-3.5 rounded-[9px] border border-linha bg-elevado text-[12.5px] font-medium hover:bg-linha transition">
                Pausar
              </Submit>
            </form>
            <DialogoEntrega
              acao={entregar.bind(null, emCurso.id)}
              titulo={`${ROTULO_ATIVIDADE[emCurso.atividade] ?? emCurso.atividade} · ${emCurso.frente?.nome}`}
              subtitulo={emCurso.evento?.competicao ?? ""}
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
              titulo={`${ROTULO_ATIVIDADE[emCurso.atividade] ?? emCurso.atividade} · ${emCurso.frente?.nome}`}
              partes={emCurso.partes} time={time ?? []} euId={pessoa!.id}
              criar={criarSubtarefa.bind(null, emCurso.id)}
              iniciar={iniciarSubtarefa} concluir={concluirSubtarefa} reabrir={reabrirSubtarefa} apagar={apagarSubtarefa}
            />
          </div>
        </div>
      )}

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
                  {ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · {t.frente?.nome}
                </span>
                <span className="text-[11.5px] text-tinta-3 truncate">
                  {t.evento?.competicao} · entrega até {diaCurto(t.prazo_em.slice(0, 10))}
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
                  titulo={`${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${t.frente?.nome}`}
                  subtitulo={t.evento?.competicao ?? ""}
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
                  titulo={`${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${t.frente?.nome}`}
                />
                <DialogoAjuste
                  acao={ajustarTempo.bind(null, t.id)}
                  titulo={`${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${t.frente?.nome}`}
                />
                <DialogoPartes
                  titulo={`${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${t.frente?.nome}`}
                  partes={t.partes} time={time ?? []} euId={pessoa!.id}
                  criar={criarSubtarefa.bind(null, t.id)}
                  iniciar={iniciarSubtarefa} concluir={concluirSubtarefa} reabrir={reabrirSubtarefa} apagar={apagarSubtarefa}
                />
              </div>
            </Linha>
          ))}
        </Secao>
      )}

      {!emCurso && segundosFeitos === 0 && pendentes.length > 0 && (
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
                  {ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · {t.frente?.nome}
                </span>
                <span className="text-[11.5px] text-tinta-3 truncate">
                  {t.evento?.competicao} · evento {t.evento && diaCurto(t.evento.data)} ·{" "}
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
                  titulo={`${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${t.frente?.nome}`}
                  subtitulo={t.evento?.competicao ?? ""}
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
                  titulo={`${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${t.frente?.nome}`}
                />
                <DialogoAjuste
                  acao={ajustarTempo.bind(null, t.id)}
                  titulo={`${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${t.frente?.nome}`}
                />
                <DialogoPartes
                  titulo={`${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${t.frente?.nome}`}
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
                  {ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · {t.frente?.nome}
                </span>
                <span className="text-[11.5px] text-tinta-4 truncate">{t.evento?.competicao}</span>
              </div>
              <TempoParado segundos={t.segundos} estimativaMin={t.estimativa_min} />
              <DialogoAjuste
                acao={ajustarTempo.bind(null, t.id)}
                titulo={`${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${t.frente?.nome}`}
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
                  {ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · {t.frente?.nome}
                </span>
                <span className="text-[11.5px] text-tinta-4 truncate">
                  {t.evento?.competicao}{t.excecao_desc ? ` · ${t.excecao_desc}` : ""}
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
                {ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · {t.frente?.sigla}
              </span>
              <span className="text-[11.5px] text-tinta-3 truncate">
                {t.evento?.competicao} · evento {t.evento && diaCurto(t.evento.data)} · escalado: {escaladosDe(nomePor, t.escalado_id, t.dupla_id)}
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
