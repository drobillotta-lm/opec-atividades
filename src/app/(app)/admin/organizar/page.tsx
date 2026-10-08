import Link from "next/link";
import { criarClienteServidor } from "@/lib/supabase/server";
import { semanaDe, deslocarSemana, diaCurto, hhmm, escaladosDe, ROTULO_STATUS } from "@/lib/semana";
import { rotulosAtividade } from "@/lib/atividades";
import { nomeTarefa } from "@/componentes/nome-tarefa";
import { Submit } from "../../semana/Cronometro";
import {
  salvarMapa, copiarMesAnterior, reaplicarAgora,
  novaAtividade, encerrarAtividade, reabrirAtividade, alterarTaxa, alterarJanela,
  redirecionarTarefa, ajustarTarefa, tarefaDesnecessaria, apagarTarefa, criarTarefaAvulsa,
} from "./acoes";

export const dynamic = "force-dynamic";

// Só classes de token (superficie, linha, tinta, verde, ambar, rosa): a tela herda a
// identidade nova sozinha quando o D1 da janela TELAS entrar.
const CAMPO = "min-h-9 px-2.5 rounded-lg border border-linha bg-superficie-2 text-[12.5px]";
const BOTAO = "min-h-9 px-3 rounded-lg border border-linha bg-elevado text-[12.5px] font-medium hover:bg-linha transition";
const PRIMARIO = "min-h-9 px-3.5 rounded-lg border border-verde-borda bg-verde-fundo text-verde-claro text-[12.5px] font-semibold hover:brightness-110 transition";
const PERIGO = "min-h-9 px-3 rounded-lg border border-linha bg-superficie-2 text-rosa text-[12.5px] hover:bg-elevado transition";

type Busca = {
  aba?: string; mes?: string; semana?: string; frente?: string; pessoa?: string; busca?: string;
  msg?: string; erro?: string;
};
type Pessoa = { id: string; nome: string; papel: string };
type Frente = { id: string; sigla: string; nome: string; ativa: boolean; lider_id: string | null };

const hojeISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
const dataBR = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const sinal = (n: number) => (n > 0 ? `+${n}` : String(n));

function competenciaDe(mes?: string) {
  return mes && /^\d{4}-\d{2}$/.test(mes) ? `${mes}-01` : `${hojeISO().slice(0, 7)}-01`;
}
function deslocarMes(comp: string, n: number) {
  const d = new Date(comp + "T12:00:00Z");
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1)).toISOString().slice(0, 10);
}
const fimDoMes = (comp: string) => {
  const d = new Date(deslocarMes(comp, 1) + "T12:00:00Z");
  d.setUTCDate(0);
  return d.toISOString().slice(0, 10);
};
const rotuloMes = (comp: string) =>
  new Date(comp + "T12:00:00Z").toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export default async function Organizar({ searchParams }: { searchParams: Promise<Busca> }) {
  const sp = await searchParams;
  const aba = sp.aba === "atividades" || sp.aba === "tarefas" ? sp.aba : "mapa";

  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: eu } = await supabase.from("pessoas").select("id, papel").eq("auth_user_id", user!.id).single();
  if (eu?.papel !== "gestor") {
    return <div className="p-6 px-8 text-[13px] text-tinta-3">Só Yuri e Daniel organizam mapa, atividades e tarefas.</div>;
  }

  // Volta pra esta mesma tela, com os mesmos filtros, depois de cada ação.
  const params = new URLSearchParams(
    Object.entries(sp).filter(([k, v]) => v && k !== "msg" && k !== "erro") as [string, string][],
  );
  const volta = `/admin/organizar${params.size ? `?${params}` : ""}`;

  const [{ data: frentes }, { data: pessoas }, rotulos] = await Promise.all([
    supabase.from("frentes").select("id, sigla, nome, ativa, lider_id").order("sigla"),
    supabase.from("pessoas").select("id, nome, papel").is("saida", null).order("nome"),
    rotulosAtividade(),
  ]);
  const time = (pessoas ?? []) as Pessoa[];
  const nomePor = new Map(time.map((p) => [p.id, p.nome]));
  const ativas = ((frentes ?? []) as Frente[]).filter((f) => f.ativa);

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[1140px]">
      <header className="flex items-end justify-between gap-5">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[23px] font-semibold tracking-[-0.02em]">Organizar</h1>
          <p className="text-[12.5px] text-tinta-3">Mapa do mês, atividades da cadeia e ajuste de tarefas, sem migration</p>
        </div>
        <Link href="/admin" className="text-[12.5px] text-tinta-3 hover:text-tinta-2">← Admin</Link>
      </header>

      <nav className="flex gap-1.5" aria-label="Abas">
        {(["mapa", "atividades", "tarefas"] as const).map((a) => (
          <Link key={a} href={`/admin/organizar?aba=${a}`} aria-current={aba === a ? "page" : undefined}
            className={`min-h-9 px-3.5 inline-flex items-center rounded-lg border text-[12.5px] font-medium transition ${
              aba === a ? "border-verde-borda bg-verde-fundo text-verde-claro" : "border-linha bg-superficie text-tinta-3 hover:text-tinta-2"}`}>
            {a === "mapa" ? "Mapa" : a === "atividades" ? "Atividades" : "Tarefas"}
          </Link>
        ))}
      </nav>

      {sp.msg && <p role="status" className="rounded-[10px] border border-verde-borda bg-verde-fundo px-4 py-2.5 text-[12.5px] text-verde-claro">{sp.msg}</p>}
      {sp.erro && <p role="alert" className="rounded-[10px] border border-linha bg-superficie-2 px-4 py-2.5 text-[12.5px] text-rosa">Não deu: {sp.erro}</p>}

      {aba === "mapa" && <AbaMapa sp={sp} volta={volta} frentes={ativas} time={time} rotulos={rotulos} />}
      {aba === "atividades" && <AbaAtividades volta={volta} frentes={ativas} rotulos={rotulos} />}
      {aba === "tarefas" && <AbaTarefas sp={sp} volta={volta} frentes={ativas} time={time} nomePor={nomePor} rotulos={rotulos} />}
    </div>
  );
}

// --- Mapa ------------------------------------------------------------------------------

async function AbaMapa({ sp, volta, frentes, time, rotulos }: {
  sp: Busca; volta: string; frentes: Frente[]; time: Pessoa[]; rotulos: Record<string, string>;
}) {
  const supabase = await criarClienteServidor();
  const comp = competenciaDe(sp.mes);
  const fim = fimDoMes(comp);
  const [{ data: cadeia }, { data: mapa }] = await Promise.all([
    supabase.from("cadeia").select("frente_id, atividade, ordem")
      .is("competicao_id", null).eq("escalado_regra", "mapa")
      .lte("vigente_de", fim).or(`vigente_ate.is.null,vigente_ate.gte.${comp}`).order("ordem"),
    supabase.from("mapa").select("frente_id, atividade, pessoa_id, dupla_id, origem_commit").eq("competencia", comp),
  ]);
  const celula = new Map((mapa ?? []).map((m) => [`${m.frente_id}|${m.atividade}`, m]));
  const linhas = frentes
    .map((f) => ({ f, atividades: [...new Set((cadeia ?? []).filter((c) => c.frente_id === f.id).map((c) => c.atividade))] }))
    .filter((l) => l.atividades.length > 0);
  const mesParam = (n: number) => `/admin/organizar?aba=mapa&mes=${deslocarMes(comp, n).slice(0, 7)}`;

  return (
    <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h2 className="text-sm font-semibold tracking-[-0.01em] capitalize">Mapa de {rotuloMes(comp)}</h2>
        <div className="flex items-center gap-1.5">
          <Link href={mesParam(-1)} aria-label="Mês anterior" className={BOTAO + " inline-flex items-center"}>‹</Link>
          <Link href="/admin/organizar?aba=mapa" className={BOTAO + " inline-flex items-center"}>mês atual</Link>
          <Link href={mesParam(1)} aria-label="Próximo mês" className={BOTAO + " inline-flex items-center"}>›</Link>
        </div>
      </div>
      <p className="text-[11.5px] text-tinta-4">
        Cada célula é quem faz aquela atividade naquela frente no mês. Salvar realinha na hora as tarefas pendentes sem tempo;
        tarefa com tempo ou redirecionada à mão fica com quem está.
      </p>

      {linhas.length === 0 && <p className="text-[12.5px] text-tinta-4">Nenhuma frente tem cadeia em vigor neste mês.</p>}

      <form action={salvarMapa.bind(null, comp)} className="flex flex-col gap-4">
        <input type="hidden" name="volta" value={volta} />
        {linhas.map(({ f, atividades }) => (
          <div key={f.id} className="flex flex-col gap-2 pt-3 border-t border-linha-2">
            <div className="flex items-baseline gap-2">
              <h3 className="text-[13px] font-semibold">{f.nome}</h3>
              <span className="text-[11px] text-tinta-4">{f.sigla}{f.lider_id ? ` · líder ${time.find((p) => p.id === f.lider_id)?.nome ?? "—"}` : ""}</span>
            </div>
            <div className="grid gap-2.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))" }}>
              {atividades.map((atv) => {
                const m = celula.get(`${f.id}|${atv}`);
                const provisorio = m?.origem_commit?.startsWith("provisorio");
                const liderNaFrente = !!f.lider_id && (m?.pessoa_id === f.lider_id || m?.dupla_id === f.lider_id);
                return (
                  <div key={atv} className="rounded-[10px] border border-linha bg-superficie-2 p-3 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-medium">{rotulos[atv] ?? atv}</span>
                      {provisorio && <span className="text-[10.5px] px-1.5 py-0.5 rounded border border-linha text-ambar-claro bg-ambar-fundo">provisório</span>}
                    </div>
                    <label className="sr-only" htmlFor={`p-${f.sigla}-${atv}`}>Quem faz {rotulos[atv] ?? atv} em {f.nome}</label>
                    <select id={`p-${f.sigla}-${atv}`} name={`p|${f.sigla}|${atv}`} defaultValue={m?.pessoa_id ?? ""} className={CAMPO}>
                      <option value="">— ninguém —</option>
                      {time.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    <label className="sr-only" htmlFor={`d-${f.sigla}-${atv}`}>Dupla</label>
                    <select id={`d-${f.sigla}-${atv}`} name={`d|${f.sigla}|${atv}`} defaultValue={m?.dupla_id ?? ""} className={CAMPO}>
                      <option value="">sem dupla</option>
                      {time.map((p) => <option key={p.id} value={p.id}>+ {p.nome}</option>)}
                    </select>
                    {liderNaFrente && <span className="text-[11px] text-ambar-claro">Líder executando a própria frente</span>}
                    {m?.origem_commit && <span className="text-[10.5px] text-tinta-4 truncate" title={m.origem_commit}>{m.origem_commit}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {linhas.length > 0 && (
          <div className="flex justify-end">
            <Submit ocupado="Salvando..." className={PRIMARIO}>Salvar mapa de {rotuloMes(comp)}</Submit>
          </div>
        )}
      </form>

      <div className="flex gap-2 flex-wrap pt-3 border-t border-linha-2">
        <form action={copiarMesAnterior.bind(null, comp)}>
          <input type="hidden" name="volta" value={volta} />
          <Submit ocupado="Copiando..." className={BOTAO}>Copiar do mês anterior</Submit>
        </form>
        <form action={reaplicarAgora.bind(null, comp)}>
          <input type="hidden" name="volta" value={volta} />
          <Submit ocupado="Reaplicando..." className={BOTAO}>Reaplicar agora</Submit>
        </form>
      </div>
    </section>
  );
}

// --- Atividades --------------------------------------------------------------------------

async function AbaAtividades({ volta, frentes, rotulos }: { volta: string; frentes: Frente[]; rotulos: Record<string, string> }) {
  const supabase = await criarClienteServidor();
  const hoje = hojeISO();
  const comp = `${hoje.slice(0, 7)}-01`;
  const [{ data: cadeia }, { data: taxas }, { data: real }, { data: atividades }] = await Promise.all([
    supabase.from("cadeia")
      .select("id, frente_id, atividade, ordem, escalado_regra, abre_offset_dias, prazo_offset_dias, prazo_horas_antes, taxa_min, vigente_de, vigente_ate, competicoes ( nome )")
      .order("ordem").order("vigente_de"),
    supabase.from("taxas").select("atividade, minutos, vigente_de, fonte").order("vigente_de", { ascending: false }),
    supabase.from("v_taxa_real").select("atividade, amostras, media_medida_min, desvio_pct").eq("competencia", comp),
    supabase.from("atividades").select("codigo, rotulo, ativa").order("codigo"),
  ]);
  const taxaHoje = (atv: string) => (taxas ?? []).find((t) => t.atividade === atv && t.vigente_de <= hoje);
  const realPor = new Map((real ?? []).map((r) => [r.atividade, r]));
  const vigora = (c: { vigente_de: string; vigente_ate: string | null }) => c.vigente_de <= hoje && (!c.vigente_ate || c.vigente_ate >= hoje);

  return (
    <div className="flex flex-col gap-4">
      <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col gap-3">
        <h2 className="text-sm font-semibold tracking-[-0.01em]">Nova atividade</h2>
        <form action={novaAtividade} className="flex flex-col gap-3">
          <input type="hidden" name="volta" value={volta} />
          <div className="flex gap-2 flex-wrap items-end">
            <Campo rotulo="Código"><input name="codigo" required placeholder="corte_redes" pattern="[a-z][a-z_]{1,39}" className={CAMPO + " w-40"} /></Campo>
            <Campo rotulo="Nome"><input name="rotulo" required placeholder="Corte pras redes" className={CAMPO + " w-52"} /></Campo>
            <Campo rotulo="Taxa (min)"><input name="minutos" type="number" min={1} required className={CAMPO + " w-24"} /></Campo>
            <Campo rotulo="Abre (dias)"><input name="abre" type="number" defaultValue={0} className={CAMPO + " w-20"} /></Campo>
            <Campo rotulo="Prazo (dias)"><input name="prazo" type="number" defaultValue={2} className={CAMPO + " w-20"} /></Campo>
            <Campo rotulo="Vale a partir de"><input name="vigente_de" type="date" defaultValue={hoje} className={CAMPO} /></Campo>
          </div>
          <fieldset className="flex gap-3 flex-wrap text-[12.5px]">
            <legend className="text-[11.5px] text-tinta-4 pb-1">Frentes</legend>
            {frentes.map((f) => (
              <label key={f.id} className="inline-flex items-center gap-1.5">
                <input type="checkbox" name="frentes" value={f.sigla} /> {f.nome}
              </label>
            ))}
          </fieldset>
          <p className="text-[11.5px] text-tinta-4">Dias relativos ao evento: negativo é antes. As tarefas saem dos eventos com entrega a partir da data; falta pôr gente no mapa depois.</p>
          <div><Submit ocupado="Criando..." className={PRIMARIO}>Criar atividade</Submit></div>
        </form>
      </section>

      {frentes.map((f) => {
        const linhas = (cadeia ?? []).filter((c) => c.frente_id === f.id);
        if (!linhas.length) return null;
        return (
          <section key={f.id} className="rounded-xl bg-superficie border border-linha p-5 flex flex-col">
            <h2 className="text-sm font-semibold tracking-[-0.01em] pb-2">{f.nome} <span className="text-tinta-4 font-normal text-[12px]">{f.sigla}</span></h2>
            {linhas.map((c) => {
              const daCompeticao = Array.isArray(c.competicoes) ? c.competicoes[0] : c.competicoes;
              const emVigor = vigora(c);
              const futura = c.vigente_de > hoje;
              const tx = taxaHoje(c.atividade);
              const r = realPor.get(c.atividade);
              const temAtiva = linhas.some((o) => o.atividade === c.atividade && !o.competicoes && (vigora(o) || o.vigente_de > hoje));
              return (
                <div key={c.id} className={`flex flex-col gap-2 py-2.5 border-t border-linha-2 ${emVigor || futura ? "" : "text-tinta-4"}`}>
                  <div className="flex items-baseline justify-between gap-3 flex-wrap text-[12.5px]">
                    <span className="font-medium">
                      {rotulos[c.atividade] ?? c.atividade}
                      {daCompeticao && <span className="text-tinta-4 font-normal"> · só {daCompeticao.nome}</span>}
                      {c.escalado_regra === "lider" && <span className="text-tinta-4 font-normal"> · do líder</span>}
                    </span>
                    <span className="text-tinta-3">
                      {futura ? `começa ${dataBR(c.vigente_de)}` : c.vigente_ate ? `${emVigor ? "vai" : "foi"} até ${dataBR(c.vigente_ate)}` : `desde ${dataBR(c.vigente_de)}`}
                      {" · "}taxa {c.taxa_min ? <>{hhmm(c.taxa_min)} <span className="text-tinta-4">(só neste elo; padrão {tx ? hhmm(tx.minutos) : "—"})</span></> : tx ? hhmm(tx.minutos) : "—"}
                      {" · "}janela {sinal(c.abre_offset_dias)} a {c.prazo_horas_antes ? `${c.prazo_horas_antes} h antes do início` : `${sinal(c.prazo_offset_dias)} dias`}
                      {r && r.amostras > 0 && <> · medido {hhmm(r.media_medida_min)} em {r.amostras} ({r.desvio_pct > 0 ? "+" : ""}{r.desvio_pct}%)</>}
                    </span>
                  </div>
                  {!daCompeticao && (
                    <details className="text-[12.5px]">
                      <summary className="cursor-pointer text-tinta-3 hover:text-tinta-2 w-fit">Mexer</summary>
                      <div className="flex gap-4 flex-wrap pt-2.5">
                        {(emVigor || futura) && (
                          <form action={alterarJanela.bind(null, c.atividade, f.sigla)} className="flex gap-2 items-end">
                            <input type="hidden" name="volta" value={volta} />
                            <Campo rotulo="Abre"><input name="abre" type="number" defaultValue={c.abre_offset_dias} className={CAMPO + " w-16"} /></Campo>
                            <Campo rotulo="Prazo"><input name="prazo" type="number" defaultValue={c.prazo_offset_dias} className={CAMPO + " w-16"} /></Campo>
                            <Campo rotulo="ou h antes do início"><input name="horas_antes" type="number" min={0} defaultValue={c.prazo_horas_antes ?? ""} placeholder="—" className={CAMPO + " w-20"} /></Campo>
                            <Submit ocupado="..." className={BOTAO}>Alterar janela</Submit>
                          </form>
                        )}
                        {(emVigor || futura) && (
                          <form action={encerrarAtividade.bind(null, c.atividade, f.sigla)} className="flex gap-2 items-end">
                            <input type="hidden" name="volta" value={volta} />
                            <Campo rotulo="Encerrar a partir de"><input name="a_partir" type="date" required defaultValue={hoje} className={CAMPO} /></Campo>
                            <Submit ocupado="..." className={PERIGO}>Encerrar</Submit>
                          </form>
                        )}
                        {!emVigor && !futura && !temAtiva && (
                          <form action={reabrirAtividade.bind(null, c.atividade, f.sigla)} className="flex gap-2 items-end">
                            <input type="hidden" name="volta" value={volta} />
                            <Campo rotulo="Reabrir a partir de"><input name="a_partir" type="date" defaultValue={hoje} className={CAMPO} /></Campo>
                            <Submit ocupado="..." className={BOTAO}>Reabrir</Submit>
                          </form>
                        )}
                      </div>
                    </details>
                  )}
                </div>
              );
            })}
          </section>
        );
      })}

      <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col">
        <h2 className="text-sm font-semibold tracking-[-0.01em] pb-1">Taxas</h2>
        <p className="text-[11.5px] text-tinta-4 pb-2">A taxa vale pra todas as frentes. Mudar atualiza a estimativa das pendentes de eventos a partir da data.</p>
        {(atividades ?? []).map((a) => {
          const tx = taxaHoje(a.codigo);
          return (
            <form key={a.codigo} action={alterarTaxa.bind(null, a.codigo)} className="flex gap-2 items-end flex-wrap py-2 border-t border-linha-2 text-[12.5px]">
              <input type="hidden" name="volta" value={volta} />
              <span className="w-56 pb-2">
                <span className="font-medium">{a.rotulo}</span>
                <span className="block text-[11px] text-tinta-4 truncate" title={tx?.fonte ?? ""}>hoje {tx ? `${tx.minutos} min` : "sem taxa"}</span>
              </span>
              <Campo rotulo="Minutos"><input name="minutos" type="number" min={1} required defaultValue={tx?.minutos} className={CAMPO + " w-24"} /></Campo>
              <Campo rotulo="A partir de"><input name="vigente_de" type="date" defaultValue={hoje} className={CAMPO} /></Campo>
              <Campo rotulo="Fonte"><input name="fonte" placeholder="de onde veio o número" className={CAMPO + " w-56"} /></Campo>
              <Submit ocupado="..." className={BOTAO}>Alterar taxa</Submit>
            </form>
          );
        })}
      </section>
    </div>
  );
}

// --- Tarefas -----------------------------------------------------------------------------

async function AbaTarefas({ sp, volta, frentes, time, nomePor, rotulos }: {
  sp: Busca; volta: string; frentes: Frente[]; time: Pessoa[]; nomePor: Map<string, string>; rotulos: Record<string, string>;
}) {
  const supabase = await criarClienteServidor();
  const { inicio, fim } = sp.semana ? deslocarSemana(sp.semana, 0) : semanaDe();
  const frente = frentes.find((f) => f.sigla === sp.frente);
  const termo = sp.busca?.trim().replace(/[,()%]/g, "");

  let q = supabase.from("tarefas")
    .select(`id, atividade, status, estimativa_min, prazo_em, escalado_id, dupla_id, responsavel_real_id,
             origem, dono_manual, obs, evento_id, frentes ( sigla ), eventos!inner ( competicao, data, evento_id_origem, confronto )`)
    .lte("abre_em", fim).gte("prazo_em", `${inicio}T00:00:00Z`);
  if (frente) q = q.eq("frente_id", frente.id);
  if (sp.pessoa && /^[0-9a-f-]{36}$/.test(sp.pessoa)) q = q.or(`escalado_id.eq.${sp.pessoa},dupla_id.eq.${sp.pessoa}`);
  if (termo) q = q.or(`competicao.ilike.%${termo}%,evento_id_origem.ilike.%${termo}%`, { referencedTable: "eventos" });
  const { data: brutas } = await q.order("prazo_em").limit(80);
  const tarefas = (brutas ?? []).map((t) => ({
    ...t,
    frente: Array.isArray(t.frentes) ? t.frentes[0] : t.frentes,
    evento: Array.isArray(t.eventos) ? t.eventos[0] : t.eventos,
  }));
  const { data: atividades } = await supabase.from("atividades").select("codigo, rotulo").eq("ativa", true).order("rotulo");
  const prazoISO = (ts: string) => new Date(ts).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  return (
    <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col gap-3">
      <form action="/admin/organizar" className="flex gap-2 items-end flex-wrap">
        <input type="hidden" name="aba" value="tarefas" />
        <Campo rotulo="Semana de"><input name="semana" type="date" defaultValue={inicio} className={CAMPO} /></Campo>
        <Campo rotulo="Frente">
          <select name="frente" defaultValue={sp.frente ?? ""} className={CAMPO}>
            <option value="">todas</option>
            {frentes.map((f) => <option key={f.id} value={f.sigla}>{f.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Pessoa">
          <select name="pessoa" defaultValue={sp.pessoa ?? ""} className={CAMPO}>
            <option value="">todas</option>
            {time.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Evento"><input name="busca" defaultValue={sp.busca ?? ""} placeholder="jogo ou competição" className={CAMPO + " w-52"} /></Campo>
        <button type="submit" className={BOTAO}>Filtrar</button>
      </form>
      <p className="text-[11.5px] text-tinta-4">
        Tarefas com janela na semana de {diaCurto(inicio)} a {diaCurto(fim)} · {tarefas.length}{tarefas.length === 80 ? "+ (mostrando as 80 primeiras)" : ""}
      </p>

      {tarefas.map((t) => (
        <div key={t.id} className="flex flex-col gap-1.5 py-2.5 border-t border-linha-2 text-[12.5px]">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <span className="font-medium">
              {nomeTarefa(t, "sigla", rotulos)}
              {t.origem === "avulsa" && <span className="text-tinta-4 font-normal"> · avulsa</span>}
              {t.dono_manual && <span className="text-tinta-4 font-normal"> · dono fixado à mão</span>}
            </span>
            <span className="text-tinta-3">
              {escaladosDe(nomePor, t.escalado_id, t.dupla_id)} · prazo {dataBR(prazoISO(t.prazo_em))} · {hhmm(t.estimativa_min)} ·{" "}
              <span className={t.status === "fora_do_prazo" ? "text-rosa" : t.status === "na" ? "text-tinta-4" : ""}>{ROTULO_STATUS[t.status] ?? t.status}</span>
            </span>
          </div>
          <span className="text-[11.5px] text-tinta-4 truncate" title={t.evento?.evento_id_origem}>evento {t.evento && diaCurto(t.evento.data)}</span>
          {t.obs && <span className="text-[11px] text-tinta-4 whitespace-pre-line">{t.obs}</span>}

          <details>
            <summary className="cursor-pointer text-tinta-3 hover:text-tinta-2 w-fit">Mexer</summary>
            <div className="flex flex-col gap-3 pt-2.5">
              <form action={redirecionarTarefa.bind(null, t.id)} className="flex gap-2 items-end flex-wrap">
                <input type="hidden" name="volta" value={volta} />
                <Campo rotulo="Redirecionar para">
                  <select name="escalado" defaultValue={t.escalado_id} className={CAMPO}>
                    {time.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Dupla">
                  <select name="dupla" defaultValue={t.dupla_id ?? ""} className={CAMPO}>
                    <option value="">sem dupla</option>
                    {time.map((p) => <option key={p.id} value={p.id}>+ {p.nome}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Motivo"><input name="motivo" className={CAMPO + " w-56"} /></Campo>
                <Submit ocupado="..." className={BOTAO}>Redirecionar</Submit>
              </form>

              <form action={ajustarTarefa.bind(null, t.id)} className="flex gap-2 items-end flex-wrap">
                <input type="hidden" name="volta" value={volta} />
                <Campo rotulo="Prazo"><input name="prazo" type="date" defaultValue={prazoISO(t.prazo_em)} className={CAMPO} /></Campo>
                <Campo rotulo="Estimativa (min)"><input name="estimativa" type="number" min={1} defaultValue={t.estimativa_min} className={CAMPO + " w-24"} /></Campo>
                <Campo rotulo="Motivo"><input name="motivo" className={CAMPO + " w-56"} /></Campo>
                <Submit ocupado="..." className={BOTAO}>Ajustar</Submit>
              </form>

              <div className="flex gap-2 flex-wrap items-end">
                {t.status === "pendente" && (
                  <form action={tarefaDesnecessaria.bind(null, t.id)} className="flex gap-2 items-end">
                    <input type="hidden" name="volta" value={volta} />
                    <Campo rotulo="Por que não precisa"><input name="motivo" className={CAMPO + " w-56"} /></Campo>
                    <Submit ocupado="..." className={BOTAO}>Desnecessária</Submit>
                  </form>
                )}
                <form action={apagarTarefa.bind(null, t.id)}>
                  <input type="hidden" name="volta" value={volta} />
                  <Submit ocupado="..." className={PERIGO}>Apagar (só sem tempo)</Submit>
                </form>
              </div>

              <form action={criarTarefaAvulsa.bind(null, t.evento_id)} className="flex gap-2 items-end flex-wrap pt-2 border-t border-linha-2">
                <input type="hidden" name="volta" value={volta} />
                <Campo rotulo="Criar tarefa neste evento">
                  <select name="atividade" required className={CAMPO}>
                    {(atividades ?? []).map((a) => <option key={a.codigo} value={a.codigo}>{a.rotulo}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Quem">
                  <select name="escalado" required defaultValue="" className={CAMPO}>
                    <option value="" disabled>escolha</option>
                    {time.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Dupla">
                  <select name="dupla" defaultValue="" className={CAMPO}>
                    <option value="">sem dupla</option>
                    {time.map((p) => <option key={p.id} value={p.id}>+ {p.nome}</option>)}
                  </select>
                </Campo>
                <Campo rotulo="Prazo"><input name="prazo" type="date" required defaultValue={t.evento?.data} className={CAMPO} /></Campo>
                <Campo rotulo="Estimativa (min)"><input name="estimativa" type="number" min={1} placeholder="taxa" className={CAMPO + " w-24"} /></Campo>
                <Submit ocupado="..." className={BOTAO}>Criar</Submit>
              </form>
            </div>
          </details>
        </div>
      ))}
    </section>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] text-tinta-4">{rotulo}</span>
      {children}
    </label>
  );
}
