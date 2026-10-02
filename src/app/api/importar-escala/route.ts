import { NextResponse, type NextRequest } from "next/server";
import { sincronizarEscala } from "@/lib/escala/sincronizar";

// Relógio externo (n8n de hora em hora, ou GitHub Actions) chama esta rota; o trabalho
// de verdade está em src/lib/escala/sincronizar.ts, que lê o banco da Escala direto.
// A rota se autentica sozinha pelo CRON_SECRET, por isso o middleware de sessão a ignora.

export const runtime = "nodejs";
// Escala inteira + upserts em lote + 5 RPCs: o padrao de 10-15 s da Vercel nao basta.
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return NextResponse.json({ erro: "servidor sem CRON_SECRET configurado" }, { status: 500 });
  if (req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return NextResponse.json({ erro: "não autorizado" }, { status: 401 });
  }
  try {
    const resumo = await sincronizarEscala("relogio");
    return NextResponse.json({ ok: true, ...resumo });
  } catch (e) {
    return NextResponse.json({ erro: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
