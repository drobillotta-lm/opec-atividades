import { createHash, randomBytes, randomInt } from "crypto";
import { criarClienteAdmin } from "@/lib/supabase/admin";

// Notch nativo (042, 043): o app do Windows não tem sessão no site. Ele pareia uma vez com um
// código de uso único e depois fala com /api/notch/* levando o token do próprio aparelho.
// Código e token só são guardados como sha256. Tudo aqui roda com a service role, então
// cada função recebe a pessoa já autenticada e só toca nas coisas dela.
// Cada clique é UMA chamada ao banco (funções notch_* da 043): a lentidão vinha das ~10
// idas e voltas da Vercel ao Supabase por ação.

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

/** Pessoa dona do aparelho, pelo `Authorization: Bearer`. Null se não tem token, é desconhecido ou foi desconectado. */
export async function pessoaDoAparelho(admin: Admin, req: Request) {
  const m = /^Bearer\s+(\S+)$/.exec(req.headers.get("authorization") ?? "");
  if (!m) return null;
  const { data } = await admin.rpc("notch_aparelho", { p_token_hash: sha256(m[1]) });
  return (data as string | null) ?? null;
}

async function rpc(admin: Admin, fn: string, args: Record<string, unknown>) {
  const { data, error } = await admin.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as Record<string, unknown>;
}

/** { pareado, pessoa, correndo[], pausadas[], proximas[], atrasadas[], frentes, tarefa }:
 * o formato que /notch-app usa (044). `tarefa` = correndo[0] ?? pausadas[0], compatibilidade
 * com o notch-app anterior; sai na próxima migration. */
export const estadoDe = (admin: Admin, pessoaId: string) => rpc(admin, "notch_estado", { p_pessoa: pessoaId });
/** Liga o relógio desta tarefa sem mexer nos outros (044: vários cronômetros por pessoa). */
export const iniciarComo = (admin: Admin, pessoaId: string, tarefaId: string) =>
  rpc(admin, "notch_iniciar", { p_pessoa: pessoaId, p_tarefa: tarefaId });
/** Com tarefa: pausa só ela. Sem: pausa tudo (notch 0.2.0 ainda chama assim). Se a 044 ainda
 * não estiver no banco (função não existe), cai no "pausar tudo" em vez de falhar. */
export const pausarComo = async (admin: Admin, pessoaId: string, tarefaId?: string) => {
  if (tarefaId) {
    const { data, error } = await admin.rpc("notch_pausar_tarefa", { p_pessoa: pessoaId, p_tarefa: tarefaId });
    if (!error) return data as Record<string, unknown>;
    if (!/notch_pausar_tarefa|PGRST202/.test(`${error.code} ${error.message}`)) throw new Error(error.message);
  }
  return rpc(admin, "notch_pausar", { p_pessoa: pessoaId });
};
/** Entrega pelo notch: tempo medido vale como está, sem o ajuste de minutos do site. */
export const entregarComo = (admin: Admin, pessoaId: string, tarefaId: string, obs: string) =>
  rpc(admin, "notch_entregar", { p_pessoa: pessoaId, p_tarefa: tarefaId, p_obs: obs || null });
/** Tarefa que não estava planejada: nasce registrada, dona = a pessoa, e já começa a rodar. */
export const comecarDoZero = (admin: Admin, pessoaId: string, titulo: string, frenteSigla: string) =>
  rpc(admin, "notch_comecar_do_zero", { p_pessoa: pessoaId, p_titulo: titulo, p_frente_sigla: frenteSigla });
