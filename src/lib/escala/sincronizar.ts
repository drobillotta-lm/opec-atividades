import { criarClienteAdmin } from "@/lib/supabase/admin";
import { criarClienteEscala } from "./cliente";

// Lê o banco da Escala direto e espelha aqui o que este app precisa: eventos (com a
// decisão de entrega), competição × frente, líderes e o plantão confirmado dos fixos.
// Depois gera as tarefas da janela e desfaz as de evento cancelado. Idempotente: pode
// rodar de hora em hora e a qualquer clique.
//
// Mapa, eventos, plantões, líderes e a classificação de competição só entram por aqui,
// com a service role (docs/02-modelo-dados.md).

export const PISO = "2026-09-21"; // o app não conta carga antes disso (supabase/README.md)
const DIAS_A_FRENTE = 21;

type EventoEscala = {
  id: string;
  airtable_id: string | null;
  data: string;
  hora_inicio: string | null;
  competicao: string | null;
  jogo: string | null;
  confronto: string | null; // "Vasco da Gama X Flamengo" (Escala 067); null quando a Matriz não diz
  frente: string | null; // na Escala isso é o Detentor (fórmula), não a frente daqui
  tem_entrega: "sim" | "nao" | "indefinido" | null;
  status_airtable: string | null;
  excluido_em: string | null;
};
type CompeticaoEscala = {
  competicao: string;
  frente_codigo: string | null;
  entrega_padrao: "sim" | "nao" | null;
  entrega_termos_sim: unknown;
};
type FrenteEscala = { codigo: string; lider_pessoa_id: string | null };
type PessoaEscala = { id: string; email: string | null; tipo: string | null; nome_exibicao: string | null };
type AlocacaoEscala = { pessoa_id: string; eventos: { data: string; competicao: string | null } | null };

export type ResumoSincronizacao = {
  lidos: { eventos: number; competicoes: number; frentes: number; pessoas: number; alocacoes: number };
  eventos: number;
  eventos_sem_competicao: number;
  padroes_entrega_atualizados: number;
  entrega: { sim: number; nao: number; indefinido: number };
  entrega_aplicada: { marcadas_sim: number; marcadas_nao: number; voltaram_indefinido: number } | null;
  competicoes_novas: number;
  competicoes_classificadas: number;
  cadeias_compactos: number;
  lideres_atualizados: number;
  plantoes: number;
  plantao_sem_pessoa: string[];
  tarefas: { criadas: number; ja_existiam: number; sem_escalado: number; aguardando_entrega: number; ignorados: number } | null;
  canceladas: { apagadas: number; marcadas_na: number } | null;
  fora_da_cadeia: { apagadas: number; marcadas_na: number } | null;
  reaplicadas: { competencia: string; reescaladas: number; sem_mapa: number; divergentes_com_tempo: number }[];
  sem_entrega: { apagadas: number; marcadas_na: number; reabertas: number } | null;
  duracao_ms: number;
};

// Mesma classificação das migrations 011/019: a Matriz não tem campo próprio, o tipo
// vem do texto do jogo.
function classificarTipo(jogo: string | null): string {
  const j = jogo || "";
  if (/^reprise/i.test(j) || /\|\s*reprise/i.test(j)) return "reprise";
  if (/^grava/i.test(j)) return "gravacao";
  if (/^externa/i.test(j)) return "externa";
  if (/\[sem narra/i.test(j)) return "sem_narracao";
  if (/pré jogo/i.test(j)) return "pre_jogo";
  return "normal";
}

function diaUtilOuFds(data: string): "du" | "fds" {
  const dow = new Date(data + "T12:00:00-03:00").getDay(); // meio-dia foge de qualquer virada de fuso
  return dow === 0 || dow === 6 ? "fds" : "du";
}

// Evento manual da Escala não tem airtable_id; a chave local passa a ser a identidade da
// Escala nesses casos, em vez de o evento simplesmente sumir (como fazia a exportação).
const chaveDoEvento = (e: EventoEscala) => e.airtable_id ?? `escala:${e.id}`;

function falha(passo: string, error: { message: string } | null) {
  if (error) throw new Error(`${passo}: ${error.message}`);
}

// O PostgREST corta em 1000 linhas sem avisar; a Escala ganha ~100 eventos por semana e
// passa disso em novembro. Varre em paginas, com ordem estavel (a ultima coluna e unica).
// ESCALA_PAGINA so existe pra testar a paginacao com pagina pequena.
const PAGINA = Number(process.env.ESCALA_PAGINA) || 1000;
type Pagina = PromiseLike<{ data: unknown[] | null; error: { message: string } | null }>;
async function tudo<T>(passo: string, montar: (de: number, ate: number) => Pagina): Promise<T[]> {
  const linhas: T[] = [];
  for (let de = 0; ; de += PAGINA) {
    const { data, error } = await montar(de, de + PAGINA - 1);
    falha(passo, error);
    linhas.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGINA) return linhas;
  }
}

const LOTE_UPSERT = 500;

/** Roda a sincronizacao e grava o resultado (ou o erro) em `sincronizacoes` (038). */
export async function sincronizarEscala(disparo: "relogio" | "botao"): Promise<ResumoSincronizacao> {
  const admin = criarClienteAdmin();
  const inicio = Date.now();
  const { data: registro } = await admin.from("sincronizacoes").insert({ disparo }).select("id").single();
  const fechar = async (campos: { ok: boolean; resumo?: ResumoSincronizacao; erro?: string }) => {
    if (registro) await admin.from("sincronizacoes").update({ terminada_em: new Date().toISOString(), ...campos }).eq("id", registro.id);
    const limite = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString();
    await admin.from("sincronizacoes").delete().lt("iniciada_em", limite);
  };
  try {
    const resumo = { ...(await executar()), duracao_ms: Date.now() - inicio };
    await fechar({ ok: true, resumo });
    return resumo;
  } catch (e) {
    await fechar({ ok: false, erro: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

async function executar(): Promise<Omit<ResumoSincronizacao, "duracao_ms">> {
  const escala = criarClienteEscala();
  const admin = criarClienteAdmin();

  // --- leitura da Escala, tudo de uma vez, paginada ----------------------------------
  const [eventos, competicoesEscala, frentesEscala, listaPessoas, alocacoes] = await Promise.all([
    tudo<EventoEscala>("ler eventos da Escala", (de, ate) => escala.from("eventos")
      .select("id, airtable_id, data, hora_inicio, competicao, jogo, frente, tem_entrega, status_airtable, excluido_em, confronto")
      .gte("data", PISO).order("data").order("id").range(de, ate)),
    tudo<CompeticaoEscala>("ler competições da Escala", (de, ate) => escala.from("competicoes")
      .select("competicao, frente_codigo, entrega_padrao, entrega_termos_sim").order("id").range(de, ate)),
    tudo<FrenteEscala>("ler frentes da Escala", (de, ate) => escala.from("frentes")
      .select("codigo, lider_pessoa_id").order("codigo").range(de, ate)),
    tudo<PessoaEscala>("ler pessoas da Escala", (de, ate) => escala.from("pessoas")
      .select("id, email, tipo, nome_exibicao").order("id").range(de, ate)),
    tudo<AlocacaoEscala>("ler alocações da Escala", (de, ate) => escala.from("alocacoes")
      .select("pessoa_id, eventos!inner(data, competicao)")
      .eq("funcao", "plantao").in("status", ["confirmada", "realizada"])
      .gte("eventos.data", PISO).order("id").range(de, ate)),
  ]);
  const pessoasEscala = new Map(listaPessoas.map((p) => [p.id, p]));

  // --- cadastros locais -------------------------------------------------------------------
  const [rFrentesLocais, rPessoasLocais] = await Promise.all([
    admin.from("frentes").select("id, sigla, lider_id"),
    admin.from("pessoas").select("id, email, h_dia"),
  ]);
  falha("ler frentes", rFrentesLocais.error);
  falha("ler pessoas", rPessoasLocais.error);
  const frentePorSigla = new Map((rFrentesLocais.data ?? []).map((f) => [f.sigla, f]));
  const pessoaPorEmail = new Map((rPessoasLocais.data ?? []).filter((p) => p.email).map((p) => [p.email.toLowerCase(), p]));

  // 1) competições: nome novo entra sem frente; o que a Escala já classificou e aqui
  //    ainda está sem frente recebe a frente de lá (o gatilho 013 propaga aos eventos).
  const nomesCompeticao = [...new Set(eventos.map((e) => e.competicao).filter(Boolean))] as string[];
  const { count: antes } = await admin.from("competicoes").select("id", { count: "exact", head: true });
  if (nomesCompeticao.length) {
    const { error } = await admin.from("competicoes")
      .upsert(nomesCompeticao.map((nome) => ({ nome, origem: "airtable" })), { onConflict: "nome", ignoreDuplicates: true });
    falha("upsert competições", error);
  }
  const rLocais = await admin.from("competicoes").select("id, nome, frente_id, entrega_padrao");
  falha("ler competições", rLocais.error);
  const competicoesLocais = rLocais.data ?? [];
  const competicoesNovas = competicoesLocais.length - (antes ?? 0);

  const frenteEscalaPorNome = new Map(competicoesEscala.filter((c) => c.frente_codigo).map((c) => [c.competicao, c.frente_codigo!]));
  let competicoesClassificadas = 0;
  for (const c of competicoesLocais) {
    if (c.frente_id) continue;
    const frente = frentePorSigla.get(frenteEscalaPorNome.get(c.nome) ?? "");
    if (!frente) continue;
    const { error } = await admin.from("competicoes").update({ frente_id: frente.id }).eq("id", c.id);
    falha(`classificar ${c.nome}`, error);
    c.frente_id = frente.id;
    competicoesClassificadas++;
  }
  const idCompeticaoPorNome = new Map(competicoesLocais.map((c) => [c.nome, c.id]));

  //    Toda competicao "Compacto..." com frente ganha cadeia propria (materiais 24 h antes do
  //    inicio + auditoria, do lider) -- regra provisoria do Daniel (046) ate o Yuri modelar.
  const rCompactos = await admin.rpc("garantir_cadeia_compactos", { p_vigente_de: new Date().toISOString().slice(0, 10) });
  falha("garantir_cadeia_compactos", rCompactos.error);
  const cadeiasCompactos = (rCompactos.data as number | null) ?? 0;

  //    O padrao de entrega e o oficial da Escala (escala.competicoes.entrega_padrao).
  //    Competicao com termos de 'sim' (a Escala decide pelo texto do jogo) fica
  //    'lider_decide' aqui: a decisao vem por evento, no passo 4.
  const padraoEscalaPorNome = new Map(competicoesEscala.map((c) => {
    const temTermos = Array.isArray(c.entrega_termos_sim) && c.entrega_termos_sim.length > 0;
    return [c.competicao, temTermos || !c.entrega_padrao ? "lider_decide" : c.entrega_padrao];
  }));
  let padroesAtualizados = 0;
  for (const c of competicoesLocais) {
    const padrao = padraoEscalaPorNome.get(c.nome);
    if (!padrao || padrao === c.entrega_padrao) continue;
    const { error } = await admin.from("competicoes").update({ entrega_padrao: padrao }).eq("id", c.id);
    falha(`padrão de entrega de ${c.nome}`, error);
    padroesAtualizados++;
  }

  // 2) líderes: só quando a Escala tem um; nunca apaga o que está aqui.
  let lideresAtualizados = 0;
  for (const f of frentesEscala) {
    const email = f.lider_pessoa_id ? pessoasEscala.get(f.lider_pessoa_id)?.email?.toLowerCase() : null;
    const pessoa = email ? pessoaPorEmail.get(email) : undefined;
    const local = frentePorSigla.get(f.codigo);
    if (!pessoa || !local || local.lider_id === pessoa.id) continue;
    const { error } = await admin.from("frentes").update({ lider_id: pessoa.id }).eq("id", local.id);
    falha(`líder de ${f.codigo}`, error);
    lideresAtualizados++;
  }

  // 3) eventos: campos base sempre atualizam. Excluído na Escala vira Cancelado aqui,
  //    e a 028 desfaz a tarefa. entrega/entrega_origem ficam para o passo 4.
  const linhasEvento = eventos.map((e) => ({
    airtable_record_id: chaveDoEvento(e),
    evento_id_origem: e.jogo || chaveDoEvento(e),
    confronto: e.confronto || null,
    competicao: e.competicao || "",
    competicao_id: e.competicao ? idCompeticaoPorNome.get(e.competicao) ?? null : null,
    data: e.data,
    inicio_brt: e.hora_inicio ? `${e.data}T${e.hora_inicio}-03:00` : null,
    tipo: classificarTipo(e.jogo),
    status_origem: e.excluido_em ? "Cancelado" : e.status_airtable ?? "Manual",
    detentor: e.frente,
    entrega_escala: e.tem_entrega ?? "indefinido",
    sincronizado_em: new Date().toISOString(),
  }));
  for (let i = 0; i < linhasEvento.length; i += LOTE_UPSERT) {
    const { error } = await admin.from("eventos")
      .upsert(linhasEvento.slice(i, i + LOTE_UPSERT), { onConflict: "airtable_record_id" });
    falha("upsert eventos", error);
  }
  // Evento que ja existia sem frente quando a competicao foi classificada (029).
  falha("herdar_frente_da_competicao", (await admin.rpc("herdar_frente_da_competicao")).error);

  // 4) a decisão "tem entrega?" da Escala (gravada crua no passo 3): sim/não valem,
  //    indefinido desfaz o que a Escala tinha decidido; o que o líder resolveu aqui fica (036).
  const rEntrega = await admin.rpc("aplicar_entrega_da_escala");
  falha("aplicar_entrega_da_escala", rEntrega.error);

  // 5) o que ninguém decidiu ainda cai no padrão da competição (mesma regra da 014)
  falha("aplicar_previsao_entrega", (await admin.rpc("aplicar_previsao_entrega")).error);

  // 6) plantão dos fixos — um registro por pessoa e dia (é o que a unique garante):
  //    duas alocações no mesmo dia não dobram a carga, é o mesmo turno.
  const porDia = new Map<string, { pessoa_id: string; data: string; competicoes: Set<string>; h_dia: number }>();
  const semPessoa = new Set<string>();
  for (const a of alocacoes) {
    const pe = pessoasEscala.get(a.pessoa_id);
    if (!pe || pe.tipo !== "fixo" || !a.eventos) continue;
    const pessoa = pe.email ? pessoaPorEmail.get(pe.email.toLowerCase()) : undefined;
    if (!pessoa) { semPessoa.add(pe.nome_exibicao ?? pe.email ?? a.pessoa_id); continue; }
    const chave = `${pessoa.id}|${a.eventos.data}`;
    const atual = porDia.get(chave) ?? { pessoa_id: pessoa.id, data: a.eventos.data, competicoes: new Set<string>(), h_dia: Number(pessoa.h_dia) };
    if (a.eventos.competicao) atual.competicoes.add(a.eventos.competicao);
    porDia.set(chave, atual);
  }
  const linhasPlantao = [...porDia.values()].map((p) => {
    const tipo = diaUtilOuFds(p.data);
    return {
      pessoa_id: p.pessoa_id, data: p.data, tipo,
      competicao: [...p.competicoes].join(" + ") || null,
      horas: tipo === "du" ? 4.5 : p.h_dia,
      importado_em: new Date().toISOString(),
    };
  });
  if (linhasPlantao.length) {
    const { error } = await admin.from("plantoes").upsert(linhasPlantao, { onConflict: "pessoa_id,data" });
    falha("upsert plantões", error);
  }

  // 7) tarefas da janela tocada, as de evento cancelado, as que sairam da cadeia
  //    vigente (032) e o dono das pendentes realinhado ao mapa (mes corrente e o seguinte).
  //    Cada funcao numa chamada propria: gerar_tarefas usa temp table.
  const fim = new Date();
  fim.setDate(fim.getDate() + DIAS_A_FRENTE);
  const rGerar = await admin.rpc("gerar_tarefas", { p_inicio: PISO, p_fim: fim.toISOString().slice(0, 10) });
  falha("gerar_tarefas", rGerar.error);
  const rCancel = await admin.rpc("desfazer_tarefas_de_evento_cancelado");
  falha("desfazer cancelados", rCancel.error);
  const rSemEntrega = await admin.rpc("desfazer_tarefas_sem_entrega");
  falha("desfazer sem entrega", rSemEntrega.error);
  const rFora = await admin.rpc("desfazer_tarefas_fora_da_cadeia");
  falha("desfazer fora da cadeia", rFora.error);
  const hoje = new Date();
  const competencias = [0, 1].map((n) =>
    new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + n, 1)).toISOString().slice(0, 10));
  const reaplicadas: ResumoSincronizacao["reaplicadas"] = [];
  for (const competencia of competencias) {
    const r = await admin.rpc("reaplicar_mapa", { p_competencia: competencia });
    falha(`reaplicar mapa ${competencia}`, r.error);
    const linha = (r.data as Omit<ResumoSincronizacao["reaplicadas"][number], "competencia">[])?.[0];
    if (linha) reaplicadas.push({ competencia, ...linha });
  }

  const contar = (v: string) => eventos.filter((e) => (e.tem_entrega ?? "indefinido") === v).length;
  return {
    lidos: { eventos: eventos.length, competicoes: competicoesEscala.length, frentes: frentesEscala.length,
             pessoas: listaPessoas.length, alocacoes: alocacoes.length },
    eventos: linhasEvento.length,
    eventos_sem_competicao: eventos.filter((e) => !e.competicao).length,
    padroes_entrega_atualizados: padroesAtualizados,
    entrega: { sim: contar("sim"), nao: contar("nao"), indefinido: contar("indefinido") },
    entrega_aplicada: (rEntrega.data as ResumoSincronizacao["entrega_aplicada"][])?.[0] ?? null,
    competicoes_novas: competicoesNovas,
    competicoes_classificadas: competicoesClassificadas,
    cadeias_compactos: cadeiasCompactos,
    lideres_atualizados: lideresAtualizados,
    plantoes: linhasPlantao.length,
    plantao_sem_pessoa: [...semPessoa],
    tarefas: (rGerar.data as ResumoSincronizacao["tarefas"][])?.[0] ?? null,
    canceladas: (rCancel.data as ResumoSincronizacao["canceladas"][])?.[0] ?? null,
    fora_da_cadeia: (rFora.data as ResumoSincronizacao["fora_da_cadeia"][])?.[0] ?? null,
    reaplicadas,
    sem_entrega: (rSemEntrega.data as ResumoSincronizacao["sem_entrega"][])?.[0] ?? null,
  };
}
