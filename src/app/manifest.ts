import type { MetadataRoute } from "next";

// O que deixa o app ser instalado no PC e no celular (PWA). Cores = tema Noite.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "OPEC · Atividades",
    short_name: "Atividades",
    description: "O que foi planejado no mapa e o que foi de fato executado.",
    start_url: "/semana",
    display: "standalone",
    background_color: "#0b0f0c",
    theme_color: "#0b0f0c",
    lang: "pt-BR",
    icons: [
      { src: "/sr-minutos/icones/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/sr-minutos/icones/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/sr-minutos/icones/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
