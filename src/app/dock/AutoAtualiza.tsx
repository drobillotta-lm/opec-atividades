"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** O dock fica aberto o dia inteiro; sem isto ele congela no estado da abertura. */
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
