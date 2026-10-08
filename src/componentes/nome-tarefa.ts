import { ROTULO_ATIVIDADE } from "@/lib/semana";

/** Texto no lugar do evento quando a tarefa foi começada do zero (registrada, sem evento). */
export const SEM_EVENTO = "Começada do zero";

export type EventoNome = {
  competicao: string;
  confronto?: string | null;
  evento_id_origem?: string | null;
} | null | undefined;

const norm = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Pedaços do nome do evento que não dizem nada sobre o jogo. */
const RUIDO = [
  /^compactos?(\s+ol[ií]mpicos?)?$/i, /^pr[eé][\s-]*jogo$/i, /^reprise$/i, /^\[?sem narra/i,
  /^grava[cç][aã]o$/i, /^externa$/i, /^rec[A-Za-z0-9]{14}$/,
];

/**
 * "Brasileirão 2026 | Vasco da Gama X Flamengo". O confronto vem da coluna própria (046, Escala
 * 067). Sem ele, aproveita o que o "Nome do Evento" da Escala traz além da competição: tira os
 * pedaços que repetem a competição (com ou sem ano, com ou sem "Programa ") e os marcadores
 * (Compacto, Pré Jogo, Reprise, [SEM NARRAÇÃO]). Sobrando nada, é só a competição.
 *   "Brasileirão 2026" + "Brasileirão 2026"                      → "Brasileirão 2026"
 *   "Programa Geral CazéTV 2026" + "Geral CazéTV | 05/10"         → "Programa Geral CazéTV 2026 | 05/10"
 *   "Programa Compactos Olímpícos 2026" + "Compacto Olímpico | Mundial de Judô de Baku #6"
 *                                                                → "… | Mundial de Judô de Baku #6"
 */
export function nomeEvento(competicao: string | null | undefined, confronto?: string | null, jogo?: string | null): string {
  const comp = (competicao ?? "").trim();
  const conf = (confronto ?? "").trim();
  if (conf) return comp ? `${comp} | ${conf}` : conf;
  const semAno = comp.replace(/\s*\d{4}\s*$/, "");
  const alvos = [comp, semAno, comp.replace(/^programa\s+/i, ""), semAno.replace(/^programa\s+/i, "")]
    .map(norm).filter(Boolean);
  const partes = (jogo ?? "").split("|").map((p) => p.trim()).filter(Boolean)
    .filter((p) => !RUIDO.some((r) => r.test(p)))
    .filter((p) => { const n = norm(p); return !(n.length >= 4 && alvos.some((a) => a === n || a.startsWith(n))); });
  return partes.length ? (comp ? `${comp} | ${partes.join(" | ")}` : partes.join(" | ")) : comp;
}

/**
 * Nome da tarefa nas telas: "Roteiro - Nacional - Brasileirão 2026 | Vasco da Gama X Flamengo"
 * (pedido do Daniel, 07/10: uma atividade, a frente, e o evento inteiro). Tarefa começada do
 * zero (pelo notch, 02/10): o título que a pessoa escreveu, com a frente se tiver.
 * `rotulos` é o mapa vindo da tabela `atividades` (rotulosAtividade()), quando a tela tem.
 */
export function nomeTarefa(
  t: { titulo?: string | null; atividade: string; frente?: { nome?: string | null; sigla?: string | null } | null; evento?: EventoNome },
  campo: "nome" | "sigla" = "nome",
  rotulos?: Record<string, string>,
) {
  const frente = t.frente?.[campo];
  if (t.titulo) return frente ? `${t.titulo} - ${frente}` : t.titulo;
  const atividade = rotulos?.[t.atividade] ?? ROTULO_ATIVIDADE[t.atividade] ?? t.atividade;
  const evento = t.evento ? nomeEvento(t.evento.competicao, t.evento.confronto, t.evento.evento_id_origem) : null;
  return [atividade, frente, evento].filter(Boolean).join(" - ");
}
