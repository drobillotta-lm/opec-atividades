pesquisa gerenciador de tarefas/atividades

**Gerenciador de tarefas e atividades — proposta inicial**

### **Objetivo**

A ideia do gerenciador de tarefas e atividades nasce da necessidade de acompanhar o que foi planejado e confirmar se isso está, de fato, sendo executado. Além de verificar a execução, precisamos entender se o tempo previsto para cada atividade foi planejado corretamente e se a divisão das tarefas entre as pessoas está adequada.

Já existem várias ferramentas com propostas parecidas, e eu reuni alguns exemplos e referências. Mas o que quero criar é algo que se conecte ao nosso sistema de coordenação e mapeamento da área, e não apenas um gerenciador de tarefas isolado.

hoje no github [https://github.com/ymuanes/opec-dimensionamento](https://github.com/ymuanes/opec-dimensionamento) temos o projeto de dimensionamento e controle das atividades assincronas que vao ser umas das atividades q vamos mapear no app.

yuri e daniel como gestores master do app e da funcao de gestao das atividades  
resto do time se divide igual ta no projeto do github dimensioanmento, de acordo com cada mes, e de acordo com os eventos (atividades que sao interligadas com evento) aqui podemos interligar com o app da escala que esta em desselvolviimento) ((pra final depois))

### **Acesso e instalação**

Pensei em um aplicativo que a pessoa possa acessar pelo navegador, como o Google Chrome, entrando em um site e fazendo login, mas que também possa instalar no computador.

Também gostaria de explorar a possibilidade de acesso pelo celular, talvez por meio de um QR Code ou link que permita adicionar um atalho ou instalar a aplicação. Quando falo em instalação, penso nessa experiência simples: a pessoa recebe o acesso, abre e consegue deixar a ferramenta disponível no dispositivo.

No computador, a ideia também é facilitar ao máximo, em uma lógica de “plug and install”. Talvez isso possa acontecer por meio de um comando no terminal que faça a instalação. Essas são possibilidades que quero avaliar para tornar o acesso simples para a equipe.

### **Funcionamento no dia a dia**

Ao abrir a aplicação e fazer login, a pessoa se conecta ao sistema e visualiza as atividades que o gestor já planejou e atribuiu a ela.

Além dessas tarefas, a própria pessoa também deve conseguir adicionar atividades ao seu inventário: demandas que surgiram no decorrer dos dias e que ela precisou executar, mesmo que não estivessem no planejamento inicial.

Assim, a ferramenta deve permitir acompanhar tanto as atividades planejadas quanto aquelas que foram aparecendo na rotina, ajudando a entender o que realmente está sendo feito e como isso se relaciona com o planejamento e o tempo previsto.

### **Estrutura de gestão e acompanhamento**

Imagino uma estrutura com três níveis:

* **Gestor geral:** responsável pela visão do conjunto de atividades e pelo acompanhamento geral dentro do aplicativo.  
* **Líderes de frente:** acompanham suas próprias atividades e as atividades das pessoas que lideram.  
* **Liderados:** visualizam suas tarefas, acompanham o que foi planejado para eles e registram as atividades que surgem no dia a dia.

O ponto importante é que **todos os níveis têm atividades para executar**, inclusive o gestor geral e os líderes. Não é uma divisão em que alguns apenas acompanham e outros apenas fazem: todo mundo participa do mapeamento das próprias atividades, enquanto o acompanhamento da equipe segue essa hierarquia.

Conforme esses registros acontecem, as informações vão sendo cruzadas, permitindo que os gestores acompanhem o trabalho. Nesse fluxo, também podemos pensar em etapas de categorização das atividades e de conferência ou confirmação dos dados.

### **Referências e plano de construção**

Fiz algumas pesquisas e reuni referências que vou colocar abaixo, mesmo que ainda estejam um pouco misturadas.

A partir desse material, quero que você monte um plano de como podemos criar essa ferramenta, levando em conta tudo o que já discutimos e as informações que você já tem sobre o nosso trabalho, os processos da área e os sistemas com os quais ela deve se conectar.

Quero um plano **bem elaborado, robusto e viável**, mas com foco em colocar um **MVP no ar o mais rápido possível**. A ideia é começar com o necessário para a ferramenta cumprir seu papel e, depois, ir adicionando novos elementos e evoluindo a solução.

\-=-----------

O conceito do **@hivinz\_** (visto em projetos como *Codenotch* e *Sydedock*) aposta em micro-interfaces acopladas às bordas da tela (side-notch), fluidez visual e consumo nulo de atenção. Trazer essa linguagem para o Windows como um gerenciador de tempo/atividades de equipe une a leveza de um widget com a potência de uma ferramenta de colaboração em tempo real.

**Referências Recentes de Mercado (Últimos 3–6 meses)**

* **Codenotch / Sydedock (Vinz \- @hivinz\_)**: A maior referência de UX. Uma aba/notch retrátil minimalista acoplada no canto da tela com micro-animações, estados de foco e consumo mínimo de memória.  
*   
* **Rize.io (Team Visibility)**: Referência em visibilidade de equipe em tempo real. Ele monitora contexto sem micromanagement (sem guardar screenshots ou registradores de digitação, focando em transparência e privacidade).  
*   
* **Pulse.red**: Modelo de "Live Team Pulse". O gestor vê em uma lista simples quem está em pausa, em foco ou trabalhando em qual projeto no exato momento.  
*   
* **AppTimeTracker & TimeBomb (GitHub 2025/2026)**: Projetos open-source leves para Windows focados em janelas flutuantes retráteis ("Always on top") e pausa automática quando o usuário fica AFK (away from keyboard).  
* 

**Estrutura da Solução**

| Componente | Função | Tecnologia Sugerida |
| :---- | :---- | :---- |
| **Windows Desktop (Side-Notch)** | Widget retrátil fixado na lateral da tela ou ilha no topo. Mostra cronômetro, tarefa atual e status. | **Tauri (Rust \+ React)** — consome apenas 30MB de RAM (muito mais leve que Electron). |
| **Extensão Chrome** | Sincroniza o tempo de navegação e URLs ativas diretamente com a tarefa corrente. | Manifest V3 (WebExtension Standard). |
| **Web Dashboard (Gestor)** | Visão geral da equipe ("Live Pulse"), relatórios de horas por projeto e gerenciamento de membros. | Next.js / Tailwind CSS \+ Supabase. |

**Funcionalidades Principais**

* **Dock Lateral Auto-Hide (Modo Hivinz):** O widget fica oculto na borda da tela do Windows. Ao passar o cursor ou pressionar um atalho (Win \+ Shift \+ T), ele desliza suavemente mostrando a tarefa ativa, play/pause e seletor rápido.  
*   
* **Gestão de Equipe & Status "Live":**  
* 

  * **Visão do Usuário:** O funcionário vê quem do time está online/focado no momento (avatar compacto no widget).  
  *   
  * **Visão do Gestor:** Painel web minimalista mostrando tempo acumulado no dia, projeto atual de cada membro e métrica de foco (sem prints invasivos ou espionagem chata).  
  *   
* **Detecção Inteligente AFK:** Se a pessoa levantar do PC por mais de 3 minutos, o app detecta a ausência, pausa o cronômetro e pergunta ao retornar: "Quer descartar ou atribuir esse tempo pausado?".  
*   
* **Integração Web/Chrome:** Botão de 1 clique no navegador que inicia o timer sincronizado com o app desktop.  
* 

**Consolidado — Gerenciador de atividades LiveMode/OPEC**

**A ideia que saiu da conversa é criar um aplicativo leve para Windows, com tarefas e controle de tempo sempre acessíveis, conectado a um painel web para organizar e acompanhar a equipe.**

O diferencial não seria ter muitas funcionalidades, mas permitir que a pessoa **gerencie a execução do trabalho sem precisar ficar entrando em um sistema grande**.

Até aqui, temos **pesquisa de referências, uma proposta de produto e dois conceitos visuais**. A tecnologia, o escopo definitivo e a identidade visual ainda precisam ser validados; não construímos nem testamos um aplicativo funcional.

---

## **1\. O que você quer construir**

Você começou com uma referência do X e pediu algo na mesma linha, mas que:

* **Funcione no Windows e possa ficar aberto durante todo o expediente**, sem pesar ou atrapalhar outros programas.  
* **Organize atividades e acompanhe o tempo dedicado a cada uma**, com uma experiência simples e visualmente bem resolvida.  
* **Possa ser usado por várias pessoas**, com a possibilidade de alguém distribuir e acompanhar as atividades da equipe.  
* Tenha, possivelmente, uma alternativa pelo **Google Chrome**, e utilize a **estética LiveMode \+ OPEC que vocês já usam**.

A proposta central ficou assim:

> **Um dock discreto para quem executa as atividades, conectado a um painel web para quem planeja, distribui e acompanha o trabalho.**

A pessoa trabalha pelo dock. O gestor acompanha pelo navegador. O gestor também pode usar seu próprio dock para executar atividades.

---

## **2\. Todas as referências de produto**

### **Referência original**

[**Post que você enviou no X — @hivinz\_**](https://x.com/hivinz_/status/2097703277605581061?s=46)

Não consegui reproduzir diretamente o post. A análise visual se apoiou no **site do autor e no Sydedock**, que ele apresenta como um dock lateral para Mac com tarefas, notas e recursos de tempo. Portanto, não devemos tratar a reprodução integral do vídeo original como algo que foi verificado. ([Vinz](https://hivinz.com/))

### **Produtos encontrados e como aproveitá-los**

| Referência e links | O que encontramos | Papel no nosso projeto |
| ----- | ----- | ----- |
| **Sydedock** — [site do produto](https://sydedock.com/) · [site do autor](https://hivinz.com/) | Dock lateral para Mac, com cartões compactos e painéis que se expandem. Reúne tarefas, notas e outros recursos pessoais. Não confirmamos uma data formal de lançamento na pesquisa inicial. ([Vinz](https://hivinz.com/)) | **Principal inspiração visual e de interação:** presença discreta, pouco espaço ocupado e detalhes sob demanda. |
| **Counter** — [GitHub](https://github.com/makswinz/Counter) · [histórico de versões](https://github.com/makswinz/Counter/blob/main/CHANGELOG.md) | Timer e planejamento de tarefas em uma pequena barra no topo do Windows. Expande para outras funções e guarda dados localmente. Primeira versão pública em **29/08/2026**, com atualização em **30/08/2026**. ([GitHub](https://github.com/makswinz/Counter)) | **Principal referência de execução no Windows** e possível base para reaproveitamento de código. Não entrega, sozinho, a colaboração desejada. |
| **TriggerFlo** — [site](https://triggerflo.app/) · [downloads](https://triggerflo.app/download/) · [Microsoft Store](https://apps.microsoft.com/store/detail/9N0227FXZT6C?cid=DevShareMCLPCS) | Combina timer flutuante, tarefas, projetos, estimativas, atribuição para integrantes e relatórios. É o produto que considerei mais próximo do conjunto funcional imaginado. ([TriggerFlo](https://triggerflo.app/)) | **Primeiro candidato para testar antes de desenvolver**, verificando o que já resolve e qual diferença justificaria nosso produto. |
| **Solidtime** — [site](https://www.solidtime.io/) · [GitHub principal](https://github.com/solidtime-io/solidtime) · [app desktop](https://www.solidtime.io/desktop-app) · [GitHub desktop](https://github.com/solidtime-io/solidtime-desktop) | Controle de tempo, projetos, tarefas, equipes e relatórios. Foram encontrados registros de **timesheets em 03/06/2026** e **pausas em 28/07/2026**. O repositório do desktop ainda o identifica como beta. ([Solidtime](https://www.solidtime.io/)) | **Referência para a camada de gestão:** organização dos registros, visão por projeto e equipe, permissões e relatórios. |
| **Task Dock** — [Steam](https://store.steampowered.com/app/4350680/Task_Dock/) | Lista de tarefas flutuante, sempre acessível enquanto outros aplicativos são usados. Lançamento registrado em **07/07/2026**. Não confirmamos colaboração ou controle de horas equivalente ao escopo desejado. ([Loja Steam](https://store.steampowered.com/app/4350680/Task_Dock/)) | Referência de **simplicidade e presença no desktop**, sem transformar a interface em um painel enorme. |
| **Anchor Dock** — [GitHub](https://github.com/framedparadox/anchor-dock) · [versões](https://github.com/framedparadox/anchor-dock/releases) | Dock Windows para aplicativos, arquivos e atalhos, com encaixe nas bordas, ocultação e múltiplos monitores. A versão **1.2.2 aparece em 06/09/2026**. Não é um gerenciador de atividades. ([GitHub](https://github.com/framedparadox/anchor-dock)) | Referência de **comportamento da janela**: posicionar, recolher, reaparecer e conviver com o desktop. |
| **SideDock — extensão Chrome** — [Chrome Web Store](https://chromewebstore.google.com/detail/sidedock-%E2%80%93-chatgpt-side-p/mccflbjodnddlboijodfhbgicnnpfffb) | Painel lateral com tarefas, prioridades, notas e Pomodoro. A descrição informa funcionamento local, sem sincronização em nuvem. Versão **1.5 atualizada em 01/04/2026**. ([Chrome Web Store](https://chromewebstore.google.com/detail/sidedock-%E2%80%93-chatgpt-side-p/mccflbjodnddlboijodfhbgicnnpfffb)) | Referência para uma experiência dentro do navegador. **É outro produto, diferente do Sydedock para Mac.** |
| **Time Keep** — [site](https://www.timekeep.cc/) · [discussão no Hacker News](https://news.ycombinator.com/item?id=47937056) | Timers de navegador que podem flutuar acima de outras janelas usando Document Picture-in-Picture. A discussão consultada aparece como publicada **“há quatro meses”**, sem data absoluta confirmada nesta consulta. ([Hacker News](https://news.ycombinator.com/item?id=47937056)) | Demonstração prática de um possível **timer flutuante pelo Chrome**. |

**Atualização ao reconferir os links:** na primeira pesquisa não havia sido confirmada uma data recente do TriggerFlo. Agora, a página de downloads indica uma atualização geral em **20/09/2026**, mas esclarece que as versões são diferentes por plataforma; isso não significa que o Windows tenha recebido a mesma versão nessa data. ([TriggerFlo](https://triggerflo.app/download))

### **Síntese das referências**

**Sydedock para o visual \+ Counter para a interação Windows \+ TriggerFlo para comparar a solução completa \+ Solidtime para a gestão de equipe.**

Anchor Dock, SideDock e Time Keep complementam a pesquisa em aspectos específicos.

**Limites da pesquisa:** o foco solicitado era os últimos três a seis meses. A primeira resposta usou equivocadamente 12/09 como data de corte; a referência desta consolidação é **20/09/2026**. Os resultados mais verificáveis vieram de páginas oficiais, GitHub, lojas e Hacker News. A cobertura de X e Reddit foi limitada. Não instalamos os produtos nem medimos seu consumo de memória.

---

## **3\. Como seria a experiência do nosso aplicativo**

A proposta foi separar o produto em **três níveis**, mostrando apenas o necessário em cada momento.

### **Dock compacto — “o que estou fazendo agora?”**

Ficaria acessível na lateral ou em uma pequena barra, mostrando a atividade atual, seu projeto, o tempo e os controles essenciais.

Exemplo ilustrativo:

> **Revisar relatório mensal**  
> Financeiro · **18min42s** · estimativa de 45min  
> **Pausar · Concluir**

Deveria ser possível recolher, reposicionar ou esconder temporariamente o dock **sem interromper o timer**.

A posição lateral e a versão horizontal compacta seriam comparadas no protótipo. Não escolhemos definitivamente uma delas.

### **Painel expandido — “o que vem depois?”**

Ao abrir o dock, a pessoa encontraria sua fila do dia, criação rápida de atividade, prazos, estimativas, bloqueios e troca de tarefa.

A ideia é uma **lista curta e operacional**, não tentar colocar todo um sistema de gestão de projetos dentro de uma janela pequena.

Uma tarefa recebida do gestor apareceria discretamente na fila, sem interromper o trabalho atual.

### **Painel web — “como o trabalho está distribuído?”**

O gestor teria uma visão por pessoa e projeto, com atividades atribuídas, prazos, bloqueios e comparação entre estimado e registrado.

A divisão proposta é:

> **Desktop para executar. Navegador para planejar, distribuir e revisar.**

---

## **4\. Windows ou Google Chrome?**

**A recomendação principal foi aplicativo Windows \+ painel web.** A alternativa pelo Chrome continua possível, principalmente quando instalar aplicativos é uma restrição.

| Caminho | Uso proposto | Ressalva |
| ----- | ----- | ----- |
| **Aplicativo Windows** | Experiência diária de execução, com dock e timer. | Precisamos cuidar de instalação, atualizações, bandeja e comportamento da janela. |
| **Aplicação web** | Gestão da equipe e acesso eventual dos integrantes. | Não assumir que uma página comum equivale a um dock integrado ao desktop. |
| **Web com Picture-in-Picture** | Piloto sem instalador ou timer flutuante alternativo. | Depende da janela de origem e das regras do navegador. |
| **Extensão com painel lateral** | Rotinas realizadas principalmente dentro do Chrome. | O painel pertence ao navegador, não acompanha automaticamente todos os programas. |

A documentação do Chrome confirma que **Document Picture-in-Picture permite conteúdo HTML em uma janela sempre acima das outras**. Porém, sua abertura exige uma ação do usuário, a janela não sobrevive à janela que a abriu e sua posição não pode ser definida livremente pelo site. ([Chrome for Developers](https://developer.chrome.com/docs/web-platform/document-picture-in-picture))

O painel lateral de extensão, por sua vez, é uma interface exibida ao lado do conteúdo das páginas, dentro do navegador. ([Chrome for Developers](https://developer.chrome.com/docs/extensions/reference/api/sidePanel))

**Links técnicos:** [Document Picture-in-Picture](https://developer.chrome.com/docs/web-platform/document-picture-in-picture) · [API de painel lateral do Chrome](https://developer.chrome.com/docs/extensions/reference/api/sidePanel).

Não recomendamos começar desenvolvendo desktop, extensão e web como três produtos independentes.

---

## **5\. Escopo proposto para a primeira versão**

| Área | O que entraria |
| ----- | ----- |
| **Atividades** | Título, projeto, responsável, prazo, estimativa, prioridade e descrição curta ou link de contexto. |
| **Estados** | A fazer, em andamento, bloqueada e concluída. |
| **Controle de tempo** | Iniciar, pausar, retomar, trocar de atividade e consultar histórico diário. Pomodoro opcional. |
| **Desktop** | Dock recolhível, posição persistida, bandeja e início com o Windows opcional. |
| **Colaboração** | Convites, atribuição de tarefas e papéis de integrante, gestor e administrador. |
| **Gestão** | Visões por pessoa e projeto, atrasos, bloqueios, estimado versus registrado e exportação CSV. |
| **Confiabilidade** | Salvamento local imediato, uso offline e indicação de sincronização. |
| **Correções** | Ajustes de tempo com histórico, distinguindo registros do timer de lançamentos manuais. |

### **Uso individual, equipe e privacidade**

O produto deveria funcionar individualmente, sem obrigar a pessoa a montar uma organização inteira.

No modo equipe, ela entraria em um espaço compartilhado e receberia atividades. **Tarefas pessoais não seriam automaticamente visíveis ao gestor**, e essa separação precisaria existir nos dados e nas permissões.

Também propusemos **não transformar horas registradas em ranking de produtividade**. O painel deve apresentar contexto: esforço, entrega, prazo e bloqueios.

### **O que ficaria fora inicialmente**

Chat com IA, agentes, captura de tela, monitoramento de teclado, calendário completo, faturamento, aplicativo de celular e muitas integrações.

**A prioridade seria acertar tarefa, timer, sincronização e experiência de uso.**

---

## **6\. Regras importantes de funcionamento**

### **Tempo confiável**

O tempo seria calculado a partir de **sessões com início e fim**, não apenas de um contador visual.

No fluxo normal, cada pessoa teria uma atividade sendo cronometrada por vez. Trocar de tarefa encerraria uma sessão e iniciaria outra.

Também precisaríamos tratar explicitamente:

**Pausa e conclusão:** pausar o timer não significa concluir a tarefa. Acabar o Pomodoro também não.

**Fechamento e suspensão:** recolher para a bandeja, encerrar o aplicativo, suspender o computador e recuperar uma falha são situações diferentes. Intervalos incertos deveriam ser revisados, evitando registrar uma madrugada inteira silenciosamente.

**Ausência de teclado:** não significa necessariamente ausência de trabalho. Reuniões e leitura são exemplos em que a pessoa pode continuar trabalhando.

**Conflitos offline:** dois computadores desconectados podem gerar sessões sobrepostas. A sincronização precisa identificar isso e permitir correção, sem duplicar horas ou apagar registros silenciosamente.

### **Interface que não atrapalha**

O dock não deve roubar o foco, cobrir permanentemente controles importantes, abrir notificações invasivas ou exigir transparência para ficar legível. Atalhos globais precisam ser opcionais e configuráveis.

Esses cuidados foram reforçados pelo histórico do Counter, que registra correções para conflitos de atalhos, interferência sobre abas do navegador e problemas de contraste nas transparências. ([GitHub](https://github.com/makswinz/Counter/blob/main/CHANGELOG.md))

---

## **7\. O visual LiveMode \+ OPEC que exploramos**

Você pediu para visualizar o nosso produto com a estética da LiveMode e da OPEC. Produzimos **duas imagens conceituais**.

### **Conceito 1 — experiência no desktop**

**Abrir o primeiro mockup**

Explorou uma interface escura, cartões flutuantes, navegação lateral, lista de tarefas, timer expandido, resumo do tempo e notificações. Também apareceram elementos acessórios, como música e frases.

### **Conceito 2 — conjunto de telas do produto**

**Abrir o segundo mockup**

Ampliou o conceito para mostrar dock, detalhe de atividade, visão do gestor, relatórios, versão compacta e notificações, com identificação LiveMode/OPEC e acentos azul-violeta.

### **O que fica como direção visual**

A exploração aponta para **interface escura, tipografia legível, cartões arredondados, ícones discretos, timer em destaque e cor usada para orientar ações e estados**.

Mas há duas ressalvas importantes:

**Os mockups não validam a identidade oficial.** Não fechamos paleta, fontes, logotipo ou componentes a partir de um guia de marca e de telas reais da OPEC. São explorações, não reprodução fiel já aprovada.

**Tudo o que aparece nas imagens não está automaticamente no MVP.** Música, frases, abas de comentários, arquivos e integrações são elementos exploratórios. A versão funcional deveria ser mais enxuta, mantendo relatórios e gestão fora do dock compacto.

Nomes, horários, métricas e conteúdos apresentados nas imagens são ilustrativos.

---

## **8\. Tecnologia, reaproveitamento e desempenho**

### **Arquitetura sugerida, ainda não escolhida**

A primeira proposta foi **React \+ TypeScript** para compartilhar componentes entre desktop e web; **Tauri 2** para o aplicativo Windows; **SQLite** para dados locais; e **PostgreSQL**, possivelmente com **Supabase**, para autenticação, dados compartilhados e permissões.

A sincronização teria uma fila local de alterações, reenvio e identificadores para evitar duplicações.

O Tauri utiliza o mecanismo de visualização do sistema; no Windows, a distribuição precisa considerar o WebView2. Isso é uma opção interessante, **não uma garantia automática de baixo consumo de memória**. ([Tauri](https://v2.tauri.app/concept/architecture/))

**Links:** [arquitetura do Tauri](https://v2.tauri.app/concept/architecture/) · [instalador Windows e WebView2](https://v2.tauri.app/distribute/windows-installer/).

Como alternativa, discutimos **C\# \+ WPF**, especialmente para uma solução exclusivamente Windows. É a base utilizada pelo Counter. A escolha dependeria da experiência da equipe e da medição de um protótipo real. ([GitHub](https://github.com/makswinz/Counter))

### **Sincronização e segurança**

Não assumiríamos que a sincronização SQLite–servidor acontece automaticamente por usar Supabase.

As permissões precisam ser aplicadas no servidor, não apenas escondendo botões. A documentação do Supabase apresenta políticas de acesso por linha e alerta que chaves com privilégios de serviço não devem ser expostas ao cliente. ([Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security))

**Link:** [Supabase — Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).

### **O que pode ser reaproveitado**

**Counter e Anchor Dock:** seus repositórios apresentam licença MIT. São candidatos a estudo e reaproveitamento, preservando os avisos exigidos e revisando dependências e segurança. [Licença do Counter](https://github.com/makswinz/Counter/blob/main/LICENSE) · [Licença do Anchor](https://github.com/framedparadox/anchor-dock/blob/main/LICENSE). ([GitHub](https://github.com/makswinz/Counter/blob/main/LICENSE))

**Solidtime:** o projeto principal e o desktop usam AGPL-3.0. A recomendação foi utilizá-lo inicialmente como referência de produto e revisar as obrigações da licença antes de incorporar código a uma solução fechada. ([GitHub](https://github.com/solidtime-io/solidtime))

Para os produtos comerciais, a proposta é aproveitar princípios de interação, não reutilizar arquivos proprietários ou identidade visual.

### **Metas propostas para “ser leve”**

Estas foram **metas iniciais de engenharia**, não resultados já medidos:

| Critério | Meta proposta |
| ----- | ----- |
| **Memória em repouso** | Até 200 MB, considerando os processos associados, inclusive WebView2. |
| **CPU em repouso** | Média abaixo de 1% em um teste padronizado de dez minutos. |
| **Iniciar ou pausar** | Resposta local percebida em até 150 ms, sem depender da rede. |
| **Estabilidade** | Oito horas de uso sem crescimento contínuo de memória. |
| **Offline** | Continuar registrando e mostrar claramente o estado da sincronização. |
| **Desktop** | Testar suspensão, reconexão de monitor e diferentes escalas de tela. |

Para isso, propusemos evitar animações contínuas, não consultar o servidor a cada segundo e manter relatórios pesados no navegador.

---

## **9\. Plano de execução proposto**

A estimativa apresentada foi de **aproximadamente seis a oito semanas para um MVP controlado**, considerando um desenvolvedor experiente, apoio parcial de design/testes e piloto com cinco a dez pessoas.

**É uma hipótese de planejamento**, dependente de escopo, capacidade da equipe e dificuldade da sincronização.

| Etapa | Trabalho | Critério para avançar |
| ----- | ----- | ----- |
| **1\. Validar a necessidade** | Testar principalmente TriggerFlo e Counter e observar a rotina de algumas pessoas. | Identificar qual problema relevante continua sem solução. |
| **2\. Prototipar o dock real** | Comparar lateral e horizontal, comportamento da janela e consumo. | Não atrapalhar os programas principais e cumprir metas básicas. |
| **3\. Fechar a experiência individual** | Tarefas, timer, histórico, recuperação e offline. | Trabalhar um dia inteiro sem perder registros. |
| **4\. Adicionar colaboração** | Convites, atribuições, permissões, painel web e sincronização. | Operar com integrantes e gestor sem vazamento ou duplicação de dados. |
| **5\. Rodar o piloto** | Testar instalação, atualização, monitores, suspensão e rotina real. | As pessoas continuarem usando espontaneamente. |

A pergunta principal do piloto seria:

> **“Depois de uma semana, as pessoas preferem trabalhar com o dock aberto ou acabam fechando porque ele atrapalha?”**

---

## **10\. Onde chegamos e o que permanece em aberto**

**Temos:** conceito de produto, referências de mercado e técnicas, proposta de MVP, arquitetura candidata, metas de desempenho, plano de validação e dois mockups.

**Ainda falta decidir:** visual fiel à LiveMode/OPEC, formato padrão do dock, tecnologia após teste, possibilidade de instalação nos computadores, regras detalhadas de visibilidade, integrações necessárias e o quanto aproveitar de uma base existente.

**Ainda não fizemos:** instalação e comparação prática dos produtos, benchmark, protótipo navegável, implementação ou validação com usuários. O acompanhamento semanal de referências chegou a ser sugerido, mas não foi configurado.

### **A conclusão central**

> **Não construir um gerenciador de projetos completo de saída. Construir uma ótima interface de execução de atividades, com gestão compartilhada por trás.**

O núcleo é **atividade atual \+ tempo \+ próxima ação**, sempre acessível e sem interromper o trabalho. A gestão entra para ajudar a distribuir, acompanhar e melhorar o planejamento — não para transformar o aplicativo em vigilância.

# **Dock de Tarefas — Plano de execução (Fase 1: single-player)**

Uso interno. App Windows always-on, na borda da tela, uma tarefa por vez com contagem de tempo. Referência visual: Sydedock (hivinz). A camada de gestor é construída separadamente, mas **todo o modelo de dados e o log de eventos já nascem prontos para ela**.

---

## **1\. Decisões fechadas**

| Tema | Decisão |
| ----- | ----- |
| Quem cria tarefas | A pessoa cria as suas **e** o gestor atribui. Toda tarefa tem `created_by` e `assigned_to`. |
| Tempo contado | Só o que a pessoa iniciou/pausou manualmente. O relógio visível nunca para sozinho. |
| Inatividade | Detectada em background (sem input de teclado/mouse por N min) e gravada como **intervalo dentro da sessão**, sem alterar o tempo que a pessoa vê. Só o gestor enxerga. |
| Plataforma | App desktop Windows (Tauri v2). Sem extensão Chrome. |
| Backend | Local-first (SQLite) na Fase 1\. Sync para Postgres/Supabase entra na Fase 2, mas o schema já é o final. |
| Distribuição | Interna, instalador assinado \+ auto-update. |

---

## **2\. Stack**

* **Tauri v2** — shell Rust, frontend web. Binário \~10 MB, RAM alvo \< 60 MB.  
* **Frontend:** Svelte ou React \+ CSS puro (sem Tailwind pesado; o visual é custom). Animações via CSS/Web Animations, não bibliotecas.  
* **Persistência local:** SQLite via `tauri-plugin-sql`. Migrations versionadas desde o commit 1\.  
* **Inatividade:** crate `windows` → `GetLastInputInfo`. Poll a cada 30 s.  
* **Janela:** `transparent: true`, `decorations: false`, `alwaysOnTop: true`, `skipTaskbar: true`, tray icon com menu (mostrar/ocultar, sair). Snap na borda via `tauri-plugin-positioner` \+ lógica própria de auto-hide.  
* **Autostart:** `tauri-plugin-autostart`.  
* **Updater:** `tauri-plugin-updater` apontando pra um bucket interno.  
* **Repo:** `opec-dock` (ou nome a definir), monorepo com `/app` (Tauri) e `/shared` (tipos \+ schema SQL) — o dashboard do gestor importa `/shared`.

---

## **3\. Modelo de dados (definitivo — não muda na Fase 2\)**

Todas as tabelas: `id UUID`, `created_at`, `updated_at`, `deleted_at` (soft delete), `device_id`. Isso é o que permite sync bidirecional depois sem migração dolorosa.

```sql
users        (id, name, email, role: 'member'|'manager', team_id)
tasks        (id, title, notes, estimate_min, status: 'queued'|'active'|'done'|'dropped',
              assigned_to → users, created_by → users, source: 'self'|'manager',
              position INT, due_at, done_at)
sessions     (id, task_id → tasks, user_id → users, started_at, ended_at,
              end_reason: 'pause'|'done'|'switch'|'app_exit'|'crash_recovery')
idle_periods (id, session_id → sessions, started_at, ended_at)
events       (id, user_id, type, payload JSON, occurred_at)   -- append-only
daily_stats  (user_id, date, done_count, focus_min)            -- view materializada, não tabela fonte
```

Regras:

* `tempo contado da tarefa = Σ (sessions.ended_at − started_at)`.  
* `tempo ativo (só gestor) = tempo contado − Σ idle_periods`.  
* Só **uma** `session` aberta por usuário. Trocar de tarefa fecha a atual com `end_reason='switch'`.  
* Na Fase 1, `users` tem um único registro local; `assigned_to = created_by`. Na Fase 2 vira o usuário autenticado.  
* `events` é o log bruto (task\_created, session\_start, session\_pause, idle\_start, idle\_end, task\_done…). O dashboard do gestor lê daqui; `sessions`/`idle_periods` são derivadas e servem o widget.

---

## **4\. Widgets do MVP (nesta ordem de prioridade)**

1. **Tarefa atual** — título, anel de progresso (estimativa) ou cronômetro crescente se não houver estimativa, botão iniciar/pausar, botão concluir. Estado vazio: "Nada em andamento" com CTA pra puxar da fila.  
2. **Fila** — próximas 3 tarefas, arrastáveis pra reordenar. Tarefa atribuída pelo gestor (Fase 2\) chega com badge. Input inline pra criar nova.  
3. **Relógio** — hora, data opcional.  
4. **Streak** — 36 pontos (dias), intensidade \= `done_count` do dia.  
5. *(depois)* Notas rápidas, água, bateria.

Fora do MVP de propósito: subtarefas, tags, prioridades, integrações. Se sentir falta, é sinal de Fase 3, não de Fase 1\.

---

## **5\. Comportamento do dock**

* Encostado em qualquer borda (padrão: direita). Arrastar reposiciona; solta e ele "gruda".  
* **Auto-hide:** recolhe pra uma pílula de 6 px; expande no hover com delay de 250 ms; recolhe 800 ms depois do mouse sair. Pin pra manter aberto.  
* **Fullscreen aware:** se a janela em foco é fullscreen (apresentação, vídeo), o dock some.  
* **Fim da estimativa:** anel completa, pulso suave \+ toast do Windows. Nada de overlay bloqueante (opção pra Fase 3).  
* **Atalho global:** `Ctrl+Shift+Space` mostra/oculta; `Ctrl+Shift+Enter` iniciar/pausar a tarefa atual.  
* **Recuperação:** se o app fecha com sessão aberta, ao reabrir pergunta "Você estava em X — manter o tempo até agora ou descartar?" (`end_reason='crash_recovery'`).  
* **Inatividade:** após 5 min sem input, abre `idle_period`. Ao voltar, fecha. **Zero UI para a pessoa** na Fase 1 (decisão: o tempo contado não muda). Rever na Fase 2 se o time quiser um aviso opcional "você estava fora 12 min — descontar?".

---

## **6\. Orçamento de performance (gate de release)**

| Métrica | Alvo |
| ----- | ----- |
| CPU idle (dock recolhido) | \< 0,5 % de um core |
| CPU com anel animando | \< 2 % |
| RAM | \< 60 MB |
| Tempo até primeira renderização | \< 1 s |
| Tamanho do instalador | \< 15 MB |

Medir com Process Explorer em 2 máquinas do time antes de cada release.

---

## **7\. Cronograma (5 semanas)**

**Semana 0 — Fundação**

* Scaffold Tauri, janela transparente always-on-top funcionando, tray, autostart.  
* Schema SQLite \+ migrations \+ camada de repositório em `/shared`.  
* Clonar e estudar `vinzdg/codenotch` (design system, medidas, easing) e `FlorianButz/DynamicWin` (hover/edge).  
* Entregável: janela vazia que gruda na borda e sobrevive a reboot.

**Semana 1 — Tarefa atual \+ sessões**

* Criar tarefa, iniciar/pausar/concluir, anel de progresso, cronômetro.  
* `sessions` gravando corretamente incl. `switch` e `crash_recovery`.  
* Entregável: alguém do time consegue passar um dia usando só isso.

**Semana 2 — Fila \+ streak \+ relógio**

* Fila com drag-reorder, criação inline, promoção automática ao concluir.  
* Streak lendo `daily_stats`. Relógio.  
* Entregável: MVP funcional completo.

**Semana 3 — Inatividade \+ polimento**

* `GetLastInputInfo` \+ `idle_periods`. Fullscreen aware. Atalhos globais. Animações finais (o anel que "esvazia", a tarefa que "sobe").  
* Entregável: build interno v0.9 pra 3–5 pessoas.

**Semana 4 — Piloto e release**

* 5 dias de uso real. Corrigir o que aparecer. Instalador assinado \+ updater.  
* Critério de sucesso: ≥ 4 de 5 pessoas ainda com o app aberto no dia 5 sem ter sido cobradas.  
* Entregável: v1.0 interna.

---

## **8\. Preparação para a Fase 2 (gestor) — o que a Fase 1 já entrega**

* **Contrato de dados:** `/shared/schema.sql` \+ tipos TypeScript. O dashboard não inventa nada; lê `events`, `sessions`, `idle_periods`, `tasks`.  
* **Sync:** cada tabela tem `updated_at` \+ `deleted_at` \+ `device_id` → sync por "last write wins" com fila de saída local (`outbox`). Implementar o `outbox` já na Fase 1, mesmo sem destino — custa pouco e evita refatoração.  
* **Identidade:** `users.id` local é um UUID gerado no primeiro boot; ao logar com Google (Fase 2), faz-se o *merge* desse id no usuário real. Nunca usar `email` como chave.  
* **Atribuição:** `tasks.source='manager'` já existe; o widget só precisa renderizar o badge.  
* **Presença:** derivada da última `session` aberta — o dashboard mostra "em X há N min" sem endpoint novo.  
* **O que o gestor vê que a pessoa não vê:** `idle_periods` e `events`. Documentar isso pro time antes do piloto da Fase 2 — transparência evita rejeição.

---

## **9\. Riscos**

| Risco | Mitigação |
| ----- | ----- |
| Janela transparente \+ always-on-top brigando com jogos/apresentações | Fullscreen-aware desde a Semana 3 |
| Antivírus corporativo bloqueando binário não assinado | Certificado de code signing antes do piloto |
| Time achar que é vigilância | Inatividade não aparece pra pessoa; comunicar antes da Fase 2 o que o gestor vê |
| Escopo inflar (tags, subtarefas…) | Lista de "fora do MVP" na seção 4; tudo vai pra backlog da Fase 3 |
| Drift entre app e dashboard | `/shared` é a única fonte do schema; CI falha se divergir |

---

## **10\. Próximos passos imediatos**

1. Fechar nome do produto e do repo.  
2. Escolher Svelte vs React (sugestão: Svelte — bundle menor, animações mais simples).  
3. Rodar Semana 0\.

Segue o dossiê completo desta conversa: o que pedimos, o que a ref é de verdade, o mercado dos últimos 3–6 meses, o plano do produto e a estética Livemode \+ OPEC.

\---

\#\# 1\. O pedido original

Você mandou o Sydedock e pediu um \*\*gerenciador de atividades no mesmo pique\*\*, mas:

\- para \*\*Windows\*\*  
\- outras pessoas usam  
\- alguém \*\*gerencia as atividades\*\* dessas pessoas  
\- fica \*\*aberto o tempo todo\*\* no PC  
\- com \*\*gestão de tempo\*\* das atividades  
\- talvez versão \*\*Chrome\*\*  
\- \*\*leve\*\*, UX boa como a ref  
\- pesquisar iguais/parecidos nos \*\*últimos 3–6 meses\*\* (fóruns, X, etc.)

Link da ref: \[x.com/hivinz\_/status/2097703277605581061\](https://x.com/hivinz\_/status/2097703277605581061)

\---

\#\# 2\. O que a referência é (e o que não é)

\*\*Sydedock\*\* — Vinz (@hivinz\_), lançado \~9 set 2026\.

Não é Trello, não é Clockify, não é “abrir o app”. É um \*\*pilar vertical permanente na borda da tela\*\*: cards finos, glass, clique abre popover.

No vídeo: bateria, relógio analógico/digital, focus timer, hábitos, hidratação (streak \+ “drink now”), stickies pinados, assets, notes \+ tela de widgets pra reordenar.

| Dado | Valor |  
|---|---|  
| Plataforma | macOS 14+, Universal |  
| Preço | US$ 15 → 25, one-time, 1 device, 14-day refund |  
| Pitch | “A side dock for your Mac. Tasks, notes, water and time.” |  
| Site | \[hivinz.com\](https://hivinz.com/) |  
| Download | \[hivinz.com/download/sydedock\](https://hivinz.com/download/sydedock) |  
| Compra | \[hivinz.com/buy/sydedock\](https://hivinz.com/buy/sydedock) |  
| Autor | designer; também Codenotch, Screeen, Designgud |

O que a ref acerta (e o produto tem que copiar):

1\. Barra fina, não janela    
2\. Always-on-top sem roubar a tela    
3\. Estado no card, detalhe no popover    
4\. Rotina \+ tempo no mesmo lugar    
5\. Settings escondidos  

Se exigir “abrir o gerenciador”, perdeu o pique.

\---

\#\# 3\. Quase o mesmo produto (Mac, mercado quente)

\*\*Cooldock\*\* — segundo Dock no Mac com widgets vivos: Pomodoro, drink water, todos, calendar, stats, now playing. One-time \~US$ 15–35.    
\[cooldock.app\](https://www.dock.cool/) / \[cooldock.app\](https://cooldock.app/)

Outros docks Mac (contexto, não clone):

\- ExtraDock 5 — \[extradock.app\](https://extradock.app/)  
\- Better Dock — \[betterdockapp.com\](https://betterdockapp.com/)  
\- Dockside (file shelf) — \[hachipoo.com/dockside-app\](https://hachipoo.com/dockside-app)  
\- SpeedDock — \[speeddock.app\](https://speeddock.app/)  
\- ClutterDock (Mac \+ Windows) — \[clutterdock.com\](https://clutterdock.com/)

\---

\#\# 4\. Windows leve / overlay (o que mais importa pra gente)

| Produto | O quê | Pegar | Evitar | Link |  
|---|---|---|---|---|  
| \*\*TimeFence\*\* | Timer overlay Tauri/Rust | Stack nativo, always-on-top de verdade, \< Electron | Só timer | \[automatalabs.ca\](https://automatalabs.ca/low-resource-windows-timer-apps/) |  
| \*\*Patina\*\* | Time tracking local-first Tauri \+ React | Idle/lock/sleep confiável, dados locais | UI de relatório, não dock | \[github.com/Ceceliaee/patina\](https://github.com/Ceceliaee/patina) |  
| \*\*TokiKanri\*\* | Tracker \+ mini view always-on-top | Card compacto do app atual | Visual datado | \[github.com/niiccnm/TokiKanri\](https://github.com/niiccnm/TokiKanri) |  
| \*\*FlowTrak\*\* | Steam, set/2026. Tracker \+ overlay clock \+ Pomodoro | Overlay em fullscreen | App pesado de analytics | \[store.steampowered.com/app/4315770\](https://store.steampowered.com/app/4315770/FlowTrak/) |  
| \*\*Layer\*\* | Canvas transparente \+ widgets no desktop Win | Click-through, widgets soltos | Não é dock de rotina | Reddit r/windowsapps (v1.6, jun/2026) |  
| \*\*SideSlide\*\* | Dock/containers Win, ainda atualizado set/2026 | Prova que dock lateral no Win funciona | UX antiga | \[filehorse.com/download-sideslide\](https://www.filehorse.com/download-sideslide/) |  
| \*\*ModernTimer\*\* | Widget Rainmeter, set/2026 | Mini view \+ always-on-top | Não distribuível pra time | \[producthunt.com/products/moderntimer\](https://www.producthunt.com/products/moderntimer) |  
| \*\*Stopwatch Overlay\*\* | Timer transparente always-on-top | Hotkeys, multi-monitor | Só relógio | \[github.com/clemensv/stopwatch\](https://github.com/clemensv/stopwatch) |  
| \*\*FocusTimer\*\* | Overlay circular de foco | Simples, leve | Pouca profundidade | \[github.com/Dev2th3Core/FocusTimer\](https://github.com/Dev2th3Core/FocusTimer) |  
| \*\*Screeny\*\* | Screen time WinUI 3 | Nativo Win11, local | Analytics, não rotina | \[github.com/ArnoGevorkyan/Screeny\](https://github.com/ArnoGevorkyan/Screeny) |  
| \*\*ActivityWatch\*\* | OSS, local, AFK, extensão de browser | Privacidade, tracking de app | Dashboard web, não overlay | \[pcworld.com artigo ago/2026\](https://www.pcworld.com/article/3199298/track-your-screen-time-without-giving-up-your-privacy.html) |  
| \*\*PowerToys Always On Top\*\* | Win+Ctrl+T pina qualquer janela | O usuário Win já entende “pin this” | Não é produto | \[learn.microsoft.com\](https://learn.microsoft.com/en-us/windows/powertoys/always-on-top) |

Post X recente no mesmo território (11 set 2026): side panel Windows pra devs (weather, battery, Claude spend, notes, GitHub, music) — \[@CarlSwitch\_CHUG\](https://x.com/CarlSwitch\_CHUG/status/2098424566187974956).

Reddit útil:

\- Focus timer floating overlay — \[r/windowsapps\](https://www.reddit.com/r/windowsapps/comments/1r8p7li/i\_built\_a\_free\_focus\_timer\_for\_windows\_with\_a) (Electron; galera já reclama de RAM)  
\- Layer v1.6 — \[r/windowsapps\](https://www.reddit.com/r/windowsapps/comments/1u7g9c7/a\_new\_version\_of\_layer\_just\_shipped\_plus\_this/)

Comparativos de time trackers Win (2026):

\- \[memtime.com/blog/best-windows-time-trackers…\](https://www.memtime.com/blog/best-windows-time-trackers-that-dont-waste-your-time) — Memtime, RescueTime, ActivityWatch, Rize, Toggl, Clockify  
\- \[gitnux.org/best/desktop-tracking-software\](https://gitnux.org/best/desktop-tracking-software/) — ManicTime vs ActivTrak

\---

\#\# 5\. Chrome (sua dúvida)

\*\*SideDock\*\* (rizcraft) — side panel no Chrome: tasks, Pomodoro, notes, blocker, AI, weather. Local, sem conta.    
\[rizcraft.io/apps/sidedock\](https://rizcraft.io/apps/sidedock)

Conclusão da pesquisa: \*\*companion, não substituto\*\*. Some quando sai do browser. Não dá always-on-top no desktop.

\---

\#\# 6\. Time / “alguém gerencia as pessoas”

Isso já existe — e é o \*\*anti-Sydedock\*\*:

\- Clockify, Toggl Track, TMetric    
\- ManicTime, Trackabi — \[trackabi.com\](https://trackabi.com/time-tracking-desktop-application)    
\- SoftActivity Work, Hubstaff, Time Doctor, ActivTrak, Insightful  

Artigo 2026 sobre screenshot a cada 3–15 min: \[lazywork.xyz\](https://www.lazywork.xyz/articles/how-to-disable-or-bypass-screenshot-monitoring-software-in-2026-hubstaff-time-doctor-more)

\*\*Decisão que tomamos:\*\* modo gestor \= “quem está em quê agora \+ soma do dia”, \*\*opt-in, sem screenshot, sem keylog\*\*. Senão o produto vira spyware e mata a UX da ref.

Nicho mais próximo da “rotina” do que Jira:

\- \*\*Systems\*\* (@AdamKPx) — checklists reutilizáveis (morning routine, packing, weekly reset). \[post jun/2026\](https://x.com/AdamKPx/status/2068765580987887861)  
\- Leantime — PM pra cérebro ADHD, self-host. Citado no X jul/2026  
\- TickTick — to-do \+ calendar \+ Pomodoro leve no Win

\---

\#\# 7\. Posicionamento que fechamos

Três camadas, nesta ordem:

1\. \*\*Solo\*\* — dock na borda, timer \+ fila do dia \+ rotina (cara da ref)    
2\. \*\*Compartilhado\*\* — o mesmo dock em vários PCs    
3\. \*\*Coach/gestor\*\* — vê sessão ativa \+ tempo. Consentimento explícito  

Diferenciação vs Sydedock/Cooldock: \*\*Windows \+ tempo por atividade \+ workspace opcional\*\*.    
Diferenciação vs Clockify: \*\*vive na borda, não numa timesheet\*\*.

Eixo escolhido: \*\*B\*\* (dock \+ tempo \+ time), mas o MVP tem que \*\*parecer A\*\* (clone fiel da ref). Gestor é camada, não a cara.

\---

\#\# 8\. Plano de produto

\#\#\# MVP (4–6 semanas)  
\- Dock L/R, arrastável, auto-hide opcional, always-on-top, multi-monitor    
\- RAM alvo \*\*\< 80 MB idle\*\*    
\- Stack: \*\*Tauri\*\* (Rust \+ webview), não Electron    
\- Auto-start, bandeja, um \`.exe\` / MSI  

Cards MVP: Agora (atividade \+ cronômetro) · Fila 3–7 itens · Focus timer · Relógio · Nota pinada · 1 hábito (água/pausa)

Tempo: play/pause manual \+ auto-pause por idle. \*\*Sem\*\* trackear app em primeiro plano no dia 1\.

\#\#\# Depois  
\- v0.2 — outras pessoas instalam (MSI, temas, CSV, hotkeys)    
\- v0.3 — extensão Chrome (Side Panel API, mesma fila)    
\- v1.0 — workspace, convite, painel web “quem está em quê”  

Arquitetura:

\`\`\`  
dock.exe (Tauri) \+ SQLite local \+ idle Win API  
        │ sync opcional  
   API (Supabase / PocketBase)  
        ├── painel gestor web  
        └── extensão Chrome  
\`\`\`

Por que Tauri: TimeFence, Patina, HeyNotch já validam overlay leve. Electron no Reddit \= “quanto de RAM?”.

\#\#\# Não fazer  
\- Hubstaff (screenshot)    
\- Notion/ClickUp (backlog eterno)    
\- Electron “porque é mais fácil”    
\- Conta obrigatória no solo    
\- Auto-trackear tudo no dia 1  

Validação em 7 dias: Figma do pilar 64px → overlay Tauri com timer \+ 3 tarefas → usar 2 dias. Se desinstalar, o produto não existe.

\---

\#\# 9\. Estética que desenhamos: Livemode \+ OPEC

Pedido seguinte: visual \*\*Livemode \+ OPEC que vocês já usam\*\*. Não achei arquivo antigo de tokens nesta sessão; montei o idioma no cruzamento:

\- \*\*Livemode\*\* \= HUD ao vivo, sessão rodando, número em mono, pip LIVE    
\- \*\*OPEC\*\* \= azul cerúleo \`\#0086BF\`, círculos recortados, autoridade de energia  

Sydedock é doce/glass Apple. O nosso é petróleo.

| Token | Hex | Uso |  
|---|---|---|  
| Oil | \`\#07090C\` | canvas |  
| Surface | \`\#0C1218\` @ 78% | dock/popover |  
| OPEC | \`\#0086BF\` | anel, barra, primário |  
| Live | \`\#3DDC97\` | pip de sessão |  
| Amber | \`\#E8B86D\` | aviso / idle |  
| Steel | \`\#7A8A96\` | label |  
| Paper | \`\#E8EEF2\` | timer |  
| Cut | \`\#E85D4C\` | encerrar |

Tipo: IBM Plex Sans (rótulo) \+ IBM Plex Mono (tempo).    
Raio 16/22. Borda \`1px rgba(0,134,191,0.22)\`.    
Mark: emblema geométrico estilo OPEC no card “Agora”, no lugar do raio do Sydedock.    
Recusar: Liquid Glass, neon cyber, post-it amarelo, dashboard de RH no overlay.

Mockups gerados nesta conversa: pilar no Win11, popover “AGORA”, board de tokens.

\---

\#\# 10\. Links-chave (coleção)

\*\*Ref e autor\*\*    
\- https://x.com/hivinz\_/status/2097703277605581061    
\- https://x.com/hivinz\_/status/2096195844798292232 (teaser hábitos, 5 set)    
\- https://hivinz.com/    
\- https://hivinz.com/download/sydedock    
\- https://hivinz.com/buy/sydedock  

\*\*Docks / widgets\*\*    
\- https://www.dock.cool/    
\- https://rizcraft.io/apps/sidedock    
\- https://clutterdock.com/    
\- https://www.filehorse.com/download-sideslide/  

\*\*Win overlay / timer / tracking leve\*\*    
\- https://github.com/Ceceliaee/patina    
\- https://github.com/niiccnm/TokiKanri    
\- https://github.com/clemensv/stopwatch    
\- https://automatalabs.ca/low-resource-windows-timer-apps/    
\- https://store.steampowered.com/app/4315770/FlowTrak/    
\- https://learn.microsoft.com/en-us/windows/powertoys/always-on-top    
\- https://www.pcworld.com/article/3199298/track-your-screen-time-without-giving-up-your-privacy.html  

\*\*X recente\*\*    
\- https://x.com/CarlSwitch\_CHUG/status/2098424566187974956    
\- https://x.com/AdamKPx/status/2068765580987887861  

\*\*Mercado pesado (o que não ser)\*\*    
\- https://www.memtime.com/blog/best-windows-time-trackers-that-dont-waste-your-time    
\- https://trackabi.com/time-tracking-desktop-application  

\---

\#\# 11\. O que ainda está em aberto

1\. Confirmar se os hex Livemode \+ OPEC acima são os de vocês ou se manda paleta real.    
2\. Modo gestor é líder de time, professor ou pais — muda permissão.    
3\. Próximo passo concreto que ofereci: spec dos 6 cards \+ schema SQLite \+ proto Tauri, ou re-render do pilar com tokens oficiais.

Isso é o estado da pesquisa e das decisões até aqui.  
