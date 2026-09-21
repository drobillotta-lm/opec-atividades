import { redirect } from "next/navigation";

/**
 * O Supabase manda o usuario de volta para o Site URL quando a redirectTo pedida
 * nao esta na lista de Redirect URLs. Nesse caso o ?code cai aqui na raiz em vez
 * de /auth/callback. Em vez de quebrar, repassamos.
 */
export default async function Raiz({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
  const sp = await searchParams;
  if (sp.error) redirect(`/entrar?erro=${encodeURIComponent(sp.error_description ?? sp.error)}`);
  if (sp.code) redirect(`/auth/callback?code=${encodeURIComponent(sp.code)}`);
  redirect("/semana");
}
