import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Cliente para Server Components, Server Actions e Route Handlers. */
export async function criarClienteServidor() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (lista) => {
          // Em Server Component puro isto lanca; o middleware ja renova a sessao,
          // entao engolir aqui e seguro.
          try {
            lista.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {}
        },
      },
    },
  );
}
