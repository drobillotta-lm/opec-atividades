import type { Metadata } from "next";
import { Archivo, Barlow_Condensed, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { scriptAntiPisca } from "@/componentes/Tema";

const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-archivo" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
// Titulos e numeros grandes: o eco da tipografia esportiva da CazeTV (docs/06).
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-barlow" });

export const metadata: Metadata = {
  title: "OPEC · Atividades",
  description: "O que foi planejado no mapa e o que foi de fato executado.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" data-tema="escuro" suppressHydrationWarning className={`${archivo.variable} ${mono.variable} ${barlow.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: scriptAntiPisca }} />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
