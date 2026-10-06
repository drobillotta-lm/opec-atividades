import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { sair } from "./acoes";
import { BotaoTema } from "@/componentes/Tema";
import { Rosto } from "@/componentes/SrMinutos";
import { SeloValeu } from "@/componentes/SeloValeu";
import { NavItem } from "@/componentes/NavItem";

// O notch (meia cabeça do Sr. Minutos no canto) saiu das páginas do site em 06/10, pedido do
// Daniel: as telas já têm toda a informação, e o notch de verdade é o app nativo (/notch).
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
          <Rosto estado="verde" tamanho={32} />
          <div className="flex flex-col">
            <span className="font-display text-[19px] font-extrabold uppercase leading-none">Atividades</span>
            <span className="text-[10px] uppercase tracking-[0.08em] text-tinta-4">OPEC</span>
          </div>
        </div>

        <nav className="flex flex-col gap-0.5" aria-label="Navegação principal">
          <NavItem href="/semana">Minha semana</NavItem>
          {lider && <NavItem href="/frente">Minha frente</NavItem>}
          {lider && <NavItem href="/kanban">Quadro</NavItem>}
          {lider && <NavItem href="/painel">Painel</NavItem>}
          {gestor && <NavItem href="/admin">Admin</NavItem>}
          {gestor && <NavItem href="/admin/organizar">Organizar</NavItem>}
          <NavItem href="/notch">Notch (Windows)</NavItem>
          <NavItem href="/como-funciona">Como funciona</NavItem>
        </nav>

        <div className="mt-auto flex flex-col gap-2">
          <div className="flex items-center gap-2.5 rounded-[10px] bg-superficie border border-linha px-3 py-2.5">
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

      <main className="flex-1 min-w-0 pb-6">{children}</main>
      <SeloValeu />
    </div>
  );
}
