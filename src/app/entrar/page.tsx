import { criarClienteServidor } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function Entrar() {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/semana");

  async function entrarComGoogle() {
    "use server";
    const supabase = await criarClienteServidor();
    const h = await headers();
    // `origin` pode nao vir em Server Action; montar a partir do host e do proto
    // que o proxy da Vercel envia e mais confiavel, e localhost fica em http.
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const origem = h.get("origin") ?? `${proto}://${host}`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origem}/auth/callback`,
        queryParams: { hd: "livemode.com", prompt: "select_account" },
      },
    });
    if (error) throw error;
    if (data.url) redirect(data.url);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-[420px] flex flex-col gap-11">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-[10px] bg-azul grid place-items-center">
            <svg width="19" height="19" viewBox="0 0 18 18" fill="none" stroke="#0E1014" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M3.5 9.2l3.2 3.2 7.8-7.8" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-[16px] font-semibold tracking-[-0.015em]">Atividades</span>
            <span className="text-[11px] uppercase tracking-[0.08em] text-tinta-4">OPEC · LiveMode</span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em]">Entrar</h1>
          <p className="text-[14px] leading-relaxed text-tinta-3">
            Suas tarefas da semana, o tempo que cada uma levou e o que ficou pendente.
          </p>
        </div>

        <form action={entrarComGoogle}>
          <button
            type="submit"
            className="w-full min-h-12 rounded-[10px] bg-azul text-fundo text-[15px] font-semibold flex items-center justify-center gap-2.5 hover:brightness-110 transition"
          >
            <svg width="17" height="17" viewBox="0 0 17 17" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
              <circle cx="8.5" cy="8.5" r="6.6" />
              <path d="M1.9 8.5h13.2M8.5 1.9a11 11 0 0 1 0 13.2 11 11 0 0 1 0-13.2" />
            </svg>
            Entrar com a conta LiveMode
          </button>
        </form>

        <p className="rounded-[10px] bg-superficie border border-linha px-4 py-3.5 text-[12.5px] leading-relaxed text-tinta-3">
          O time da OPEC são 7 pessoas fixas, todas com <strong className="text-tinta-2 font-semibold">@livemode.com</strong>.
          Entrar com o Google da empresa já puxa as tarefas que o mapa do mês te deu. Não há senha
          para lembrar nem cadastro para preencher.
        </p>
      </div>
    </main>
  );
}
