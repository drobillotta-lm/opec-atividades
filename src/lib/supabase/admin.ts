import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a service role. Ignora RLS — só para rotas de servidor que
 * escrevem em `mapa`, `eventos` e `plantoes`, as três tabelas que não têm
 * policy de escrita de propósito (docs/02-modelo-dados.md).
 *
 * Essa chave nunca pode chegar ao cliente. Só existe aqui dentro.
 */
export function criarClienteAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) {
    throw new Error("faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY nas envs");
  }
  return createClient(url, chave, { auth: { persistSession: false } });
}
