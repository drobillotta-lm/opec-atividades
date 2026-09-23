import Link from "next/link";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { sair } from "./acoes";
import { BotaoTema } from "@/componentes/Tema";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/entrar");

  const { data: pessoa } = await supabase
    .from("pessoas").select("id, nome, papel").eq("auth_user_id", user.id).maybeSingle();
  if (!pessoa) redirect("/fora-do-time");

  const gestor = pessoa.papel === "gestor";
  const lider = pessoa.papel === "lider" || gestor;
  const iniciais = pessoa.nome.slice(0, 2).toUpperCase();
  const rotuloPapel = gestor ? "Gestor da área" : lider ? "Líder de frente" : "Analista";

  async function encerrar() {
    "use server";
    await sair();
    redirect("/entrar");
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-[232px] shrink-0 bg-fundo-nav border-r border-linha flex flex-col p-[22px_14px] gap-6">
        <div className="flex items-center gap-2.5 px-2">
          <div className="w-[30px] h-[30px] rounded-lg bg-azul grid place-items-center">
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" stroke="#0E1014" strokeWidth="2.1" strokeLinecap="round" aria-hidden>
              <path d="M3.5 9.2l3.2 3.2 7.8-7.8" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-[-0.015em]">Atividades</span>
            <span className="text-[10px] uppercase tracking-[0.08em] text-tinta-4">OPEC</span>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5" aria-label="Navegação principal">
          <Item href="/semana" ativo>Minha semana</Item>
          {lider && <Item href="/frente">Minha frente</Item>}
          {lider && <Item href="/kanban">Quadro</Item>}
          {lider && <Item href="/painel">Painel</Item>}
          {gestor && <Item href="/admin">Admin</Item>}
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center gap-2.5 rounded-[10px] bg-[#13171d] border border-linha px-3 py-2.5">
            <div className="w-[30px] h-[30px] rounded-full bg-linha grid place-items-center shrink-0">
              <span className="text-xs font-semibold text-tinta-2">{iniciais}</span>
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[12.5px] font-medium truncate">{pessoa.nome}</span>
              <span className="text-[11px] text-tinta-4">{rotuloPapel}</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <BotaoTema />
            <form action={encerrar}>
              <button type="submit" className="px-3 py-2 text-[12px] text-tinta-4 hover:text-tinta-2 transition">
                Sair
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}

function Item({ href, children, ativo }: { href: string; children: React.ReactNode; ativo?: boolean }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`flex items-center gap-3 min-h-[42px] px-3 rounded-[9px] text-[13.5px] font-medium transition ${
        ativo ? "bg-elevado text-tinta" : "text-tinta-3 hover:text-tinta-2"
      }`}
    >
      {children}
    </Link>
  );
}
