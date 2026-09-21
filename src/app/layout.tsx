import type { Metadata } from "next";
import { Archivo, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-archivo" });
const mono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "OPEC · Atividades",
  description: "O que foi planejado no mapa e o que foi de fato executado.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${mono.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
