"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { PISO } from "@/lib/escala/sincronizar";

// Tela /admin/organizar: so gestor. As funcoes do banco (040) nao tem execute pra
// authenticated; aqui checa o papel e chama com a service role.

async function gestor() {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("sem sessão");
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome, papel").eq("auth_user_id", user.id).single();
  if (!pessoa || pessoa.papel !== "gestor") throw new Error("só gestor organiza mapa, atividades e tarefas");
  return { admin: criarClienteAdmin(), pessoa };
}

const ROTAS = ["/admin", "/admin/organizar", "/admin/eventos", "/semana", "/frente", "/kanban", "/painel", "/dock"];

/** Roda o trabalho, revalida e volta pra mesma tela com a mensagem (ou o erro) na URL. */
async function fazer(formData: FormData, trabalho: () => Promise<string>) {
  const volta = String(formData.get("volta") || "/admin/organizar");
  let param: string;
  try {
    param = `msg=${encodeURIComponent(await trabalho())}`;
  } catch (e) {
    param = `erro=${encodeURIComponent(e instanceof Error ? e.message : String(e))}`;
  }
  for (const r of ROTAS) revalidatePath(r);
  const base = volta.replace(/([?&])(msg|erro)=[^&]*/g, "$1").replace(/[?&]+$/, "");
  redirect(`${base}${base.includes("?") ? "&" : "?"}${param}`);
}

function ok<T>(r: { data: T; error: { message: string } | null }, passo: string): T {
  if (r.error) throw new Error(`${passo}: ${r.error.message}`);
  return r.data;
}

const texto = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const inteiro = (f: FormData, k: string) => {
  const v = texto(f, k);
  if (v === "") return null;
  const n = Number(v);
  if (!Number.isInteger(n)) throw new Error(`${k} precisa ser um número inteiro`);
  return n;
};
const fimDoDiaBRT = (dataISO: string) => `${dataISO}T23:59:59-03:00`;
const dataBR = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7);
const hojeISO = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
function maisDias(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

type Reaplicado = { reescaladas: number; sem_mapa: number; divergentes_com_tempo: number };
const resumoReaplicar = (r: Reaplicado | undefined) =>
  r ? `${r.reescaladas} tarefas mudaram de dono${r.sem_mapa ? `, ${r.sem_mapa} sem mapa` : ""}${r.divergentes_com_tempo ? `, ${r.divergentes_com_tempo} com tempo ficaram com o dono antigo` : ""}` : "";

// --- Mapa ------------------------------------------------------------------------------

/** Salva a grade do mês: cada célula `p|SIGLA|atividade` (pessoa) e `d|SIGLA|atividade` (dupla). */
export async function salvarMapa(competencia: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin, pessoa } = await gestor();
    const atuais = ok(await admin.from("mapa")
      .select("atividade, pessoa_id, dupla_id, frentes ( sigla )").eq("competencia", competencia), "ler mapa");
    const atual = new Map((atuais ?? []).map((m) => {
      const f = Array.isArray(m.frentes) ? m.frentes[0] : m.frentes;
      return [`${f?.sigla}|${m.atividade}`, m];
    }));
    const origem = `definido em /admin/organizar por ${pessoa.nome} em ${dataBR(hojeISO())}`;
    let mudou = 0;
    let ultimo: Reaplicado | undefined;
    for (const [chave] of formData.entries()) {
      if (!chave.startsWith("p|")) continue;
      const [, sigla, atividade] = chave.split("|");
      const pessoaId = texto(formData, chave) || null;
      const duplaId = texto(formData, `d|${sigla}|${atividade}`) || null;
      const antes = atual.get(`${sigla}|${atividade}`);
      if (!pessoaId) {
        if (antes) {
          ok(await admin.rpc("limpar_mapa", { p_sigla: sigla, p_codigo: atividade, p_competencia: competencia }), "limpar célula");
          mudou++;
        }
        continue;
      }
      if (duplaId === pessoaId) throw new Error(`${sigla} · ${atividade}: a dupla não pode ser a mesma pessoa`);
      if (antes && antes.pessoa_id === pessoaId && (antes.dupla_id ?? null) === duplaId) continue;
      const r = ok(await admin.rpc("definir_mapa", {
        p_sigla: sigla, p_codigo: atividade, p_competencia: competencia,
        p_pessoa: pessoaId, p_dupla: duplaId, p_origem: origem,
      }), `definir ${sigla} · ${atividade}`) as Reaplicado[];
      ultimo = r?.[0];
      mudou++;
    }
    if (!mudou) return "Nada mudou no mapa.";
    if (!ultimo) {
      ultimo = (ok(await admin.rpc("reaplicar_mapa", { p_competencia: competencia }), "reaplicar") as Reaplicado[])?.[0];
    }
    return `${mudou} células salvas. ${resumoReaplicar(ultimo)}.`;
  });
}

export async function copiarMesAnterior(competencia: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin, pessoa } = await gestor();
    const d = new Date(competencia + "T12:00:00Z");
    const anterior = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
    const n = ok(await admin.rpc("copiar_mapa", {
      p_de: anterior, p_para: competencia,
      p_origem: `provisorio: copiado de ${anterior.slice(0, 7)} por ${pessoa.nome} em ${dataBR(hojeISO())}`,
    }), "copiar mapa") as number;
    const r = (ok(await admin.rpc("reaplicar_mapa", { p_competencia: competencia }), "reaplicar") as Reaplicado[])?.[0];
    return `${n} células copiadas de ${anterior.slice(0, 7)}. ${resumoReaplicar(r)}.`;
  });
}

export async function reaplicarAgora(competencia: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    const r = (ok(await admin.rpc("reaplicar_mapa", { p_competencia: competencia }), "reaplicar") as Reaplicado[])?.[0];
    return `Mapa reaplicado: ${resumoReaplicar(r)}.`;
  });
}

// --- Atividades --------------------------------------------------------------------------

/** Gera as tarefas que a mudança de cadeia/taxa abriu, sem esperar o relógio. */
async function gerarAgora(admin: ReturnType<typeof criarClienteAdmin>) {
  const r = ok(await admin.rpc("gerar_tarefas", { p_inicio: PISO, p_fim: maisDias(hojeISO(), 21) }), "gerar tarefas") as { criadas: number }[];
  return r?.[0]?.criadas ?? 0;
}

export async function novaAtividade(formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    const codigo = texto(formData, "codigo").toLowerCase();
    if (!/^[a-z][a-z_]{1,39}$/.test(codigo)) throw new Error("código: só letras minúsculas e _ (ex.: corte_redes)");
    const frentes = formData.getAll("frentes").map(String);
    if (!frentes.length) throw new Error("escolha pelo menos uma frente");
    const minutos = inteiro(formData, "minutos");
    if (!minutos || minutos <= 0) throw new Error("taxa em minutos precisa ser maior que zero");
    const n = ok(await admin.rpc("criar_atividade", {
      p_codigo: codigo, p_rotulo: texto(formData, "rotulo") || codigo, p_minutos: minutos, p_frentes: frentes,
      p_abre_offset: inteiro(formData, "abre") ?? 0, p_prazo_offset: inteiro(formData, "prazo") ?? 2,
      p_vigente_de: texto(formData, "vigente_de") || hojeISO(),
    }), "criar atividade") as number;
    const criadas = await gerarAgora(admin);
    return `Atividade ${codigo} entrou em ${n} frente(s). ${criadas} tarefas criadas. Falta pôr gente no mapa dela.`;
  });
}

export async function encerrarAtividade(codigo: string, sigla: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    const aPartir = texto(formData, "a_partir");
    if (!aPartir) throw new Error("diga a partir de quando");
    ok(await admin.rpc("encerrar_atividade_na_frente", { p_codigo: codigo, p_sigla: sigla, p_a_partir: aPartir }), "encerrar");
    const r = (ok(await admin.rpc("desfazer_tarefas_fora_da_cadeia"), "desfazer") as { apagadas: number; marcadas_na: number }[])?.[0];
    return `${codigo} encerrada em ${sigla} a partir de ${dataBR(aPartir)}. ${r?.apagadas ?? 0} tarefas apagadas, ${r?.marcadas_na ?? 0} com tempo viraram "não aplicável".`;
  });
}

export async function reabrirAtividade(codigo: string, sigla: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    const aPartir = texto(formData, "a_partir") || hojeISO();
    const n = ok(await admin.rpc("reabrir_atividade_na_frente", { p_codigo: codigo, p_sigla: sigla, p_a_partir: aPartir }), "reabrir") as number;
    if (!n) throw new Error(`${codigo} já está em vigor em ${sigla} nessa data`);
    const criadas = await gerarAgora(admin);
    return `${codigo} volta em ${sigla} a partir de ${dataBR(aPartir)}. ${criadas} tarefas criadas.`;
  });
}

export async function alterarTaxa(codigo: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    const minutos = inteiro(formData, "minutos");
    if (!minutos || minutos <= 0) throw new Error("taxa em minutos precisa ser maior que zero");
    const vigente = texto(formData, "vigente_de") || hojeISO();
    const n = ok(await admin.rpc("alterar_taxa", {
      p_codigo: codigo, p_minutos: minutos, p_vigente_de: vigente, p_fonte: texto(formData, "fonte"),
    }), "alterar taxa") as number;
    return `Taxa de ${codigo}: ${minutos} min a partir de ${dataBR(vigente)}. ${n} tarefas pendentes atualizadas.`;
  });
}

export async function alterarJanela(codigo: string, sigla: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    const abre = inteiro(formData, "abre"), prazo = inteiro(formData, "prazo");
    if (abre === null || prazo === null) throw new Error("preencha abre e prazo (dias relativos ao evento)");
    if (prazo < abre) throw new Error("o prazo não pode vir antes da abertura");
    const n = ok(await admin.rpc("alterar_janela", { p_codigo: codigo, p_sigla: sigla, p_abre_offset: abre, p_prazo_offset: prazo }), "alterar janela") as number;
    return `Janela de ${codigo} em ${sigla}: ${abre} a ${prazo} dias. ${n} tarefas pendentes reposicionadas.`;
  });
}

// --- Tarefas -----------------------------------------------------------------------------

export async function redirecionarTarefa(tarefaId: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    const escalado = texto(formData, "escalado");
    const dupla = texto(formData, "dupla") || null;
    if (!escalado) throw new Error("escolha pra quem vai");
    if (dupla === escalado) throw new Error("a dupla não pode ser a mesma pessoa");
    ok(await admin.rpc("redirecionar_tarefa", { p_tarefa: tarefaId, p_escalado: escalado, p_dupla: dupla, p_motivo: texto(formData, "motivo") }), "redirecionar");
    return "Tarefa redirecionada. A sincronização não devolve ela pro mapa.";
  });
}

export async function ajustarTarefa(tarefaId: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    const prazo = texto(formData, "prazo");
    const estimativa = inteiro(formData, "estimativa");
    if (!prazo && estimativa === null) throw new Error("mude o prazo, a estimativa ou os dois");
    if (estimativa !== null && estimativa <= 0) throw new Error("estimativa precisa ser maior que zero");
    ok(await admin.rpc("alterar_tarefa", {
      p_tarefa: tarefaId, p_prazo_em: prazo ? fimDoDiaBRT(prazo) : null,
      p_estimativa_min: estimativa, p_motivo: texto(formData, "motivo"),
    }), "ajustar tarefa");
    return "Tarefa ajustada.";
  });
}

export async function tarefaDesnecessaria(tarefaId: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    ok(await admin.from("tarefas").update({
      status: "na", excecao: "desnecessaria", excecao_desc: texto(formData, "motivo") || null,
      concluida_em: new Date().toISOString(),
    }).eq("id", tarefaId), "marcar desnecessária");
    return "Tarefa marcada como desnecessária.";
  });
}

export async function apagarTarefa(tarefaId: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    ok(await admin.rpc("apagar_tarefa", { p_tarefa: tarefaId }), "apagar");
    return "Tarefa apagada.";
  });
}

export async function criarTarefaAvulsa(eventoId: string, formData: FormData) {
  await fazer(formData, async () => {
    const { admin } = await gestor();
    const escalado = texto(formData, "escalado");
    const dupla = texto(formData, "dupla") || null;
    const prazo = texto(formData, "prazo");
    if (!escalado || !prazo) throw new Error("escolha quem faz e o prazo");
    if (dupla === escalado) throw new Error("a dupla não pode ser a mesma pessoa");
    ok(await admin.rpc("criar_tarefa_avulsa", {
      p_evento: eventoId, p_atividade: texto(formData, "atividade"), p_escalado: escalado, p_dupla: dupla,
      p_prazo_em: fimDoDiaBRT(prazo), p_estimativa_min: inteiro(formData, "estimativa"),
    }), "criar tarefa");
    return "Tarefa criada neste evento.";
  });
}
