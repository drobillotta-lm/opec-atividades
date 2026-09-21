import { criarClienteServidor } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/entrar`);

  const supabase = await criarClienteServidor();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/entrar`);

  // O gatilho liga_conta() liga a conta Google a uma pessoa que ja existe.
  // Se nao ligou, a pessoa nao e do time.
  const { data: { user } } = await supabase.auth.getUser();
  const { data: pessoa } = await supabase
    .from("pessoas")
    .select("id")
    .eq("auth_user_id", user?.id ?? "")
    .maybeSingle();

  return NextResponse.redirect(`${origin}${pessoa ? "/semana" : "/fora-do-time"}`);
}
