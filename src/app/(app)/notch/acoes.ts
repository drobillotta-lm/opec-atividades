"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { gerarCodigo } from "@/lib/notch";

async function eu() {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("sem sessão");
  const { data: pessoa } = await supabase.from("pessoas").select("id, papel").eq("auth_user_id", user.id).single();
  if (!pessoa) throw new Error("fora do time");
  return pessoa;
}

/** Código de uso único, 5 minutos. Só aparece na tela, nunca é guardado em claro. */
export async function novoCodigo() {
  const pessoa = await eu();
  const { codigo, expiraEm } = await gerarCodigo(criarClienteAdmin(), pessoa.id);
  redirect(`/notch?codigo=${encodeURIComponent(codigo)}&ate=${encodeURIComponent(expiraEm)}`);
}

/** Desconecta um aparelho: o token dele para de valer na hora. Só os próprios (gestor: qualquer um). */
export async function desconectar(dispositivoId: string) {
  const pessoa = await eu();
  let q = criarClienteAdmin().from("notch_dispositivos")
    .update({ revogado_em: new Date().toISOString() }).eq("id", dispositivoId).is("revogado_em", null);
  if (pessoa.papel !== "gestor") q = q.eq("pessoa_id", pessoa.id);
  const { error } = await q;
  if (error) throw new Error(error.message);
  revalidatePath("/notch");
}
