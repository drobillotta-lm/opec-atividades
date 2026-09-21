/** Semana da OPEC: segunda a domingo, em horario de Brasilia. */
const FUSO = "America/Sao_Paulo";

function hojeBRT(): Date {
  const agora = new Date();
  const s = agora.toLocaleDateString("en-CA", { timeZone: FUSO });
  return new Date(s + "T00:00:00");
}

export function semanaDe(base: Date = hojeBRT()) {
  const d = new Date(base);
  const diaSemana = (d.getDay() + 6) % 7; // 0 = segunda
  const inicio = new Date(d);
  inicio.setDate(d.getDate() - diaSemana);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  return { inicio: iso(inicio), fim: iso(fim) };
}

export function deslocarSemana(inicioISO: string, semanas: number) {
  const d = new Date(inicioISO + "T00:00:00");
  d.setDate(d.getDate() + semanas * 7);
  return semanaDe(d);
}

export const iso = (d: Date) => d.toLocaleDateString("en-CA");

export function rotuloSemana(inicio: string, fim: string) {
  const a = new Date(inicio + "T00:00:00");
  const b = new Date(fim + "T00:00:00");
  const dia = (d: Date) => String(d.getDate()).padStart(2, "0");
  const mes = (d: Date) => String(d.getMonth() + 1).padStart(2, "0");
  return a.getMonth() === b.getMonth()
    ? `${dia(a)} a ${dia(b)}/${mes(b)}`
    : `${dia(a)}/${mes(a)} a ${dia(b)}/${mes(b)}`;
}

export function diaCurto(dataISO: string) {
  const d = new Date(dataISO + "T00:00:00");
  const nomes = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
  return `${nomes[d.getDay()]} ${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** 95 -> "1h35". 60 -> "1h00". 0 -> "0h00". */
export function hhmm(minutos: number) {
  const m = Math.max(0, Math.round(minutos));
  return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, "0")}`;
}

/** Tempo curto nao pode virar 0h00: quem acabou de cronometrar precisa ver que contou. */
export function tempoLegivel(minutos: number) {
  if (minutos <= 0) return "0h00";
  if (minutos < 1) return "<1min";
  return hhmm(minutos);
}

/** Segundos -> "1:12:38", para o cronometro correndo. */
export function relogio(segundos: number) {
  const s = Math.max(0, Math.floor(segundos));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export const ROTULO_ATIVIDADE: Record<string, string> = {
  materiais: "Materiais",
  sincronizacao: "Sincronização",
  roteiro: "Roteiro",
  auditoria: "Auditoria",
  materiais_sinc: "Materiais e sincronização",
  roteiro_auditoria: "Roteiro e auditoria",
  compacto: "Compacto",
};

export const ROTULO_STATUS: Record<string, string> = {
  pendente: "Pendente",
  entregue: "Entregue",
  fora_do_prazo: "Fora do prazo",
  na: "Não aplicável",
};
