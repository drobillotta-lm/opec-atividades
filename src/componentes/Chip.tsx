import Link from "next/link";

/** Filtro de liga/desliga em forma de pílula, guardado na URL (Minhas atividades, Minha frente). */
export function Chip({ href, ativo, rosa, children }: { href: string; ativo: boolean; rosa?: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} aria-pressed={ativo} scroll={false}
      className={`rounded-full border px-3 py-1 text-[12.5px] transition ${
        ativo
          ? rosa ? "bg-rosa border-rosa text-verde-ink font-semibold" : "bg-verde border-verde text-verde-ink font-semibold"
          : "bg-fundo border-linha text-tinta-2 hover:border-tinta-4"}`}>
      {children}
    </Link>
  );
}
