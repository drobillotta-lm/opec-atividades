import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sr. Minutos" };

// A janela nativa é transparente e sem borda: aqui o fundo da página some.
export default function LayoutNotchApp({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`html, body { background: transparent !important; }`}</style>
      {children}
    </>
  );
}
