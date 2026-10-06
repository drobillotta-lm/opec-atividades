import { criarClienteServidor } from "@/lib/supabase/server";
import { Submit } from "../semana/Cronometro";
import { novoCodigo, desconectar } from "./acoes";
import { Animado, Rosto } from "@/componentes/SrMinutos";

export const dynamic = "force-dynamic";

// Conectar o notch nativo do Windows (decisão 02/10, modelo do Codenotch). Só classes de
// token: o visual fino é da janela TELAS.
const BOTAO = "min-h-9 px-3.5 rounded-lg border border-verde-borda bg-verde-fundo text-verde-claro text-[12.5px] font-semibold hover:brightness-110 transition";
const DISCRETO = "min-h-8 px-3 rounded-lg border border-linha bg-superficie-2 text-[12px] text-tinta-3 hover:text-tinta-2 transition";

const quando = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

export default async function ConectarNotch({ searchParams }: { searchParams: Promise<{ codigo?: string; ate?: string }> }) {
  const sp = await searchParams;
  const supabase = await criarClienteServidor();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: eu } = await supabase.from("pessoas").select("id").eq("auth_user_id", user!.id).single();
  const { data: aparelhos } = await supabase.from("notch_dispositivos")
    .select("id, nome, criado_em, ultimo_uso_em").eq("pessoa_id", eu!.id).is("revogado_em", null).order("criado_em");

  const codigoValido = sp.codigo && sp.ate && new Date(sp.ate).getTime() > Date.now();

  return (
    <div className="p-6 px-8 flex flex-col gap-5 max-w-[760px]">
      <header className="flex items-end justify-between gap-6">
        <div className="flex flex-col gap-1.5">
        <h1 className="text-[34px]">Conectar o notch</h1>
        <p className="text-[12.5px] text-tinta-3">
          O Sr. Minutos fora do navegador: um app pequeno que fica preso na borda da tela, mostra o cronômetro
          da tarefa atual e deixa pausar ou começar a próxima sem abrir o site.
        </p>
        </div>
        <Animado pose="acena" altura={120} className="hidden sm:block shrink-0 -mb-5" />
      </header>

      <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col gap-3 text-[13px]">
        <h2 className="font-display text-[20px] font-extrabold uppercase leading-none">1 · Instalar</h2>
        <p className="text-tinta-3">
          Baixe e rode o instalador. Ele instala só pro seu usuário, sem pedir administrador. Na primeira vez o
          Windows pode avisar <i>&quot;O Windows protegeu o computador&quot;</i>: clique em <b>Mais informações</b> e
          depois em <b>Executar assim mesmo</b>.
        </p>
        <div className="flex flex-wrap gap-2">
          <a href="/download/AtividadesOPEC-Setup.exe" className={BOTAO + " w-fit inline-flex items-center"}>Baixar para Windows</a>
          <a href="/download/AtividadesOPEC.dmg" className={BOTAO + " w-fit inline-flex items-center"}>Baixar para Mac</a>
        </div>
        <p className="text-tinta-4 text-[12px]">
          No Mac: abra o <b>.dmg</b>, arraste pra Aplicativos e, na primeira vez, clique com o botão direito no app
          e escolha <b>Abrir</b> (o app não é assinado pela Apple, então o macOS avisa). Ele fica na barra de menus,
          não no Dock.
        </p>
      </section>

      <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col gap-3 text-[13px]">
        <h2 className="font-display text-[20px] font-extrabold uppercase leading-none">2 · Parear</h2>
        <p className="text-tinta-3">
          Gere um código e digite no app. Ele vale uma vez só e por 5 minutos. O app nunca vê sua senha nem sua
          conta Google: recebe uma chave própria, que só mexe no seu cronômetro e que você desliga aqui embaixo.
        </p>
        {codigoValido ? (
          <div className="flex flex-col gap-1.5">
            <span className="num w-fit rounded-[14px] bg-[var(--notch-preto)] px-5 py-3 text-[34px] font-semibold tracking-[0.18em] text-[var(--notch-verde)]" aria-label={`Código ${sp.codigo!.split("").join(" ")}`}>{sp.codigo}</span>
            <span className="text-[11.5px] text-tinta-4">Vale até {quando(sp.ate!)}. Gerar outro invalida este.</span>
          </div>
        ) : null}
        <form action={novoCodigo}>
          <Submit ocupado="Gerando..." className={codigoValido ? DISCRETO : BOTAO}>{codigoValido ? "Gerar outro código" : "Gerar código"}</Submit>
        </form>
      </section>

      <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col text-[13px]">
        <h2 className="font-display text-[20px] font-extrabold uppercase leading-none pb-3">Aparelhos conectados</h2>
        {(aparelhos ?? []).length === 0 && <p className="text-tinta-4 text-[12.5px]">Nenhum ainda.</p>}
        {(aparelhos ?? []).map((a) => (
          <div key={a.id} className="flex items-center justify-between gap-3 py-2 border-t border-linha-2">
            <div className="flex items-center gap-2.5">
              <Rosto estado={a.ultimo_uso_em ? "verde" : "creme"} tamanho={18} />
              <div className="flex flex-col">
              <span className="font-medium">{a.nome}</span>
              <span className="text-[11.5px] text-tinta-4">
                conectado em {quando(a.criado_em)}{a.ultimo_uso_em ? ` · visto ${quando(a.ultimo_uso_em)}` : " · ainda não usado"}
              </span>
              </div>
            </div>
            <form action={desconectar.bind(null, a.id)}>
              <Submit ocupado="..." className={DISCRETO + " text-rosa"}>Desconectar</Submit>
            </form>
          </div>
        ))}
      </section>
    </div>
  );
}
