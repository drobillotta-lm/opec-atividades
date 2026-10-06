import { redirect } from "next/navigation";

// O Quadro virou uma forma de ver Minha semana (06/10, pedido do Daniel): "Quadro kanban",
// com as minhas tarefas, e "toda a frente" pro líder. Link antigo cai no quadro da frente.
export default function Kanban() {
  redirect("/semana?ver=kanban&quem=frente");
}
