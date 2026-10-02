import { createHash, randomBytes, randomInt } from "crypto";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { ROTULO_ATIVIDADE } from "@/lib/semana";

// Notch nativo (042): o app do Windows não tem sessão no site. Ele pareia uma vez com um
// código de uso único e depois fala com /api/notch/* levando o token do próprio aparelho.
// Código e token só são guardados como sha256. Tudo aqui roda com a service role, então
// cada função recebe a pessoa já autenticada e só toca nas coisas dela.

type Admin = ReturnType<typeof criarClienteAdmin>;

export const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// Sem 0/O e 1/I/L: a pessoa digita o código olhando pra outra tela.
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const novoCodigo = () => Array.from({ length: 8 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
export const normalizarCodigo = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, "");
export const codigoLegivel = (c: string) => `${c.slice(0, 4)}-${c.slice(4)}`;
export const novoToken = () => randomBytes(32).toString("base64url");

/** Gera um código pra pessoa logada no site. Os anteriores dela que não foram usados caducam. */
export async function gerarCodigo(admin: Admin, pessoaId: string) {
  await admin.from("notch_codigos").delete().eq("pessoa_id", pessoaId).is("usado_em", null);
  const codigo = novoCodigo();
  const { data, error } = await admin.from("notch_codigos")
    .insert({ codigo_hash: sha256(codigo), pessoa_id: pessoaId }).select("expira_em").single();
  if (error) throw new Error(error.message);
  return { codigo: codigoLegivel(codigo), expiraEm: data.expira_em as string };
}

/** Troca o código por um token de aparelho. Uso único: a marca de uso é condicional. */
export async function parear(admin: Admin, codigoDigitado: string, nomeAparelho: string) {
  const codigo = normalizarCodigo(codigoDigitado);
  if (codigo.length !== 8) return { erro: "O código tem 8 letras e números." } as const;
  const { data: usado } = await admin.from("notch_codigos")
    .update({ usado_em: new Date().toISOString() })
    .eq("codigo_hash", sha256(codigo)).is("usado_em", null).gt("expira_em", new Date().toISOString())
    .select("pessoa_id").maybeSingle();
  if (!usado) return { erro: "Código inválido ou vencido. Gere outro no site, em Conectar o notch." } as const;

  const token = novoToken();
  const { error } = await admin.from("notch_dispositivos").insert({
    pessoa_id: usado.pessoa_id, token_hash: sha256(token), nome: nomeAparelho.slice(0, 60) || "Windows",
  });
  if (error) throw new Error(error.message);
  const { data: pessoa } = await admin.from("pessoas").select("nome").eq("id", usado.pessoa_id).single();
  return { token, nome: pessoa?.nome ?? "" } as const;
}

/** Quem é o aparelho, pelo `Authorization: Bearer`. Null se não tem token, é desconhecido ou foi desconectado. */
export async function aparelhoDaRequisicao(admin: Admin, req: Request) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.get("authorization") ?? "");
  if (!m) return null;
  const { data } = await admin.from("notch_dispositivos")
    .select("id, pessoa_id").eq("token_hash", sha256(m[1])).is("revogado_em", null).maybeSingle();
  if (!data) return null;
  await admin.from("notch_dispositivos").update({ ultimo_uso_em: new Date().toISOString() }).eq("id", data.id);
  return { dispositivoId: data.id as string, pessoaId: data.pessoa_id as string };
}

export type TarefaNotch = {
  id: string; titulo: string; sub: string; prazoEm: string;
  estimativaMin: number; segundos: number; correndoDesde: string | null;
};

const titulo = (atividade: string, frente?: { nome: string } | null) =>
  `${ROTULO_ATIVIDADE[atividade] ?? atividade} · ${frente?.nome ?? ""}`;
const um = <T,>(x: T | T[] | null) => (Array.isArray(x) ? x[0] : x) ?? null;

/**
 * O que o notch mostra. Mesma conta do notch web, no (app)/layout.tsx: a tarefa da última
 * sessão da pessoa, se ainda está pendente; rodando = sessão sem fim. Mais as próximas da
 * semana dela (escalada ou dupla), pra poder começar uma sem abrir o site.
 */
export async function estadoDe(admin: Admin, pessoaId: string) {
  const { data: pessoa } = await admin.from("pessoas").select("nome").eq("id", pessoaId).single();

  let tarefa: TarefaNotch | null = null;
  const { data: ultima } = await admin.from("sessoes").select("tarefa_id, inicio, fim")
    .eq("pessoa_id", pessoaId).order("inicio", { ascending: false }).limit(1).maybeSingle();
  if (ultima) {
    const { data: t } = await admin.from("tarefas")
      .select("id, atividade, estimativa_min, prazo_em, status, frentes ( nome ), eventos ( competicao )")
      .eq("id", ultima.tarefa_id).maybeSingle();
    if (t && t.status === "pendente") {
      const { data: tempo } = await admin.from("v_tempo_tarefa").select("segundos_total").eq("tarefa_id", t.id).maybeSingle();
      tarefa = {
        id: t.id, titulo: titulo(t.atividade, um(t.frentes)), sub: um(t.eventos)?.competicao ?? "",
        prazoEm: t.prazo_em, estimativaMin: t.estimativa_min,
        segundos: Number(tempo?.segundos_total ?? 0),
        correndoDesde: ultima.fim ? null : ultima.inicio,
      };
    }
  }

  const hoje = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const { data: abertas } = await admin.from("tarefas")
    .select("id, atividade, prazo_em, frentes ( nome ), eventos ( competicao )")
    .eq("status", "pendente").lte("abre_em", hoje)
    .or(`escalado_id.eq.${pessoaId},dupla_id.eq.${pessoaId}`)
    .order("prazo_em").limit(4);
  const proximas = (abertas ?? []).filter((t) => t.id !== tarefa?.id).slice(0, 3).map((t) => ({
    id: t.id, titulo: titulo(t.atividade, um(t.frentes)), sub: um(t.eventos)?.competicao ?? "", prazoEm: t.prazo_em,
  }));

  return { pareado: true, pessoa: { nome: pessoa?.nome ?? "" }, tarefa, proximas };
}

async function fecharAberta(admin: Admin, pessoaId: string, motivo: string) {
  const { error } = await admin.from("sessoes")
    .update({ fim: new Date().toISOString(), motivo_fim: motivo })
    .eq("pessoa_id", pessoaId).is("fim", null);
  if (error) throw new Error(`não consegui fechar a sessão: ${error.message}`);
}

/** Igual ao iniciar() do site: trocar de tarefa fecha a anterior, nunca duas correndo. */
export async function iniciarComo(admin: Admin, pessoaId: string, tarefaId: string) {
  const { data: t } = await admin.from("tarefas").select("status").eq("id", tarefaId).maybeSingle();
  if (!t) throw new Error("tarefa não encontrada");
  if (t.status !== "pendente") throw new Error("essa tarefa já foi fechada");
  await fecharAberta(admin, pessoaId, "troca");
  const { error } = await admin.from("sessoes").insert({ tarefa_id: tarefaId, pessoa_id: pessoaId });
  if (error) throw new Error(error.message);
}

export async function pausarComo(admin: Admin, pessoaId: string) {
  await fecharAberta(admin, pessoaId, "pausa");
}
