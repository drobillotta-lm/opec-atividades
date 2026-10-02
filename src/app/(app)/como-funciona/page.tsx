import { Animado } from "@/componentes/SrMinutos";
// A página de confiança do piloto: o que fica registrado, quem vê, e o que o app não
// faz. O texto segue as decisões D4–D6 e "O que ele não faz" (docs/00-visao.md).
export default function ComoFunciona() {
  return (
    <div className="p-6 px-8 flex gap-10 items-start">
      <aside className="hidden lg:flex sticky top-6 w-[220px] shrink-0 flex-col items-center gap-3 text-center">
        <Animado pose="acena" altura={250} />
        <p className="font-display text-[21px] font-bold uppercase leading-[1.05]">
          &ldquo;Eu conto minutos. Não leio tela, não vejo aba, não sei se você levantou.&rdquo;
        </p>
        <span className="text-[11.5px] text-tinta-4">Sr. Minutos</span>
      </aside>
      <div className="flex flex-col gap-5 max-w-[760px] min-w-0 flex-1">
      <header className="flex flex-col gap-1.5">
        <h1 className="text-[34px]">Como funciona</h1>
        <p className="text-[12.5px] text-tinta-3">O que fica registrado, quem vê, e o que este app não faz</p>
      </header>

      <Bloco titulo="O que fica registrado">
        <li>A hora em que você <strong>inicia, pausa e entrega</strong> cada tarefa. Cada trecho é uma sessão; o total é a soma delas.</li>
        <li><strong>Ajustes de tempo</strong>, sempre com motivo, guardados separados do que o cronômetro mediu.</li>
        <li><strong>Quem fez</strong> cada tarefa: quem o mapa escalou, ou quem você disser na hora de entregar.</li>
        <li>Tarefas marcadas como <strong>não necessárias</strong>, com o motivo se você escrever um.</li>
      </Bloco>

      <Bloco titulo="Quem vê o quê">
        <li>Você vê as suas tarefas e as que puxou para ajudar alguém.</li>
        <li>O <strong>líder da frente</strong> vê a semana inteira da frente: quem estava escalado ao lado de quem fez.</li>
        <li>Yuri e Daniel veem tudo, por pessoa e por frente.</li>
        <li>Nada aqui é escondido da gestão. O que foi feito <em>fora do mapa</em> é o dado mais valioso: é o que mostra onde o mapa erra.</li>
      </Bloco>

      <Bloco titulo="O que o app não faz">
        <li>Não detecta inatividade nem ausência. Cronômetro parado é só cronômetro parado.</li>
        <li>Não lê tela, teclado, abas nem programas abertos. Em nenhuma fase.</li>
        <li>Não registra nada sozinho. Só existe o que você iniciar, pausar, entregar ou ajustar.</li>
        <li>Não vira ranking. Hora aparece com contexto — prazo, exceção, quem ajudou. Alguém acima da taxa não é alguém lento: é uma taxa que provavelmente está errada, e quem muda é a taxa.</li>
      </Bloco>

      <Bloco titulo="De onde vêm as tarefas">
        <li>Dos eventos da Escala que têm entrega comercial, cruzados com o <strong>mapa do mês</strong> aprovado pelo Yuri e com as <strong>taxas</strong> medidas em julho.</li>
        <li>A taxa é a estimativa, não o seu tempo. O app existe justamente para medir se ela ainda vale.</li>
        <li>Se uma tarefa aparecer e não fizer sentido, marque <strong>não necessária</strong>. Preferimos uma tarefa a mais do que uma faltando.</li>
        <li>Esqueceu o cronômetro? Ajuste o tempo, com o motivo. Um número em que você não confia é pior do que nenhum.</li>
      </Bloco>
      </div>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl bg-superficie border border-linha p-5 flex flex-col gap-3">
      <h2 className="text-[11.5px] font-semibold uppercase tracking-[0.1em] text-tinta-3">{titulo}</h2>
      <ul className="flex flex-col gap-2 text-[13px] leading-relaxed text-tinta-2 list-disc pl-5 marker:text-tinta-4">
        {children}
      </ul>
    </section>
  );
}
