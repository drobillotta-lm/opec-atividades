"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * O dock e a aba principal são documentos separados: uma ação no dock (pausar,
 * iniciar) não empurra nada pra aba já aberta, só invalida o cache do servidor.
 * Sem isto, a aba fica mostrando o estado de quando carregou até alguém mexer
 * nela de novo.
 */
export function AutoAtualiza({ segundos }: { segundos: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), segundos * 1000);
    const aoVoltar = () => router.refresh();
    document.addEventListener("visibilitychange", aoVoltar);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", aoVoltar); };
  }, [router, segundos]);
  return null;
}
