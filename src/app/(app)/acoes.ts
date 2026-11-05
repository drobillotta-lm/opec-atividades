"use server";

import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";
import { sincronizarEscala, PISO } from "@/lib/escala/sincronizar";

/** Classificou a frente de uma competição ou de um evento: as tarefas nascem agora, não na sync
 * da hora seguinte (Daniel viu "tem entrega mas nenhuma tarefa" logo depois de classificar, 14/10).
 * gerar_tarefas não tem execute para authenticated; vai pela service role, só depois da checagem
 * de papel que as ações abaixo já fazem via RLS (só gestor altera competicoes/eventos). */
async function gerarTarefasAgora() {
  const fim = new Date();
  fim.setDate(fim.getDate() + 21);
  const { error } = await criarClienteAdmin().rpc("gerar_tarefas", { p_inicio: PISO, p_fim: fim.toISOString().slice(0, 10) });
  if (error) throw new Error(`gerar tarefas: ${error.message}`);
  revalidatePath("/semana");
  revalidatePath("/frente");
}

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

  await concluirTarefa(supabase, pessoa.id, tarefaId, minutosAlterados(formData),
    String(formData.get("quem") || ""), String(formData.get("comentario") || "").trim());
  revalidatePath("/semana");
  revalidatePath("/frente");
}

/** Minutos que a pessoa DIGITOU na entrega, ou null se ela confirmou o número que veio
 * preenchido (`sugerido`). Sem isso, o tempo entre abrir o diálogo e confirmar virava ajuste
 * negativo e o total ficava menor que o do notch (05/11). */
function minutosAlterados(formData: FormData): number | null {
  const informado = Math.round(Number(formData.get("minutos")));
  if (!Number.isFinite(informado)) return null;
  const bruto = formData.get("sugerido");
  if (bruto !== null && Math.round(Number(bruto)) === informado) return null;
  return informado;
}

/** Miolo da entrega, usado pela entrega de uma tarefa e pela do lote (054): confere o tempo
 * informado contra o medido (a diferença vira ajuste), decide quem fez e fecha a tarefa. */
async function concluirTarefa(supabase: Supabase, pessoaId: string, tarefaId: string,
                              informado: number | null, quem: string, comentario: string) {
  const { data: tarefa } = await supabase
    .from("tarefas").select("prazo_em, escalado_id, dupla_id").eq("id", tarefaId).single();
  const { data: tempo } = await supabase
    .from("v_tempo_tarefa").select("segundos_total").eq("tarefa_id", tarefaId).maybeSingle();

  const medido = Math.round(Number(tempo?.segundos_total ?? 0) / 60);
  if (informado !== null && informado !== medido) {
    await supabase.from("ajustes_tempo").insert({
      tarefa_id: tarefaId,
      pessoa_id: pessoaId,
      minutos_delta: informado - medido,
      motivo: "tempo confirmado na entrega",
    });
  }

  const souDaTarefa = tarefa && (pessoaId === tarefa.escalado_id || pessoaId === tarefa.dupla_id);
  const quemFez = quem || (souDaTarefa ? pessoaId : tarefa?.escalado_id) || pessoaId;
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
}

/** "Iniciar juntas" (054): uma sessão por tarefa, todas com o mesmo lote_id, cada uma com a
 * fração do tempo = estimativa / soma das estimativas. Recusa se alguma já está rodando pra mim. */
export async function iniciarLote(ids: string[]) {
  const { supabase, pessoa } = await eu();
  const unicos = [...new Set(ids)].filter(Boolean);
  if (unicos.length < 2) throw new Error("marque pelo menos duas atividades");
  const { data: tarefas } = await supabase.from("tarefas").select("id, estimativa_min, status").in("id", unicos);
  const pendentes = (tarefas ?? []).filter((t) => t.status === "pendente");
  if (pendentes.length !== unicos.length) throw new Error("alguma delas não está mais pendente; recarregue a página");
  const { data: abertas } = await supabase
    .from("sessoes").select("tarefa_id").eq("pessoa_id", pessoa.id).in("tarefa_id", unicos).is("fim", null);
  if (abertas?.length) throw new Error("uma delas já está com o cronômetro ligado; pause antes de juntar");
  const total = pendentes.reduce((soma, t) => soma + t.estimativa_min, 0);
  const loteId = globalThis.crypto.randomUUID();
  const { error } = await supabase.from("sessoes").insert(pendentes.map((t) => ({
    tarefa_id: t.id, pessoa_id: pessoa.id, lote_id: loteId,
    fracao: total > 0 ? t.estimativa_min / total : 1 / pendentes.length,
  })));
  if (error) throw new Error(error.message);
  revalidarTempo();
}

/** "Começar do zero" pelo site (04/11), igual ao notch: tarefa registrada no nome de quem
 * pediu, já rodando. A função do banco não tem execute para authenticated; a pessoa vem da
 * sessão (eu()), nunca do formulário. */
export async function comecarDoZeroSite(formData: FormData) {
  const { pessoa } = await eu();
  const titulo = String(formData.get("titulo") || "").trim().slice(0, 120);
  if (!titulo) throw new Error("diga o que você vai fazer");
  const frente = String(formData.get("frente") || "");
  const { error } = await criarClienteAdmin().rpc("notch_comecar_do_zero", {
    p_pessoa: pessoa.id, p_titulo: titulo, p_frente_sigla: frente,
  });
  if (error) throw new Error(error.message);
  revalidarTempo();
}

/** Cancelar um início por engano (04/11): apaga só a MINHA sessão aberta nessas tarefas (o
 * tempo de antes fica). Com `tudo`, apaga também todas as minhas sessões e ajustes nelas, como
 * se eu nunca tivesse começado; o tempo de outras pessoas fica. Tarefa começada do zero que
 * sobrar sem tempo nenhum some. A RLS (minhas_sessoes, meus_ajustes, apaga_tarefa_registrada)
 * garante que só mexe no que é da pessoa. */
async function descartarMeuTempo(supabase: Supabase, pessoaId: string,
                                 filtro: { tarefaId?: string; loteId?: string }, tudo: boolean) {
  let q = supabase.from("sessoes").delete().eq("pessoa_id", pessoaId).is("fim", null);
  q = filtro.loteId ? q.eq("lote_id", filtro.loteId) : q.eq("tarefa_id", filtro.tarefaId!);
  const { data: apagadas, error } = await q.select("tarefa_id");
  if (error) throw new Error(`nao consegui cancelar: ${error.message}`);
  const ids = [...new Set([...(apagadas ?? []).map((s) => s.tarefa_id), ...(filtro.tarefaId ? [filtro.tarefaId] : [])])];
  if (!ids.length) return;

  if (tudo) {
    const [rS, rA] = await Promise.all([
      supabase.from("sessoes").delete().eq("pessoa_id", pessoaId).in("tarefa_id", ids),
      supabase.from("ajustes_tempo").delete().eq("pessoa_id", pessoaId).in("tarefa_id", ids),
    ]);
    if (rS.error) throw new Error(`nao consegui apagar o tempo: ${rS.error.message}`);
    if (rA.error) throw new Error(`nao consegui apagar os ajustes: ${rA.error.message}`);
  }

  const { data: registradas } = await supabase
    .from("tarefas").select("id").in("id", ids).eq("origem", "registrada").eq("status", "pendente");
  for (const t of registradas ?? []) {
    const [{ count: sess }, { count: aj }, { count: partes }] = await Promise.all([
      supabase.from("sessoes").select("id", { count: "exact", head: true }).eq("tarefa_id", t.id),
      supabase.from("ajustes_tempo").select("id", { count: "exact", head: true }).eq("tarefa_id", t.id),
      supabase.from("subtarefas").select("id", { count: "exact", head: true }).eq("tarefa_id", t.id),
    ]);
    if (!sess && !aj && !partes) await supabase.from("tarefas").delete().eq("id", t.id).eq("origem", "registrada");
  }
}

export async function cancelarInicio(tarefaId: string, formData: FormData) {
  const { supabase, pessoa } = await eu();
  await descartarMeuTempo(supabase, pessoa.id, { tarefaId }, formData.get("tudo") === "1");
  revalidarTempo();
}

export async function cancelarLote(loteId: string, formData: FormData) {
  const { supabase, pessoa } = await eu();
  await descartarMeuTempo(supabase, pessoa.id, { loteId }, formData.get("tudo") === "1");
  revalidarTempo();
}

/** Atividade já pausada: apaga todo o meu tempo nela (sessões e ajustes meus). */
export async function zerarMeuTempo(tarefaId: string) {
  const { supabase, pessoa } = await eu();
  await descartarMeuTempo(supabase, pessoa.id, { tarefaId }, true);
  revalidarTempo();
}

export async function pausarLote(loteId: string) {
  const { supabase, pessoa } = await eu();
  const { error } = await supabase
    .from("sessoes")
    .update({ fim: new Date().toISOString(), motivo_fim: "pausa" })
    .eq("pessoa_id", pessoa.id).eq("lote_id", loteId).is("fim", null);
  if (error) throw new Error(`nao consegui pausar o lote: ${error.message}`);
  revalidarTempo();
}

/** Entrega do lote: fecha as sessões, lê o medido de cada tarefa (já rateado pela fração) e,
 * se a pessoa informou outro total, distribui a diferença na proporção do medido (ou por
 * igual, se nada foi medido). Mesmo "quem fez" e comentário para todas. */
export async function entregarLote(loteId: string, formData: FormData) {
  const { supabase, pessoa } = await eu();
  const { data: sessoes } = await supabase
    .from("sessoes").select("tarefa_id").eq("pessoa_id", pessoa.id).eq("lote_id", loteId);
  const ids = [...new Set((sessoes ?? []).map((s) => s.tarefa_id))];
  if (ids.length === 0) throw new Error("lote não encontrado");
  const { error: eFechar } = await supabase
    .from("sessoes")
    .update({ fim: new Date().toISOString(), motivo_fim: "entrega" })
    .eq("pessoa_id", pessoa.id).eq("lote_id", loteId).is("fim", null);
  if (eFechar) throw new Error(`nao consegui fechar o lote: ${eFechar.message}`);

  const { data: tempos } = await supabase.from("v_tempo_tarefa").select("tarefa_id, segundos_total").in("tarefa_id", ids);
  const medidoPor = new Map((tempos ?? []).map((t) => [t.tarefa_id, Number(t.segundos_total ?? 0) / 60]));
  const totalMedido = ids.reduce((soma, id) => soma + (medidoPor.get(id) ?? 0), 0);
  const informado = minutosAlterados(formData) ?? NaN;
  const quem = String(formData.get("quem") || "");
  const comentario = String(formData.get("comentario") || "").trim();

  // Rateio do total informado: proporcional ao medido; sem medida, por igual. Arredonda e joga
  // a sobra na última pra soma bater.
  const alvo = new Map<string, number | null>();
  if (Number.isFinite(informado)) {
    let distribuido = 0;
    ids.forEach((id, i) => {
      const parte = totalMedido > 0 ? (medidoPor.get(id) ?? 0) / totalMedido : 1 / ids.length;
      const m = i === ids.length - 1 ? informado - distribuido : Math.round(informado * parte);
      distribuido += m;
      alvo.set(id, m);
    });
  }
  for (const id of ids) {
    await concluirTarefa(supabase, pessoa.id, id, alvo.get(id) ?? null, quem, comentario);
  }
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
  await gerarTarefasAgora();
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");
}

/** Competição já classificada mudou de frente (Quadra Aberta estava em Programas e é de
 * Olímpicos, 27/10): a trigger da 013 leva os eventos; mover_tarefas_da_competicao (052) leva as
 * tarefas pendentes (quem já lançou tempo continua dono); gerar_tarefas cria o que só existe na
 * cadeia nova. */
export async function reclassificarCompeticao(nome: string, formData: FormData) {
  const { supabase, pessoa } = await eu();
  if (pessoa.papel !== "gestor") throw new Error("só gestor muda a frente de uma competição");
  const frenteId = String(formData.get("frente_id") || "");
  if (!frenteId) return;
  const { data: comp, error } = await supabase
    .from("competicoes").update({ frente_id: frenteId }).eq("nome", nome).select("id").single();
  if (error) throw new Error(error.message);
  const { error: eMover } = await criarClienteAdmin().rpc("mover_tarefas_da_competicao", { p_competicao: comp.id });
  if (eMover) throw new Error(`mover tarefas: ${eMover.message}`);
  await gerarTarefasAgora();
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");
}

/** Regra por nome (053): evento que chega da Matriz sem competição mas cujo nome contém o
 * texto (ex.: "quadra aberta") pertence à competição escolhida e herda a frente dela. A sync
 * reaplica a cada hora. Aplica agora para o que já está no banco. */
export async function criarRegraPorNome(formData: FormData) {
  const { pessoa } = await eu();
  if (pessoa.papel !== "gestor") throw new Error("só gestor cria regra por nome");
  const texto = String(formData.get("padrao") || "").trim().toLowerCase();
  const competicaoId = String(formData.get("competicao_id") || "");
  if (!texto || !competicaoId) return;
  const admin = criarClienteAdmin();
  const { error } = await admin.from("competicao_por_nome")
    .insert({ padrao: texto.includes("%") ? texto : `%${texto}%`, competicao_id: competicaoId });
  if (error) throw new Error(error.message);
  const { error: eAplicar } = await admin.rpc("encaixar_competicao_por_nome");
  if (eAplicar) throw new Error(`aplicar regra: ${eAplicar.message}`);
  await gerarTarefasAgora();
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");
}

/** Apagar a regra não desfaz o que ela já encaixou: na sync seguinte o evento volta a ficar sem
 * competição, mas mantém a frente que recebeu (Outros só pega quem está sem frente). */
export async function apagarRegraPorNome(id: string) {
  const { pessoa } = await eu();
  if (pessoa.papel !== "gestor") throw new Error("só gestor apaga regra por nome");
  const { error } = await criarClienteAdmin().from("competicao_por_nome").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
}

/** Competição que não vale (sem entrega, teste, lixo da Matriz): sai da lista "sem frente" e os
 * eventos dela somem da Gestão de eventos. Não apaga nada: a sync continua trazendo os eventos
 * e dá pra voltar atrás com reativarCompeticao. (Daniel, 14/10) */
export async function descartarCompeticao(nome: string) {
  const { supabase, pessoa } = await eu();
  if (pessoa.papel !== "gestor") throw new Error("só gestor descarta competição");
  const { error } = await supabase.from("competicoes").update({ ativa: false }).eq("nome", nome);
  if (error) throw new Error(error.message);
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");
}

export async function reativarCompeticao(nome: string) {
  const { supabase, pessoa } = await eu();
  if (pessoa.papel !== "gestor") throw new Error("só gestor reativa competição");
  const { error } = await supabase.from("competicoes").update({ ativa: true }).eq("nome", nome);
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
  await gerarTarefasAgora();
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
  // Frente recém-criada ainda não tem cadeia nem líder: gerar_tarefas devolve sem_escalado e
  // nada nasce até o gestor montar a cadeia em /admin/organizar. Chamar mesmo assim não custa.
  await gerarTarefasAgora();
  revalidatePath("/admin");
  revalidatePath("/admin/eventos");
}

/** Exclui uma tarefa começada do zero (origem 'registrada') — a RLS da 050 só deixa apagar a
 * própria e só essa origem. Tarefa de cadeia não se apaga: a sync recria; use "não necessária". */
export async function excluirTarefaRegistrada(tarefaId: string) {
  const { supabase } = await eu();
  const { error, count } = await supabase
    .from("tarefas").delete({ count: "exact" }).eq("id", tarefaId).eq("origem", "registrada");
  if (error) throw new Error(error.message);
  if (!count) throw new Error("só dá pra excluir tarefa começada do zero, e só a sua");
  revalidarTempo();
}

/** Renomear atividade começada do zero (05/11): o nome digitado no notch/site às vezes sai
 * apressado. Só `origem='registrada'`; tarefa da cadeia tem nome montado pelo evento. A RLS
 * (escreve_tarefas) limita a quem está na tarefa, ao líder da frente e ao gestor. */
export async function renomearTarefaRegistrada(tarefaId: string, formData: FormData) {
  const { supabase } = await eu();
  const titulo = String(formData.get("titulo") || "").trim().slice(0, 120);
  if (!titulo) throw new Error("o nome não pode ficar vazio");
  const { error, count } = await supabase
    .from("tarefas").update({ titulo }, { count: "exact" }).eq("id", tarefaId).eq("origem", "registrada");
  if (error) throw new Error(error.message);
  if (!count) throw new Error("só dá pra renomear atividade começada do zero");
  revalidarTempo();
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
