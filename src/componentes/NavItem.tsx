"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Item do menu lateral. Marca a página atual pela rota (antes "Minha semana" ficava
 * sempre acesa). `/admin` não acende em `/admin/organizar`: cada item casa só o seu caminho. */
export function NavItem({ href, children }: { href: string; children: React.ReactNode }) {
  const atual = usePathname();
  const ativo = atual === href;
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
