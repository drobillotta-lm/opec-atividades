import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// /api/importar-escala se autentica sozinho por CRON_SECRET (chamada do GitHub
// Actions, sem sessao/cookie nenhum) -- sem isto o middleware manda pra /entrar
// antes do handler ver o header.
const PUBLICAS = ["/entrar", "/auth", "/fora-do-time", "/api/importar-escala"];

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (lista) => {
          lista.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          lista.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    },
  );

  const caminho = req.nextUrl.pathname;

  // Retorno do OAuth. Quando a redirectTo pedida nao esta na lista de Redirect URLs,
  // o Supabase manda o usuario para o Site URL e o ?code cai em qualquer caminho.
  // Levar para o callback antes de qualquer checagem de sessao, senao o code se perde.
  const code = req.nextUrl.searchParams.get("code");
  if (code && caminho !== "/auth/callback") {
    const url = req.nextUrl.clone();
    url.pathname = "/auth/callback";
    return NextResponse.redirect(url);
  }

  const { data: { user } } = await supabase.auth.getUser();
  const publica = PUBLICAS.some((p) => caminho.startsWith(p));

  if (!user && !publica) {
    const url = req.nextUrl.clone();
    url.pathname = "/entrar";
    return NextResponse.redirect(url);
  }

  return res;
}

export const config = {
  // manifest.webmanifest e .ico passam direto: sem login o navegador não instala o app (PWA).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\.(?:svg|png|jpg|webp|ico)$).*)"],
};
