import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sr. Minutos" };

// A janela nativa é transparente e sem borda. O fundo da página some por CSS no globals.css
// (html:has([data-notch-janela])), que já vale no primeiro frame — o <style> injetado aqui
// chegava depois do fundo global e piscava um retângulo escuro atrás do notch.
export default function LayoutNotchApp({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
