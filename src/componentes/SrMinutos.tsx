import Image from "next/image";

/**
 * Sr. Minutos (docs/06). Duas peças:
 * - <Rosto>: o símbolo que vai DENTRO das caixas, no lugar de qualquer pontinho de status.
 *   A cor do aro é o estado (regra de 02/10): verde andamento/entregue, âmbar pausado,
 *   rosa fora do prazo, cinza não necessária/bloqueado, creme ainda não abriu.
 *   Cor nunca sozinha: quem usa o rosto sempre põe o texto do estado do lado.
 * - <Corpo>: corpo inteiro, só FORA das caixas, encostado numa borda (D3).
 */

export type EstadoRosto = "verde" | "ambar" | "rosa" | "cinza" | "creme";

const ARQUIVO_ROSTO: Record<EstadoRosto, string> = {
  verde: "/sr-minutos/rosto.png",
  ambar: "/sr-minutos/rosto-ambar.png",
  rosa: "/sr-minutos/rosto-rosa.png",
  cinza: "/sr-minutos/rosto-cinza.png",
  creme: "/sr-minutos/rosto-creme.png",
};

export function Rosto({ estado = "verde", tamanho = 14, className = "" }: { estado?: EstadoRosto; tamanho?: number; className?: string }) {
  return (
    <Image src={ARQUIVO_ROSTO[estado]} alt="" width={tamanho} height={tamanho} aria-hidden
      className={`shrink-0 select-none ${className}`} draggable={false} />
  );
}

export type Pose =
  | "apontando" | "joinha" | "bravo" | "furioso" | "triste" | "ferias"
  | "sentado" | "debrucado" | "espiando" | "andando" | "deitado" | "pendurado";

/** Proporção largura/altura de cada pose, pra reservar o espaço certo sem pular layout. */
const PROPORCAO: Record<Pose, number> = {
  apontando: 772 / 900, joinha: 795 / 876, bravo: 0.9, furioso: 0.9, triste: 0.9, ferias: 0.9,
  sentado: 619 / 640, debrucado: 566 / 640, espiando: 349 / 640, andando: 524 / 640, deitado: 1026 / 640, pendurado: 342 / 640,
};

/**
 * Corpo inteiro, posicionado em absoluto pelo pai (que precisa de `relative`).
 * Nunca recebe clique e nunca cobre texto: quem posiciona escolhe o ar livre da caixa.
 * `fala` mostra o balão; sem ela, ele só aparece.
 */
export function Corpo({ pose, altura = 150, fala, lado = "esquerda", className = "", style }: {
  pose: Pose; altura?: number; fala?: string; lado?: "esquerda" | "direita"; className?: string; style?: React.CSSProperties;
}) {
  const largura = Math.round(altura * PROPORCAO[pose]);
  return (
    <div className={`pointer-events-none absolute z-[3] ${className}`} style={style} aria-hidden={!fala}>
      <Image src={`/sr-minutos/${pose}.png`} alt="" width={largura} height={altura}
        className="block drop-shadow-[0_12px_14px_rgb(0_0_0/0.35)] select-none" draggable={false} />
      {fala && (
        <span role="note"
          className={`absolute top-2 whitespace-nowrap rounded-[12px] bg-creme px-3 py-1.5 font-display text-[15px] font-extrabold uppercase text-fundo shadow-lg -rotate-3 ${
            lado === "esquerda" ? "right-[calc(100%-18px)] rounded-br-[2px]" : "left-[calc(100%-18px)] rounded-bl-[2px]"
          }`}>
          {fala}
        </span>
      )}
    </div>
  );
}
