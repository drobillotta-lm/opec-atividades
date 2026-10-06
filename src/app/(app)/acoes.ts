"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { sincronizarEscala } from "@/lib/escala/sincronizar";

async function eu() {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("sem sessão");
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome, papel").eq("auth_user_id", user.id).single();
  if (!pessoa) throw new Error("fora do time");
  return { supabase, pessoa };
}

type Supabase = Awaited<ReturnType<typeof criarClienteServidor>>;

/** Fecha a minha sessao aberta NESTA tarefa, se houver. Desde a 044 (06/10) a pessoa pode ter
 * varios cronometros ligados, um por tarefa: fechar "a aberta da pessoa" fecharia os outros. */
async function fecharSessao(supabase: Supabase, pessoaId: string, tarefaId: string, motivo: string) {
  const { error } = await supabase
    .from("sessoes")
    .update({ fim: new Date().toISOString(), motivo_fim: motivo })
    .eq("pessoa_id", pessoaId)
    .eq("tarefa_id", tarefaId)
    .is("fim", null);
  if (error) throw new Error(`nao consegui fechar a sessao: ${error.message}`);
}

export async function iniciar(tarefaId: string) {
  const { supabase, pessoa } = await eu();
  // Nao fecha mais as outras: cada tarefa tem o seu relogio. Idempotente: duas abas ou um
  // clique duplo nao abrem segunda sessao na mesma tarefa (o indice da 044 tambem recusa).
  const { data: aberta } = await supabase
    .from("sessoes").select("id").eq("pessoa_id", pessoa.id).eq("tarefa_id", tarefaId).is("fim", null).maybeSingle();
  if (!aberta) {
    const { error } = await supabase
      .from("sessoes")
      .insert({ tarefa_id: tarefaId, pessoa_id: pessoa.id });
    if (error && error.code !== "23505") throw new Error(error.message);
  }
  revalidarTempo();
}

export async function pausar(tarefaId: string) {
  const { supabase, pessoa } = await eu();
  await fecharSessao(supabase, pessoa.id, tarefaId, "pausa");
  revalidarTempo();
}

export async function entregar(tarefaId: string, formData: FormData) {
  const { supabase, pessoa } = await eu();

  // Fechar a sessao desta tarefa antes de ler o tempo, senao o ultimo trecho nao conta.
  // SO desta: entregar A nao pode parar o relogio de B.
  await fecharSessao(supabase, pessoa.id, tarefaId, "entrega");

  const { data: tarefa } = await supabase
    .from("tarefas").select("prazo_em, escalado_id, dupla_id").eq("id", tarefaId).single();
  const { data: tempo } = await supabase
    .from("v_tempo_tarefa").select("segundos_total").eq("tarefa_id", tarefaId).maybeSingle();

  const medido = Math.round(Number(tempo?.segundos_total ?? 0) / 60);
  const informado = Math.round(Number(formData.get("minutos")));
  if (Number.isFinite(informado) && informado !== medido) {
    await supabase.from("ajustes_tempo").insert({
      tarefa_id: tarefaId,
      pessoa_id: pessoa.id,
      minutos_delta: informado - medido,
      motivo: "tempo confirmado na entrega",
    });
  }

  const souDaTarefa = tarefa && (pessoa.id === tarefa.escalado_id || pessoa.id === tarefa.dupla_id);
  const quemFez = String(formData.get("quem") || "") || (souDaTarefa ? pessoa.id : tarefa?.escalado_id) || pessoa.id;
  const comentario = String(formData.get("comentario") || "").trim();
  const agora = new Date();
  const noPrazo = tarefa ? agora <= new Date(tarefa.prazo_em) : true;

  const { error } = await supabase
    .from("tarefas")
    .update({
      status: noPrazo ? "entregue" : "fora_do_prazo",
      concluida_em: agora.toISOString(),
      responsavel_real_id: quemFez,
      obs: comentario || null,
    })
    .eq("id", tarefaId);
  if (error) throw new Error(error.message);
  revalidatePath("/semana");
  revalidatePath("/frente");
}

export async function ajustarTempo(tarefaId: string, formData: FormData) {
  const { supabase, pessoa } = await eu();
  const minutos = Math.round(Number(formData.get("minutos")));
  const motivo = String(formData.get("motivo") || "").trim();
  if (!minutos || !motivo) throw new Error("ajuste precisa de minutos e motivo");
  const { error } = await supabase
    .from("ajustes_tempo")
    .insert({ tarefa_id: tarefaId, pessoa_id: pessoa.id, minutos_delta: minutos, motivo });
  if (error) throw new Error(error.message);
  revalidatePath("/semana");
  revalidatePath("/frente");
  revalidatePath("/painel");
}

export async function sair() {
  const supabase = await criarClienteServidor();
  await supabase.auth.signOut();
}

/** O lider resolve a linha: quem de fato executou. Desvio e responsavel != escalado. */
export async function definirQuemFez(tarefaId: string, formData: FormData) {
  const { supabase } = await eu();
  const quem = String(formData.get("pessoa") ?? "");
  if (!quem) return;
  const { data: tarefa } = await supabase
    .from("tarefas").select("prazo_em, status").eq("id", tarefaId).single();
  const noPrazo = tarefa ? new Date() <= new Date(tarefa.prazo_em) : true;
  const { error } = await supabase
    .from("tarefas")
    .update({
      responsavel_real_id: quem,
      status: tarefa?.status === "pendente" ? (noPrazo ? "entregue" : "fora_do_prazo") : tarefa?.status,
      concluida_em: tarefa?.status === "pendente" ? new Date().toISOString() : undefined,
    })
    .eq("id", tarefaId);
  if (error) throw new Error(error.message);
  revalidatePath("/frente");
}

/** O gestor classifica uma competição nova, que chega sem frente até alguém decidir. */
export async function classificarCompeticao(nome: string, formData: FormData) {
  const { supabase } = await eu();
  const frenteId = String(formData.get("frente_id") || "");
  if (!frenteId) return;
  const { error } = await supabase.from("competicoes").update({ frente_id: frenteId }).eq("nome", nome);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");
}

/** Tarefa começada do zero pelo notch sem frente (044): o gestor encaixa numa frente pela
 * tela, no bloco "Sem frente" de Minha frente e do Quadro. */
export async function definirFrenteDaTarefa(tarefaId: string, formData: FormData) {
  const { supabase, pessoa } = await eu();
  if (pessoa.papel !== "gestor") throw new Error("só gestor classifica tarefa sem frente");
  const frenteId = String(formData.get("frente_id") || "");
  if (!frenteId) return;
  const { error } = await supabase.from("tarefas").update({ frente_id: frenteId }).eq("id", tarefaId);
  if (error) throw new Error(error.message);
  revalidarTempo();
}

/** Só um evento específico, não a competição inteira — o caso "esse é diferente dos outros". */
export async function classificarEvento(eventoId: string, formData: FormData) {
  const { supabase } = await eu();
  const frenteId = String(formData.get("frente_id") || "");
  if (!frenteId) return;
  const { error } = await supabase.from("eventos").update({ frente_id: frenteId }).eq("id", eventoId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/eventos");
}

/** Competição nova que ainda não tem frente cadastrada — cria e já classifica de uma vez. */
export async function criarFrenteEClassificar(nomeCompeticao: string, formData: FormData) {
  const { supabase } = await eu();
  const nome = String(formData.get("nome_frente") || "").trim();
  const sigla = String(formData.get("sigla") || "").trim().toUpperCase();
  const regime = String(formData.get("regime") || "rotacao_mensal");
  if (!nome || !sigla) throw new Error("frente precisa de nome e sigla");

  const { data: frente, error: erroFrente } = await supabase
    .from("frentes").insert({ nome, sigla, regime }).select("id").single();
  if (erroFrente) throw new Error(erroFrente.message);

  const { error } = await supabase.from("competicoes").update({ frente_id: frente.id }).eq("nome", nomeCompeticao);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");
}

/** Tarefa que não precisa acontecer (ex.: sem material novo para materiais/sincronização
 * cobrirem) — deixa de contar sem virar "entregue", que seria mentir sobre o que aconteceu. */
export async function marcarDesnecessaria(tarefaId: string, formData: FormData) {
  const { supabase } = await eu();
  const motivo = String(formData.get("motivo") || "").trim();
  const { error } = await supabase
    .from("tarefas")
    .update({ status: "na", excecao: "desnecessaria", excecao_desc: motivo || null, concluida_em: new Date().toISOString() })
    .eq("id", tarefaId);
  if (error) throw new Error(error.message);
  revalidatePath("/semana");
  revalidatePath("/frente");
  revalidatePath("/kanban");
}

export async function reverterDesnecessaria(tarefaId: string) {
  const { supabase } = await eu();
  const { error } = await supabase
    .from("tarefas")
    .update({ status: "pendente", excecao: null, excecao_desc: null, concluida_em: null })
    .eq("id", tarefaId);
  if (error) throw new Error(error.message);
  revalidatePath("/semana");
  revalidatePath("/frente");
  revalidatePath("/kanban");
}

/** Botão do Admin: a mesma sincronização que o relógio roda de hora em hora. */
export async function sincronizarAgora() {
  const { pessoa } = await eu();
  if (pessoa.papel !== "gestor") throw new Error("só gestor sincroniza");
  await sincronizarEscala("botao");
  for (const rota of ["/admin", "/admin/eventos", "/semana", "/frente", "/kanban", "/painel"]) revalidatePath(rota);
}

// ---------------------------------------------------------------------------------
// Sub-tarefas (030): parte de uma tarefa, com nome, dono e cronômetro próprio. O tempo
// soma na tarefa-mãe porque a sessão continua apontando para ela.

const ROTAS_DE_TEMPO = ["/semana", "/frente", "/kanban", "/painel", "/dock"];
function revalidarTempo() { for (const r of ROTAS_DE_TEMPO) revalidatePath(r); }

export async function criarSubtarefa(tarefaId: string, formData: FormData) {
  const { supabase, pessoa } = await eu();
  const titulo = String(formData.get("titulo") || "").trim();
  if (!titulo) return;
  const quem = String(formData.get("pessoa") || "") || pessoa.id;
  const { error } = await supabase
    .from("subtarefas")
    .insert({ tarefa_id: tarefaId, titulo, pessoa_id: quem, criada_por: pessoa.id });
  if (error) throw new Error(error.message);
  revalidarTempo();
}

export async function iniciarSubtarefa(subtarefaId: string) {
  const { supabase, pessoa } = await eu();
  const { data: parte } = await supabase.from("subtarefas").select("tarefa_id").eq("id", subtarefaId).single();
  if (!parte) throw new Error("parte não encontrada");
  // Uma sessao aberta por (pessoa, tarefa): trocar de parte DENTRO da mesma tarefa fecha o
  // trecho anterior com 'troca'. As outras tarefas seguem correndo.
  const { data: aberta } = await supabase
    .from("sessoes").select("id, subtarefa_id").eq("pessoa_id", pessoa.id).eq("tarefa_id", parte.tarefa_id).is("fim", null).maybeSingle();
  if (aberta?.subtarefa_id === subtarefaId) { revalidarTempo(); return; }
  if (aberta) await fecharSessao(supabase, pessoa.id, parte.tarefa_id, "troca");
  const { error } = await supabase
    .from("sessoes")
    .insert({ tarefa_id: parte.tarefa_id, pessoa_id: pessoa.id, subtarefa_id: subtarefaId });
  if (error) throw new Error(error.message);
  revalidarTempo();
}

export async function concluirSubtarefa(subtarefaId: string) {
  const { supabase, pessoa } = await eu();
  // Se eu estava cronometrando esta parte, o trecho fecha junto.
  await supabase.from("sessoes")
    .update({ fim: new Date().toISOString(), motivo_fim: "entrega" })
    .eq("pessoa_id", pessoa.id).eq("subtarefa_id", subtarefaId).is("fim", null);
  const { error } = await supabase
    .from("subtarefas")
    .update({ status: "feita", concluida_em: new Date().toISOString() })
    .eq("id", subtarefaId);
  if (error) throw new Error(error.message);
  revalidarTempo();
}

export async function reabrirSubtarefa(subtarefaId: string) {
  const { supabase } = await eu();
  const { error } = await supabase
    .from("subtarefas").update({ status: "pendente", concluida_em: null }).eq("id", subtarefaId);
  if (error) throw new Error(error.message);
  revalidarTempo();
}

/** Só apaga parte sem tempo registrado: tempo gasto é dado, não se apaga. */
export async function apagarSubtarefa(subtarefaId: string) {
  const { supabase } = await eu();
  const { count } = await supabase
    .from("sessoes").select("id", { count: "exact", head: true }).eq("subtarefa_id", subtarefaId);
  if (count) throw new Error("esta parte já tem tempo registrado; conclua em vez de apagar");
  const { error } = await supabase.from("subtarefas").delete().eq("id", subtarefaId);
  if (error) throw new Error(error.message);
  revalidarTempo();
}
