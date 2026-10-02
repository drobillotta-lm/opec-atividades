import { NextResponse, type NextRequest } from "next/server";
import { criarClienteAdmin } from "@/lib/supabase/admin";
import { aparelhoDaRequisicao, estadoDe, iniciarComo, parear, pausarComo } from "@/lib/notch";

// API do notch nativo (desktop/). Não usa cookie nem sessão do site: o middleware deixa
// passar /api/notch e cada chamada se autentica aqui pelo token do aparelho (042).
//   POST /api/notch/parear   { codigo, aparelho }  -> { token, nome }   (sem token ainda)
//   GET  /api/notch/estado                           -> { pareado, pessoa, tarefa, proximas }
//   POST /api/notch/iniciar  { tarefaId }            -> estado
//   POST /api/notch/pausar                           -> estado

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const erro = (mensagem: string, status: number) => NextResponse.json({ erro: mensagem }, { status });

async function corpo(req: NextRequest): Promise<Record<string, unknown>> {
  try { return (await req.json()) ?? {}; } catch { return {}; }
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ acao: string }> }) {
  const { acao } = await params;
  if (acao !== "estado") return erro("não encontrado", 404);
  const admin = criarClienteAdmin();
  const aparelho = await aparelhoDaRequisicao(admin, req);
  if (!aparelho) return NextResponse.json({ pareado: false, pessoa: null, tarefa: null, proximas: [] }, { status: 401 });
  return NextResponse.json(await estadoDe(admin, aparelho.pessoaId));
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ acao: string }> }) {
  const { acao } = await params;
  const admin = criarClienteAdmin();

  if (acao === "parear") {
    const b = await corpo(req);
    const r = await parear(admin, String(b.codigo ?? ""), String(b.aparelho ?? "Windows"));
    return "erro" in r ? erro(r.erro!, 400) : NextResponse.json(r);
  }

  const aparelho = await aparelhoDaRequisicao(admin, req);
  if (!aparelho) return erro("aparelho não pareado ou desconectado", 401);
  try {
    if (acao === "iniciar") {
      const tarefaId = String((await corpo(req)).tarefaId ?? "");
      if (!/^[0-9a-f-]{36}$/.test(tarefaId)) return erro("tarefa inválida", 400);
      await iniciarComo(admin, aparelho.pessoaId, tarefaId);
    } else if (acao === "pausar") {
      await pausarComo(admin, aparelho.pessoaId);
    } else {
      return erro("não encontrado", 404);
    }
  } catch (e) {
    return erro(e instanceof Error ? e.message : String(e), 400);
  }
  return NextResponse.json(await estadoDe(admin, aparelho.pessoaId));
}
