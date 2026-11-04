/** Texto para busca: minúsculo e sem acento ("Olímpicos" e "olimpicos" batem). Usado no servidor
 * (filtro "Evento" da URL e o atributo data-busca de cada linha) e no cliente (busca rápida). */
export const normalizar = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
