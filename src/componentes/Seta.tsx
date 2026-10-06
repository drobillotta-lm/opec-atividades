import Link from "next/link";

/** Botão de navegação de período (‹ hoje ›), o mesmo em Minha semana e Minha frente. */
export function Seta({ href, rotulo, children }: { href: string; rotulo: string; children: React.ReactNode }) {
  return (
    <Link href={href} aria-label={rotulo}
      className="min-h-[36px] min-w-[36px] px-3 grid place-items-center rounded-lg border border-linha bg-superficie text-[12.5px] text-tinta-2 hover:bg-elevado transition">
      {children}
    </Link>
  );
}
