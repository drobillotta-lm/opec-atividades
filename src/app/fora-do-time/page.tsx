import { criarClienteServidor } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function ForaDoTime() {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();

  async function sair() {
    "use server";
    const supabase = await criarClienteServidor();
    await supabase.auth.signOut();
    redirect("/entrar");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-[420px] flex flex-col gap-6">
        <div className="w-12 h-12 rounded-xl bg-[#2a1b22] border border-[#4a2a35] grid place-items-center">
          <svg width="23" height="23" viewBox="0 0 22 22" fill="none" stroke="#E05A7A" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
            <circle cx="11" cy="11" r="8" /><path d="M5.3 5.3l11.4 11.4" />
          </svg>
        </div>
        <div className="flex flex-col gap-2.5">
          <h1 className="text-[26px] font-semibold tracking-[-0.02em]">Você não está no time da OPEC</h1>
          <p className="text-[14px] leading-relaxed text-tinta-3">
            A conta <span className="num text-[13px] text-tinta-2">{user?.email ?? "que você usou"}</span> entrou,
            mas não está na lista de pessoas da área.
          </p>
        </div>
        <p className="rounded-[10px] bg-superficie border border-linha px-4 py-3.5 text-[12.5px] leading-relaxed text-tinta-3">
          Quem entra e sai do time é decisão do Yuri, registrada junto com o mapa do mês.
          Fale com ele ou com o Daniel. Nenhum dado seu foi criado aqui.
        </p>
        <form action={sair}>
          <button type="submit" className="w-full min-h-11 rounded-[10px] border border-[#3b4552] bg-elevado text-[14px] font-medium hover:bg-linha transition">
            Tentar com outra conta
          </button>
        </form>
      </div>
    </main>
  );
}
