import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { semanaDe, deslocarSemana, rotuloSemana, diaCurto, hhmm, ROTULO_ATIVIDADE } from "@/lib/semana";
import { Relogio, BotaoIniciar, BotoesEmCurso, TempoParado } from "./Cronometro";

export const dynamic = "force-dynamic";

export default async function MinhaSemana({
  searchParams,
}: {
  searchParams: Promise<{ semana?: string }>;
}) {
  const sp = await searchParams;
  const { inicio, fim } = sp.semana ? deslocarSemana(sp.semana, 0) : semanaDe();
  const anterior = deslocarSemana(inicio, -1).inicio;
  const proxima = deslocarSemana(inicio, 1).inicio;

  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome").eq("auth_user_id", user!.id).single();

  const { data: brutas } = await supabase
    .from("tarefas")
    .select(`id, atividade, status, estimativa_min, abre_em, prazo_em, concluida_em,
             escalado_id, responsavel_real_id,
             frentes ( sigla, nome ),
             eventos ( competicao, data, evento_id_origem )`)
    .lte("abre_em", fim)
    .gte("prazo_em", `${inicio}T00:00:00Z`)
    .eq("escalado_id", pessoa!.id)
    .order("prazo_em");

  const tarefas = brutas ?? [];
  const ids = tarefas.map((t) => t.id);

  const { data: tempos } = ids.length
    ? await supabase.from("v_tempo_tarefa").select("*").in("tarefa_id", ids)
    : { data: [] as { tarefa_id: string; minutos_total: number; sessao_aberta_desde: string | null }[] };

  const porId = new Map((tempos ?? []).map((t) => [t.tarefa_id, t]));
  const comTempo = tarefas.map((t) => ({
    ...t,
    frente: Array.isArray(t.frentes) ? t.frentes[0] : t.frentes,
    evento: Array.isArray(t.eventos) ? t.eventos[0] : t.eventos,
    minutos: porId.get(t.id)?.minutos_total ?? 0,
    correndo: porId.get(t.id)?.sessao_aberta_desde ?? null,
  }));

  const emCurso = comTempo.find((t) => t.correndo);
  const pendentes = comTempo.filter((t) => t.status === "pendente" && !t.correndo);
  const entregues = comTempo.filter((t) => t.status === "entregue" || t.status === "fora_do_prazo");
  const horasPrevistas = comTempo.reduce((s, t) => s + t.estimativa_min, 0);
  const horasFeitas = comTempo.reduce((s, t) => s + t.minutos, 0);
  const agora = Date.now();

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[1080px]">
      <header className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[23px] font-semibold tracking-[-0.02em]">Minha semana</h1>
          <p className="text-[12.5px] text-tinta-3">
            {rotuloSemana(inicio, fim)} · {comTempo.length} tarefas · {hhmm(horasFeitas)} de {hhmm(horasPrevistas)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Seta href={`/semana?semana=${anterior}`} rotulo="Semana anterior">‹</Seta>
          <Seta href="/semana" rotulo="Semana atual">hoje</Seta>
          <Seta href={`/semana?semana=${proxima}`} rotulo="Próxima semana">›</Seta>
        </div>
      </header>

      {emCurso && (
        <div className="flex items-center gap-5 rounded-xl bg-[#13211b] border border-[#235140] px-5 py-4">
          <div className="flex flex-col gap-1.5 flex-1 min-w-0">
            <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-verde-claro">
              <span className="w-[7px] h-[7px] rounded-full bg-verde" />Em andamento
            </span>
            <span className="text-[16px] font-semibold tracking-[-0.01em]">
              {ROTULO_ATIVIDADE[emCurso.atividade] ?? emCurso.atividade} · {emCurso.frente?.nome}
            </span>
            <span className="text-[12px] text-tinta-3 truncate">
              {emCurso.evento?.competicao} · evento {emCurso.evento && diaCurto(emCurso.evento.data)}
            </span>
          </div>
          <div className="flex flex-col items-end">
            <Relogio desde={emCurso.correndo!} baseMin={emCurso.minutos} />
            <span className="num text-[11px] text-tinta-4">de {hhmm(emCurso.estimativa_min)}</span>
          </div>
          <BotoesEmCurso id={emCurso.id} />
        </div>
      )}

      <Secao titulo="Pendentes" contagem={`${pendentes.length}`}>
        {pendentes.length === 0 && <Vazio>Nada pendente nesta semana.</Vazio>}
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
              </div>
              <TempoParado minutos={t.minutos} estimativa={t.estimativa_min} />
              <BotaoIniciar id={t.id} />
            </Linha>
          );
        })}
      </Secao>

      {entregues.length > 0 && (
        <Secao titulo="Entregues" contagem={`${entregues.length} · ${hhmm(entregues.reduce((s, t) => s + t.minutos, 0))}`}>
          {entregues.map((t) => (
            <Linha key={t.id} apagada>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-elevado border border-linha px-2.5 py-1 text-[11px] font-medium text-tinta-2 shrink-0">
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#28AB72" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2.4 6.2l2.2 2.2 5-5.4" />
                </svg>
                {t.status === "fora_do_prazo" ? "Fora do prazo" : "Entregue"}
              </span>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-[13.5px] text-tinta-2">
                  {ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · {t.frente?.nome}
                </span>
                <span className="text-[11.5px] text-tinta-4 truncate">{t.evento?.competicao}</span>
              </div>
              <TempoParado minutos={t.minutos} estimativa={t.estimativa_min} />
            </Linha>
          ))}
        </Secao>
      )}
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

function Linha({ children, destaque, apagada }: { children: React.ReactNode; destaque?: boolean; apagada?: boolean }) {
  return (
    <div className={`flex items-center gap-3.5 rounded-[10px] px-4 py-3 border ${
      destaque ? "bg-superficie border-[#3a3226]" : apagada ? "bg-superficie-2 border-linha-2" : "bg-superficie border-linha"
    }`}>
      {children}
    </div>
  );
}

function Etiqueta({ atrasada }: { atrasada: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-elevado border border-linha px-2.5 py-1 text-[11px] font-medium text-tinta-2 shrink-0">
      {atrasada ? (
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="#B8892D" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M6 1.6l4.8 8.4H1.2z" /><path d="M6 5v2.2M6 8.7v.1" />
        </svg>
      ) : (
        <span className="w-1.5 h-1.5 rounded-full bg-tinta-4" />
      )}
      {atrasada ? "Fora do prazo" : "Pendente"}
    </span>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-[10px] border border-dashed border-linha px-4 py-5 text-[12.5px] text-tinta-4">{children}</p>;
}
