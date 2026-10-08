"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Item do menu lateral. Marca a página atual pela rota (antes "Minha semana" ficava
 * sempre acesa). `/admin` não acende em `/admin/organizar`: cada item casa só o seu caminho.
 * Com o menu recolhido (html[data-menu="recolhido"], ver MenuLateral) mostra só `curto`
 * (uma ou duas letras) e o nome inteiro vai no `title`. */
export function NavItem({ href, curto, children }: { href: string; curto: string; children: string }) {
  const atual = usePathname();
  const ativo = atual === href;
  return (
    <Link
      href={href}
      title={children}
      aria-current={ativo ? "page" : undefined}
      className={`flex items-center gap-3 min-h-[42px] px-3 rounded-[9px] text-[13.5px] font-medium transition ${
        ativo ? "bg-elevado text-tinta" : "text-tinta-3 hover:text-tinta-2"
      }`}
    >
      <span className="so-aberto">{children}</span>
      <span className="so-recolhido w-full text-center text-[12px] font-bold uppercase tracking-[0.04em]">{curto}</span>
    </Link>
  );
}
