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
  frente: string | null; // na Escala isso é o Detentor (fórmula), não a frente daqui
  tem_entrega: "sim" | "nao" | "indefinido" | null;
  status_airtable: string | null;
  excluido_em: string | null;
};
type CompeticaoEscala = { competicao: string; frente_codigo: string | null };
type FrenteEscala = { codigo: string; lider_pessoa_id: string | null };
type PessoaEscala = { id: string; email: string | null; tipo: string | null; nome_exibicao: string | null };
type AlocacaoEscala = { pessoa_id: string; eventos: { data: string; competicao: string | null } | null };

export type ResumoSincronizacao = {
  eventos: number;
  competicoes_novas: number;
  competicoes_classificadas: number;
  lideres_atualizados: number;
  plantoes: number;
  plantao_sem_pessoa: string[];
  tarefas: { criadas: number; ja_existiam: number; sem_escalado: number; aguardando_entrega: number; ignorados: number } | null;
  canceladas: { apagadas: number; marcadas_na: number } | null;
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

export async function sincronizarEscala(): Promise<ResumoSincronizacao> {
  const escala = criarClienteEscala();
  const admin = criarClienteAdmin();

  // --- leitura da Escala, tudo de uma vez ---------------------------------------------
  const [rEventos, rCompeticoes, rFrentes, rPessoas, rAlocacoes] = await Promise.all([
    escala.from("eventos")
      .select("id, airtable_id, data, hora_inicio, competicao, jogo, frente, tem_entrega, status_airtable, excluido_em")
      .gte("data", PISO).order("data"),
    escala.from("competicoes").select("competicao, frente_codigo"),
    escala.from("frentes").select("codigo, lider_pessoa_id"),
    escala.from("pessoas").select("id, email, tipo, nome_exibicao"),
    escala.from("alocacoes")
      .select("pessoa_id, eventos!inner(data, competicao)")
      .eq("funcao", "plantao").in("status", ["confirmada", "realizada"])
      .gte("eventos.data", PISO),
  ]);
  falha("ler eventos da Escala", rEventos.error);
  falha("ler competições da Escala", rCompeticoes.error);
  falha("ler frentes da Escala", rFrentes.error);
  falha("ler pessoas da Escala", rPessoas.error);
  falha("ler alocações da Escala", rAlocacoes.error);

  const eventos = (rEventos.data ?? []) as EventoEscala[];
  const competicoesEscala = (rCompeticoes.data ?? []) as CompeticaoEscala[];
  const frentesEscala = (rFrentes.data ?? []) as FrenteEscala[];
  const pessoasEscala = new Map(((rPessoas.data ?? []) as PessoaEscala[]).map((p) => [p.id, p]));
  const alocacoes = (rAlocacoes.data ?? []) as unknown as AlocacaoEscala[];

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
  const rLocais = await admin.from("competicoes").select("id, nome, frente_id");
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
    competicao: e.competicao || "",
    competicao_id: e.competicao ? idCompeticaoPorNome.get(e.competicao) ?? null : null,
    data: e.data,
    inicio_brt: e.hora_inicio ? `${e.data}T${e.hora_inicio}-03:00` : null,
    tipo: classificarTipo(e.jogo),
    status_origem: e.excluido_em ? "Cancelado" : e.status_airtable ?? "Manual",
    detentor: e.frente,
    sincronizado_em: new Date().toISOString(),
  }));
  if (linhasEvento.length) {
    const { error } = await admin.from("eventos").upsert(linhasEvento, { onConflict: "airtable_record_id" });
    falha("upsert eventos", error);
  }
  // Evento que ja existia sem frente quando a competicao foi classificada (029).
  falha("herdar_frente_da_competicao", (await admin.rpc("herdar_frente_da_competicao")).error);

  // 4) a decisão "tem entrega?" da Escala, guardada contra o que o líder já resolveu aqui
  for (const valor of ["sim", "nao"] as const) {
    const chaves = eventos.filter((e) => e.tem_entrega === valor).map(chaveDoEvento);
    if (!chaves.length) continue;
    const { error } = await admin.from("eventos")
      .update({ entrega: valor === "sim", entrega_origem: "escala" })
      .in("airtable_record_id", chaves)
      .or("entrega_origem.is.null,entrega_origem.neq.lider");
    falha(`marcar entrega (${valor})`, error);
  }

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

  // 7) tarefas da janela tocada, e as de evento cancelado
  const fim = new Date();
  fim.setDate(fim.getDate() + DIAS_A_FRENTE);
  const rGerar = await admin.rpc("gerar_tarefas", { p_inicio: PISO, p_fim: fim.toISOString().slice(0, 10) });
  falha("gerar_tarefas", rGerar.error);
  const rCancel = await admin.rpc("desfazer_tarefas_de_evento_cancelado");
  falha("desfazer cancelados", rCancel.error);

  return {
    eventos: linhasEvento.length,
    competicoes_novas: competicoesNovas,
    competicoes_classificadas: competicoesClassificadas,
    lideres_atualizados: lideresAtualizados,
    plantoes: linhasPlantao.length,
    plantao_sem_pessoa: [...semPessoa],
    tarefas: (rGerar.data as ResumoSincronizacao["tarefas"][])?.[0] ?? null,
    canceladas: (rCancel.data as ResumoSincronizacao["canceladas"][])?.[0] ?? null,
  };
}
