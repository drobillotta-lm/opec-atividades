import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { sair } from "./acoes";
import { BotaoTema } from "@/componentes/Tema";
import { SeloValeu } from "@/componentes/SeloValeu";
import { NavItem } from "@/componentes/NavItem";
import { MenuLateral } from "@/componentes/MenuLateral";

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
      <MenuLateral
        pessoa={{ nome: pessoa.nome, iniciais, rotuloPapel }}
        nav={
          <>
            <NavItem href="/semana" curto="Se">Minha semana</NavItem>
            {lider && <NavItem href="/frente" curto="Fr">Minha frente</NavItem>}
            {lider && <NavItem href="/painel" curto="Pa">Painel</NavItem>}
            {gestor && <NavItem href="/admin" curto="Ad">Admin</NavItem>}
            {gestor && <NavItem href="/admin/organizar" curto="Or">Organizar</NavItem>}
            <NavItem href="/notch" curto="No">Notch (Windows)</NavItem>
            <NavItem href="/como-funciona" curto="?">Como funciona</NavItem>
          </>
        }
        acoes={
          <div className="flex items-center justify-between [html[data-menu=recolhido]_&]:justify-center">
            <span className="so-aberto"><BotaoTema /></span>
            <span className="so-recolhido"><BotaoTema compacto /></span>
            <form action={encerrar} className="so-aberto">
              <button type="submit" className="px-3 py-2 text-[12px] text-tinta-4 hover:text-tinta-2 transition">
                Sair
              </button>
            </form>
          </div>
        }
      />

      <main className="flex-1 min-w-0 pb-6">{children}</main>
      <SeloValeu />
    </div>
  );
}
