import { createClient } from "@supabase/supabase-js";

/**
 * Cliente de LEITURA do Supabase da Escala (schema `escala`), com a service key de lá.
 * Só existe no servidor. Este app nunca escreve na Escala: eventos, entrega, plantão,
 * líderes e competição × frente são decididos lá (docs/01-decisoes.md, 28/09).
 */
export function criarClienteEscala() {
  const url = process.env.ESCALA_SUPABASE_URL;
  const chave = process.env.ESCALA_SERVICE_KEY;
  if (!url || !chave) throw new Error("faltam ESCALA_SUPABASE_URL / ESCALA_SERVICE_KEY nas envs");
  return createClient(url, chave, { db: { schema: "escala" }, auth: { persistSession: false } });
}
