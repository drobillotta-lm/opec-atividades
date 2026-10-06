import Link from "next/link";

/** Aba de alternância por link (Lista | Quadro kanban, Semana | Histórico, Minhas | Toda a frente). */
export function Aba({ href, ativa, children }: { href: string; ativa: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-current={ativa ? "page" : undefined}
      className={`min-h-[30px] px-3 grid place-items-center rounded-[7px] text-[12.5px] font-medium transition whitespace-nowrap ${
        ativa ? "bg-elevado text-tinta" : "text-tinta-3 hover:text-tinta-2"}`}>
      {children}
    </Link>
  );
}
