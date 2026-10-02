import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { comecarDoZero, estadoDe, iniciarComo, parear, pausarComo, pessoaDoAparelho } from "@/lib/notch";

// API do notch nativo (desktop/). Não usa cookie nem sessão do site: o middleware deixa
// passar /api/notch e cada chamada se autentica aqui pelo token do aparelho (042).
//   POST /api/notch/parear   { codigo, aparelho }  -> { token, nome }   (sem token ainda)
//   GET  /api/notch/estado                           -> { pareado, pessoa, tarefa, proximas, frentes }
//   POST /api/notch/iniciar  { tarefaId }            -> estado
//   POST /api/notch/pausar                           -> estado
//   POST /api/notch/comecar  { titulo, frente? }     -> estado (tarefa nova, já rodando)

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// O banco está em São Paulo; rodar a função em Washington (padrão) custava ~130 ms por ida.
export const preferredRegion = "gru1";

const erro = (mensagem: string, status: number) => NextResponse.json({ erro: mensagem }, { status });

async function corpo(req: NextRequest): Promise<Record<string, unknown>> {
  try { return (await req.json()) ?? {}; } catch { return {}; }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ acao: string }> }) {
  const { acao } = await params;
  if (acao !== "estado") return erro("não encontrado", 404);
  const admin = criarClienteAdmin();
  const pessoaId = await pessoaDoAparelho(admin, req);
  if (!pessoaId) return NextResponse.json({ pareado: false, pessoa: null, tarefa: null, proximas: [], frentes: [] }, { status: 401 });
  return NextResponse.json(await estadoDe(admin, pessoaId));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ acao: string }> }) {
  const { acao } = await params;
  const admin = criarClienteAdmin();
  const b = await corpo(req);

  if (acao === "parear") {
    const r = await parear(admin, String(b.codigo ?? ""), String(b.aparelho ?? "Windows"));
    return "erro" in r ? erro(r.erro!, 400) : NextResponse.json(r);
  }

  const pessoaId = await pessoaDoAparelho(admin, req);
  if (!pessoaId) return erro("aparelho não pareado ou desconectado", 401);
  try {
    if (acao === "iniciar") {
      const tarefaId = String(b.tarefaId ?? "");
      if (!/^[0-9a-f-]{36}$/.test(tarefaId)) return erro("tarefa inválida", 400);
      return NextResponse.json(await iniciarComo(admin, pessoaId, tarefaId));
    }
    if (acao === "pausar") return NextResponse.json(await pausarComo(admin, pessoaId));
    if (acao === "comecar") {
      const titulo = String(b.titulo ?? "").trim();
      if (!titulo) return erro("diga o que você vai fazer", 400);
      return NextResponse.json(await comecarDoZero(admin, pessoaId, titulo.slice(0, 120), String(b.frente ?? "")));
    }
    return erro("não encontrado", 404);
  } catch (e) {
    return erro(e instanceof Error ? e.message : String(e), 400);
  }
}
