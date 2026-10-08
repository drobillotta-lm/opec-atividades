import { criarClienteServidor } from "@/lib/supabase/server";
import { hhmm, tempoLegivel, diaCurto } from "@/lib/semana";
import { iniciar, pausar } from "../(app)/acoes";
import { Relogio, Submit } from "../(app)/semana/Cronometro";
import { BotaoTema } from "@/componentes/Tema";
import { AutoAtualiza } from "@/componentes/AutoAtualiza";
import Link from "next/link";
import { Rosto } from "@/componentes/SrMinutos";
import { nomeTarefa } from "@/componentes/nome-tarefa";

export const dynamic = "force-dynamic";

export default async function Dock() {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome").eq("auth_user_id", user!.id).single();

  const CAMPOS = `id, atividade, titulo, estimativa_min, prazo_em, abre_em,
             escalado_id, dupla_id, responsavel_real_id,
             frentes ( nome ), eventos ( competicao, data, evento_id_origem, confronto )`;

  // Sem filtro por abre_em: /semana deixa iniciar uma tarefa antes da janela abrir
  // (nada trava isso lá), e o dock precisa achar a sessao aberta mesmo assim -- e
  // era exatamente essa a tarefa que sumia daqui.
  const { data: minhas } = await supabase
    .from("tarefas")
    .select(CAMPOS)
    .or(`escalado_id.eq.${pessoa!.id},dupla_id.eq.${pessoa!.id},responsavel_real_id.eq.${pessoa!.id}`)
    .eq("status", "pendente")
    .order("prazo_em");

  // Tarefa que a pessoa puxou pela busca em /semana: não é escalada nem
  // responsável, só tem sessão. Sem isto, sumia do dock assim que fechava a aba.
  const { data: sessoesMinhas } = await supabase.from("sessoes").select("tarefa_id").eq("pessoa_id", pessoa!.id);
  const idsComSessao = [...new Set((sessoesMinhas ?? []).map((s) => s.tarefa_id))];
  const idsJaTem = new Set((minhas ?? []).map((t) => t.id));
  const idsAjudando = idsComSessao.filter((id) => !idsJaTem.has(id));
  const { data: ajudando } = idsAjudando.length
    ? await supabase.from("tarefas").select(CAMPOS).eq("status", "pendente").in("id", idsAjudando)
    : { data: [] as typeof minhas };

  const brutas = [...(minhas ?? []), ...(ajudando ?? [])];
  const lista = (brutas ?? []).map((t) => ({
    ...t,
    frente: Array.isArray(t.frentes) ? t.frentes[0] : t.frentes,
    evento: Array.isArray(t.eventos) ? t.eventos[0] : t.eventos,
  }));
  const ids = lista.map((t) => t.id);

  const { data: tempos } = ids.length
    ? await supabase.from("v_tempo_tarefa").select("*").in("tarefa_id", ids)
    : { data: [] as { tarefa_id: string; segundos_total: number; sessao_aberta_desde: string | null }[] };

  // O relogio agregado e por tarefa, nao por pessoa: "correndo" pro botao (Pausar vs
  // Retomar) tem que ser A MINHA sessao, senao o dock mostra rodando so porque outra
  // pessoa esta cronometrando a mesma tarefa em conjunto. Desde a 044 posso ter varias
  // abertas: a mais recente e a principal, as outras viram chips com o seu Pausar.
  const { data: minhasAbertas } = ids.length
    ? await supabase.from("sessoes").select("tarefa_id, inicio, subtarefa_id").eq("pessoa_id", pessoa!.id).in("tarefa_id", ids).is("fim", null)
    : { data: [] as { tarefa_id: string; inicio: string; subtarefa_id: string | null }[] };
  const inicioPorTarefa = new Map((minhasAbertas ?? []).map((s) => [s.tarefa_id, s.inicio]));

  // Se o trecho aberto e de uma parte (030), o dock diz qual.
  const idsPartes = (minhasAbertas ?? []).map((s) => s.subtarefa_id).filter((x): x is string => !!x);
  const { data: partes } = idsPartes.length
    ? await supabase.from("subtarefas").select("id, tarefa_id, titulo").in("id", idsPartes)
    : { data: [] as { id: string; tarefa_id: string; titulo: string }[] };
  const parteDaTarefa = new Map((partes ?? []).map((p) => [p.tarefa_id, p.titulo]));

  const porId = new Map((tempos ?? []).map((t) => [t.tarefa_id, t]));
  const com = lista.map((t) => ({
    ...t,
    segundos: Number(porId.get(t.id)?.segundos_total ?? 0),
    correndo: inicioPorTarefa.get(t.id) ?? null,
    parte: parteDaTarefa.get(t.id) ?? null,
  }));

  // Rodando vale sempre (a ligada por ultimo na frente). Sem nada rodando, sugere pelo
  // mesmo criterio de "/semana": pausada (ja tem tempo, so retomar) antes de pendente
  // nova, e so entre quem a janela ja abriu.
  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const abertas = com.filter((t) => t.abre_em <= hoje);
  const rodando = com.filter((t) => t.correndo).sort((a, b) => new Date(b.correndo!).getTime() - new Date(a.correndo!).getTime());
  const atual = rodando[0]
    ?? abertas.find((t) => t.segundos > 0)
    ?? abertas[0];
  const outrasRodando = rodando.filter((t) => t.id !== atual?.id);
  const pct = atual ? Math.min(100, (100 * atual.segundos) / (atual.estimativa_min * 60)) : 0;

  return (
    <div className="min-h-screen p-2.5 bg-transparent">
      <AutoAtualiza segundos={30} />
      <div className="vidro rounded-2xl px-4 py-3 flex flex-col gap-2.5">
        {!atual ? (
          <div className="flex items-center justify-between gap-3 min-h-[72px]">
            <div className="flex flex-col gap-1">
              <span className="text-[13px] font-medium text-tinta-2">Nada em andamento</span>
              <span className="text-[11.5px] text-tinta-4">Sem tarefa aberta para hoje</span>
            </div>
            <BotaoTema compacto />
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="inline-flex items-center gap-1.5 text-[9.5px] font-semibold uppercase tracking-[0.11em]"
                      style={{ color: atual.correndo ? "var(--color-verde-claro)" : "var(--color-ambar)" }}>
                  <Rosto estado={atual.correndo ? "verde" : "ambar"} tamanho={14} />
                  {atual.correndo ? (rodando.length > 1 ? `Em andamento · ${rodando.length}` : "Em andamento") : "Pausada"}
                </span>
                <span className="text-[13.5px] font-semibold tracking-[-0.01em] truncate">
                  {nomeTarefa(atual, "nome")}
                </span>
                <span className="text-[11px] text-tinta-4 truncate">
                  {atual.parte ? `parte: ${atual.parte} · ` : ""}{atual.evento ? `evento ${diaCurto(atual.evento.data)}` : "Começada do zero"}
                </span>
              </div>
              <BotaoTema compacto />
            </div>

            <div className="flex items-baseline gap-2">
              {atual.correndo ? (
                <Relogio desde={atual.correndo} baseSeg={atual.segundos} />
              ) : (
                <span className="num text-[29px] font-medium tracking-[-0.02em]">{tempoLegivel(atual.segundos)}</span>
              )}
              <span className="num text-[11px] text-tinta-4">de {hhmm(atual.estimativa_min)}</span>
            </div>

            <div className="h-1.5 rounded-full bg-elevado overflow-hidden">
              <div className="h-1.5 rounded-full transition-[width] duration-500"
                   style={{ width: `${pct}%`, background: pct >= 100 ? "var(--color-ambar)" : "var(--color-creme)" }} />
            </div>

            <div className="flex gap-2">
              {atual.correndo ? (
                <form action={pausar.bind(null, atual.id)} className="flex-1">
                  <Submit ocupado="..." className="w-full min-h-9 rounded-[10px] border border-linha bg-elevado text-[12px] font-medium hover:brightness-110 transition">
                    Pausar
                  </Submit>
                </form>
              ) : (
                <form action={iniciar.bind(null, atual.id)} className="flex-1">
                  <Submit ocupado="..." className="w-full min-h-9 rounded-[10px] border border-verde-borda bg-verde-fundo text-verde-claro text-[12px] font-medium hover:brightness-110 transition">
                    {atual.segundos > 0 ? "Retomar" : "Iniciar"}
                  </Submit>
                </form>
              )}
              <Link href="/semana" target="_blank"
                className="flex-1 min-h-9 grid place-items-center rounded-[10px] bg-verde text-verde-ink text-[12px] font-semibold hover:brightness-110 transition">
                Entregar
              </Link>
            </div>

            {outrasRodando.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {outrasRodando.map((t) => (
                  <form key={t.id} action={pausar.bind(null, t.id)} className="min-w-0">
                    <Submit ocupado="..." className="max-w-[150px] inline-flex items-center gap-1.5 min-h-7 px-2 rounded-[8px] border border-verde-borda bg-verde-fundo text-[11px] text-verde-claro truncate">
                      <Rosto estado="verde" tamanho={11} />
                      <span className="truncate">{nomeTarefa(t, "sigla")}</span>
                      <span aria-label="Pausar" title="Pausar">⏸</span>
                    </Submit>
                  </form>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
