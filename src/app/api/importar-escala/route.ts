import { criarClienteAdmin } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

// Importa da Escala 2x por dia (08h e 20h BRT, ver .github/workflows/importar-escala.yml):
// eventos (a Escala já ingere do Airtable de hora em hora, com a classificação de
// elegibilidade que este app reimplementaria em vão) e os plantões confirmados dos
// 6 fixos (freela não executa a cadeia assíncrona daqui — decisão de 21/09).
//
// Nunca é editável fora daqui: mapa, eventos e plantoes só entram por importação,
// rodando com a service role (docs/02-modelo-dados.md).

export const runtime = "nodejs";

const ESCALA_API_URL = "https://escala-opec.vercel.app";
const PISO = "2026-09-21"; // o app não conta carga antes disso (supabase/README.md)

// Os 6 fixos existem nos dois apps com e-mails diferentes (breis@ na Escala,
// barbara@ nas Atividades) — o de-para é por nome, então fica explícito aqui.
const PESSOA_POR_NOME: Record<string, string> = {
  "Bárbara Reis": "barbara@livemode.com",
  "Gabriel Duarte": "gabriel@livemode.com",
  "Julia Bruno": "julia@livemode.com",
  "Juliana Becker": "juliana@livemode.com",
  "Lucas Matias": "lucas@livemode.com",
  "Pedro Lopes": "pedro@livemode.com",
};

type EventoEscala = {
  airtable_id: string;
  data: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  competicao: string | null;
  jogo: string | null;
  frente: string | null; // na Escala isso é o Detentor fórmula, não o frente_id daqui
  pd: string | null;
  tem_entrega: "sim" | "nao" | "indefinido";
  elegivel: boolean;
  motivo_inelegivel: string | null;
  status_airtable: string | null;
};

type PlantaoEscala = {
  pessoa: string;
  status: string;
  data: string;
  competicao: string | null;
  jogo: string | null;
};

// Mesma classificação das migrations 011/019, agora aplicada aqui porque a
// origem deixou de ser o Airtable direto e passou a ser a Escala.
function classificarTipo(jogo: string | null): string {
  const j = jogo || "";
  if (/^reprise/i.test(j) || /\|\s*reprise/i.test(j)) return "reprise";
  if (/^grava/i.test(j)) return "gravacao";
  if (/^externa/i.test(j)) return "externa";
  if (/\[sem narra/i.test(j)) return "sem_narracao";
  if (/pré jogo/i.test(j)) return "pre_jogo";
  return "normal";
}

function diaUtilOuFds(data: string): "du" | "fds" {
  const dow = new Date(data + "T12:00:00-03:00").getDay(); // meio-dia foge de qualquer virada de fuso
  return dow === 0 || dow === 6 ? "fds" : "du";
}

function json(obj: unknown, status = 200) {
  return NextResponse.json(obj, { status });
}

export async function POST(req: NextRequest) {
  const segredo = process.env.CRON_SECRET;
  if (!segredo) return json({ erro: "servidor sem CRON_SECRET configurado" }, 500);
  if (req.headers.get("authorization") !== `Bearer ${segredo}`) {
    return json({ erro: "não autorizado" }, 401);
  }

  const tokenEscala = process.env.ESCALA_AGENTE_TOKEN;
  if (!tokenEscala) return json({ erro: "servidor sem ESCALA_AGENTE_TOKEN configurado" }, 500);

  const resp = await fetch(`${ESCALA_API_URL}/api/agent/exportar`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-agente-token": tokenEscala },
    body: JSON.stringify({ de: PISO }),
  });
  if (!resp.ok) {
    return json({ erro: `Escala respondeu ${resp.status}: ${await resp.text()}` }, 502);
  }
  const pacote = (await resp.json()) as { eventos: EventoEscala[]; plantoes: PlantaoEscala[] };

  const admin = criarClienteAdmin();

  // 1) competições novas ficam sem frente — o Admin já pede classificação (013)
  const nomesCompeticao = [...new Set(pacote.eventos.map((e) => e.competicao).filter(Boolean))] as string[];
  if (nomesCompeticao.length) {
    const { error } = await admin
      .from("competicoes")
      .upsert(
        nomesCompeticao.map((nome) => ({ nome, origem: "airtable" })),
        { onConflict: "nome", ignoreDuplicates: true },
      );
    if (error) return json({ erro: `upsert competicoes: ${error.message}` }, 500);
  }

  const { data: competicoes, error: erroCompeticoes } = await admin
    .from("competicoes")
    .select("id,nome")
    .in("nome", nomesCompeticao.length ? nomesCompeticao : [""]);
  if (erroCompeticoes) return json({ erro: `ler competicoes: ${erroCompeticoes.message}` }, 500);
  const idCompeticaoPorNome = new Map((competicoes ?? []).map((c) => [c.nome, c.id]));

  // 2) eventos: campos base sempre atualizam; entrega/entrega_origem nunca
  //    sobrescrevem uma decisão que já é 'lider' (guardado no passo 3)
  const linhasEvento = pacote.eventos
    .filter((e) => e.airtable_id)
    .map((e) => ({
      airtable_record_id: e.airtable_id,
      evento_id_origem: e.jogo || e.airtable_id,
      competicao: e.competicao || "",
      competicao_id: e.competicao ? idCompeticaoPorNome.get(e.competicao) ?? null : null,
      data: e.data,
      inicio_brt: e.hora_inicio ? `${e.data}T${e.hora_inicio}-03:00` : null,
      tipo: classificarTipo(e.jogo),
      status_origem: e.status_airtable,
      detentor: e.frente,
      sincronizado_em: new Date().toISOString(),
    }));

  if (linhasEvento.length) {
    const { error } = await admin.from("eventos").upsert(linhasEvento, { onConflict: "airtable_record_id" });
    if (error) return json({ erro: `upsert eventos: ${error.message}` }, 500);
  }

  // 3) a decisão "tem entrega?" da Escala, guardada contra o que o líder já resolveu aqui
  for (const valor of ["sim", "nao"] as const) {
    const ids = pacote.eventos.filter((e) => e.tem_entrega === valor).map((e) => e.airtable_id);
    if (!ids.length) continue;
    const { error } = await admin
      .from("eventos")
      .update({ entrega: valor === "sim", entrega_origem: "escala" })
      .in("airtable_record_id", ids)
      .or("entrega_origem.is.null,entrega_origem.neq.lider");
    if (error) return json({ erro: `marcar entrega (${valor}): ${error.message}` }, 500);
  }

  // 4) o que ninguém decidiu ainda cai no padrão da competição (mesma regra da 014)
  const { error: erroPrevisao } = await admin.rpc("aplicar_previsao_entrega");
  if (erroPrevisao) return json({ erro: `aplicar_previsao_entrega: ${erroPrevisao.message}` }, 500);

  // 5) plantão dos fixos — um registro por pessoa e dia (é o que a unique garante):
  //    duas alocações no mesmo dia não dobram a carga, é o mesmo turno.
  const { data: pessoas, error: erroPessoas } = await admin.from("pessoas").select("id,email,h_dia");
  if (erroPessoas) return json({ erro: `ler pessoas: ${erroPessoas.message}` }, 500);
  const pessoaPorEmail = new Map((pessoas ?? []).map((p) => [p.email, p]));

  const porDia = new Map<string, { pessoa_id: string; data: string; competicoes: Set<string>; h_dia: number }>();
  const semMapeamento = new Set<string>();
  for (const p of pacote.plantoes) {
    const email = PESSOA_POR_NOME[p.pessoa];
    const pessoa = email ? pessoaPorEmail.get(email) : undefined;
    if (!pessoa) {
      semMapeamento.add(p.pessoa);
      continue;
    }
    const chave = `${pessoa.id}|${p.data}`;
    const atual = porDia.get(chave) ?? {
      pessoa_id: pessoa.id,
      data: p.data,
      competicoes: new Set<string>(),
      h_dia: Number(pessoa.h_dia),
    };
    if (p.competicao) atual.competicoes.add(p.competicao);
    porDia.set(chave, atual);
  }

  const linhasPlantao = [...porDia.values()].map((p) => {
    const tipo = diaUtilOuFds(p.data);
    return {
      pessoa_id: p.pessoa_id,
      data: p.data,
      competicao: [...p.competicoes].join(" + ") || null,
      tipo,
      horas: tipo === "du" ? 4.5 : p.h_dia,
      importado_em: new Date().toISOString(),
    };
  });

  if (linhasPlantao.length) {
    const { error } = await admin.from("plantoes").upsert(linhasPlantao, { onConflict: "pessoa_id,data" });
    if (error) return json({ erro: `upsert plantoes: ${error.message}` }, 500);
  }

  // 6) gera as tarefas da janela tocada — idempotente (docs/03-plano.md)
  const hoje = new Date();
  const fim = new Date(hoje);
  fim.setDate(fim.getDate() + 21);
  const { error: erroGerar } = await admin.rpc("gerar_tarefas", {
    p_inicio: PISO,
    p_fim: fim.toISOString().slice(0, 10),
  });
  if (erroGerar) return json({ erro: `gerar_tarefas: ${erroGerar.message}` }, 500);

  return json({
    ok: true,
    eventos: linhasEvento.length,
    competicoes_novas: nomesCompeticao.length,
    plantoes: linhasPlantao.length,
    plantao_sem_mapeamento: [...semMapeamento],
  });
}
