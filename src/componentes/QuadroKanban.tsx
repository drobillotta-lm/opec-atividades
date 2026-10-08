import { diaCurto, escaladosDe } from "@/lib/semana";
import { Rosto } from "@/componentes/SrMinutos";
import { SEM_EVENTO, nomeTarefa } from "@/componentes/nome-tarefa";

/**
 * Quadro kanban (06/10): antes era a página /kanban do líder; virou uma forma de ver as
 * tarefas dentro de Minha semana — as minhas por padrão, e toda a frente pro líder.
 * Colunas: Pendente (sem tempo e ninguém rodando) · Fazendo (tem tempo ou alguém rodando) ·
 * Feita (entregue, fora do prazo ou não necessária — resolvida, não fica pendurada).
 */
export type TarefaQuadro = {
  id: string;
  titulo?: string | null;
  atividade: string;
  status: string;
  escalado_id: string;
  dupla_id: string | null;
  responsavel_real_id: string | null;
  frente: { sigla: string } | null;
  evento: { competicao: string; data: string; evento_id_origem?: string | null; confronto?: string | null } | null;
  segundos: number;
  rodando: string[];
};

export function QuadroKanban({ tarefas, nomePor }: { tarefas: TarefaQuadro[]; nomePor: Map<string, string> }) {
  const pendente = tarefas.filter((t) => t.status === "pendente" && t.segundos <= 0 && t.rodando.length === 0);
  const fazendo = tarefas.filter((t) => t.status === "pendente" && (t.segundos > 0 || t.rodando.length > 0));
  const feita = tarefas.filter((t) => t.status === "entregue" || t.status === "fora_do_prazo" || t.status === "na");
  return (
    <div className="grid grid-cols-3 gap-4 items-start">
      <Coluna titulo="Pendente" cor="text-tinta-3" tarefas={pendente} nomePor={nomePor} />
      <Coluna titulo="Fazendo" cor="text-verde-claro" tarefas={fazendo} nomePor={nomePor} />
      <Coluna titulo="Feita" cor="text-verde-claro" tarefas={feita} nomePor={nomePor} />
    </div>
  );
}

function Coluna({ titulo, cor, tarefas, nomePor }: { titulo: string; cor: string; tarefas: TarefaQuadro[]; nomePor: Map<string, string> }) {
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-baseline gap-2 px-1">
        <h2 className={`text-[11.5px] font-semibold uppercase tracking-[0.1em] ${cor}`}>{titulo}</h2>
        <span className="text-[11.5px] text-tinta-4">{tarefas.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {tarefas.length === 0 && (
          <p className="rounded-[10px] border border-dashed border-linha px-3 py-4 text-[12px] text-tinta-4">Nada aqui.</p>
        )}
        {tarefas.map((t) => {
          const desvio = t.responsavel_real_id && t.responsavel_real_id !== t.escalado_id && t.responsavel_real_id !== t.dupla_id;
          const quem = t.responsavel_real_id
            ? nomePor.get(t.responsavel_real_id) ?? "—"
            : escaladosDe(nomePor, t.escalado_id, t.dupla_id);
          const naoNecessaria = t.status === "na";
          return (
            <div key={t.id} className={`rounded-[10px] bg-superficie border border-linha p-3 flex flex-col gap-1.5 ${naoNecessaria ? "opacity-60" : ""}`}>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[12.5px] font-medium ${naoNecessaria ? "line-through decoration-tinta-4" : ""}`}>
                  {nomeTarefa({ titulo: t.titulo, atividade: t.atividade, frente: null, evento: t.evento })}
                </span>
                <span className="text-[10.5px] text-tinta-4 shrink-0">{t.frente?.sigla ?? "sem frente"}</span>
              </div>
              <span className="text-[11px] text-tinta-4 truncate">
                {t.evento ? <>evento {diaCurto(t.evento.data)}</> : SEM_EVENTO}
              </span>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="text-[11.5px] text-tinta-3">
                  {naoNecessaria ? "não necessária" : `${quem}${desvio ? " · desvio" : ""}`}
                </span>
                {t.rodando.length > 0 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-verde-claro truncate">
                    <Rosto estado="verde" tamanho={12} />{t.rodando.join(", ")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
