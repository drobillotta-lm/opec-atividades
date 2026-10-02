import { ROTULO_ATIVIDADE } from "@/lib/semana";

/** Texto no lugar do evento quando a tarefa foi começada do zero (registrada, sem evento). */
export const SEM_EVENTO = "Começada do zero";

/**
 * Nome da tarefa nas telas. Tarefa do mapa: "Roteiro · Fut Inter". Tarefa começada do zero
 * (pelo notch, 02/10): o título que a pessoa escreveu, com a frente se tiver.
 */
export function nomeTarefa(
  t: { titulo?: string | null; atividade: string; frente?: { nome?: string | null; sigla?: string | null } | null },
  campo: "nome" | "sigla" = "nome",
) {
  const frente = t.frente?.[campo];
  if (t.titulo) return frente ? `${t.titulo} · ${frente}` : t.titulo;
  return `${ROTULO_ATIVIDADE[t.atividade] ?? t.atividade}${frente ? ` · ${frente}` : ""}`;
}
