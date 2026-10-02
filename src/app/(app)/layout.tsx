import Link from "next/link";
import { redirect } from "next/navigation";
import { criarClienteServidor } from "@/lib/supabase/server";
import { sair, pausar, iniciar } from "./acoes";
import { ROTULO_ATIVIDADE } from "@/lib/semana";
import { Notch, type TarefaNotch } from "@/componentes/Notch";
import { BotaoTema } from "@/componentes/Tema";
import { Rosto } from "@/componentes/SrMinutos";
import { SeloValeu } from "@/componentes/SeloValeu";

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

  // Notch: a tarefa da minha última sessão, se ainda pendente. Rodando = sessão sem fim.
  // Mesma conta do dock: total da tarefa (v_tempo_tarefa) + o trecho que está correndo.
  let tarefaNotch: TarefaNotch | null = null;
  const { data: ultima } = await supabase
    .from("sessoes").select("tarefa_id, inicio, fim").eq("pessoa_id", pessoa.id)
    .order("inicio", { ascending: false }).limit(1).maybeSingle();
  if (ultima) {
    const { data: t } = await supabase
      .from("tarefas").select("id, atividade, estimativa_min, prazo_em, status, frentes ( nome ), eventos ( competicao )")
      .eq("id", ultima.tarefa_id).maybeSingle();
    if (t && t.status === "pendente") {
      const { data: tempo } = await supabase.from("v_tempo_tarefa").select("segundos_total").eq("tarefa_id", t.id).maybeSingle();
      const frente = Array.isArray(t.frentes) ? t.frentes[0] : t.frentes;
      const evento = Array.isArray(t.eventos) ? t.eventos[0] : t.eventos;
      tarefaNotch = {
        id: t.id,
        titulo: `${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade} · ${frente?.nome ?? ""}`,
        sub: evento?.competicao ?? "",
        prazoEm: t.prazo_em,
        estimativaMin: t.estimativa_min,
        segundos: Number(tempo?.segundos_total ?? 0),
        correndoDesde: ultima.fim ? null : ultima.inicio,
      };
    }
  }

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
          <Item href="/semana" ativo>Minha semana</Item>
          {lider && <Item href="/frente">Minha frente</Item>}
          {lider && <Item href="/kanban">Quadro</Item>}
          {lider && <Item href="/painel">Painel</Item>}
          {gestor && <Item href="/admin">Admin</Item>}
          {gestor && <Item href="/admin/organizar">Organizar</Item>}
          <Item href="/como-funciona">Como funciona</Item>
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

      <main className="flex-1 min-w-0 pb-24">{children}</main>
      <SeloValeu />
      <Notch tarefa={tarefaNotch} pausar={pausar} retomar={tarefaNotch ? iniciar.bind(null, tarefaNotch.id) : null} />
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
