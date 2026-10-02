export type Papel = "gestor" | "lider" | "membro";

export type Pessoa = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  h_dia: number;
};

export type TarefaDaSemana = {
  id: string;
  atividade: string;
  status: "pendente" | "entregue" | "fora_do_prazo" | "na";
  competencia: string;
  estimativa_min: number;
  abre_em: string;
  prazo_em: string;
  concluida_em: string | null;
  escalado_id: string;
  dupla_id: string | null;
  responsavel_real_id: string | null;
  frente: { sigla: string; nome: string } | null;
  evento: { competicao: string; data: string; evento_id_origem: string } | null;
  minutos_total: number;
  sessao_aberta_desde: string | null;
};
