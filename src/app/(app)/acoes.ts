"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function eu() {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("sem sessão");
  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome, papel").eq("auth_user_id", user.id).single();
  if (!pessoa) throw new Error("fora do time");
  return { supabase, pessoa };
}

/** Fecha a sessao aberta da pessoa, se houver. Uma por pessoa, garantido por indice. */
async function fecharAberta(supabase: Awaited<ReturnType<typeof criarClienteServidor>>, pessoaId: string, motivo: string) {
  const { error } = await supabase
    .from("sessoes")
    .update({ fim: new Date().toISOString(), motivo_fim: motivo })
    .eq("pessoa_id", pessoaId)
    .is("fim", null);
  if (error) throw new Error(`nao consegui fechar a sessao: ${error.message}`);
}

export async function iniciar(tarefaId: string) {
  const { supabase, pessoa } = await eu();
  // Trocar de tarefa encerra a anterior, nunca deixa duas correndo.
  await fecharAberta(supabase, pessoa.id, "troca");
  const { error } = await supabase
    .from("sessoes")
    .insert({ tarefa_id: tarefaId, pessoa_id: pessoa.id });
  if (error) throw new Error(error.message);
  revalidatePath("/semana");
}

export async function pausar() {
  const { supabase, pessoa } = await eu();
  await fecharAberta(supabase, pessoa.id, "pausa");
  revalidatePath("/semana");
}

export async function entregar(tarefaId: string, formData: FormData) {
  const { supabase, pessoa } = await eu();

  // Fechar a sessao antes de ler o tempo, senao o ultimo trecho nao conta.
  await fecharAberta(supabase, pessoa.id, "entrega");

  const { data: tarefa } = await supabase
    .from("tarefas").select("prazo_em, escalado_id").eq("id", tarefaId).single();
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

  const quemFez = String(formData.get("quem") || "") || tarefa?.escalado_id || pessoa.id;
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

export async function ajustarTempo(tarefaId: string, minutos: number, motivo: string) {
  const { supabase, pessoa } = await eu();
  if (!minutos || !motivo.trim()) throw new Error("ajuste precisa de minutos e motivo");
  const { error } = await supabase
    .from("ajustes_tempo")
    .insert({ tarefa_id: tarefaId, pessoa_id: pessoa.id, minutos_delta: minutos, motivo: motivo.trim() });
  if (error) throw new Error(error.message);
  revalidatePath("/semana");
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

/** O lider ou o gestor diz se o evento tem entrega comercial. */
export async function definirEntrega(eventoId: string, tem: boolean) {
  const { supabase } = await eu();
  const { error } = await supabase
    .from("eventos")
    .update({ entrega: tem, entrega_origem: "lider" })
    .eq("id", eventoId);
  if (error) throw new Error(error.message);
  revalidatePath("/frente");
  revalidatePath("/admin/eventos");
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
