import { cache } from "react";
import { criarClienteServidor } from "@/lib/supabase/server";
import { ROTULO_ATIVIDADE } from "@/lib/semana";

/**
 * Rótulos das atividades, da tabela `atividades` (039), uma leitura por request.
 * O objeto fixo de semana.ts é o fallback: atividade criada em /admin/organizar aparece
 * pelo rótulo daqui; as páginas que ainda usam só o objeto mostram o código dela.
 */
export const rotulosAtividade = cache(async (): Promise<Record<string, string>> => {
  const supabase = await criarClienteServidor();
  const { data } = await supabase.from("atividades").select("codigo, rotulo");
  return { ...ROTULO_ATIVIDADE, ...Object.fromEntries((data ?? []).map((a) => [a.codigo, a.rotulo])) };
});
