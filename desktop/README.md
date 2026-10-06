# Notch do Sr. Minutos (Windows)

App nativo pequeno que deixa o Sr. Minutos preso na borda da tela, fora do navegador: os
cronômetros das tarefas em andamento, pausar/retomar/entregar e as próximas da semana. Modelo:
o [Codenotch](https://github.com/vinzdg/codenotch) (MIT), que o Daniel usa — decisão de 02/10 no
`docs/01-decisoes.md`. Nenhum código do Codenotch foi copiado.

## Como funciona

- **Casca, não cópia.** A janela (Tauri 2 + WebView2, transparente, sem borda, sempre por cima,
  fora da barra de tarefas) abre `https://opec-atividades.vercel.app/notch-app`. O visual é o
  `<Notch>` do site (`src/componentes/Notch.tsx`): mudou lá, muda aqui sem reinstalar. Só muda
  de `.exe` quando o lado Rust muda (comandos novos, janela, bandeja).
- **A página não vê o token.** Ela só chama `window.__TAURI__.core.invoke(...)`:
  `estado`, `parear {codigo}`, `iniciar {tarefaId}`, `pausar {tarefaId?}` (sem id pausa tudo),
  `entregar {tarefaId, obs?}` (0.3.0), `abrir {caminho}`, `tamanho {largura, altura, canto,
  recuoX?, recuoY?}` (0.3.0: afastamento ao longo da borda; antes era 96 px fixo). Quem fala
  com `/api/notch/*` levando o token é o Rust (`src-tauri/src/main.rs`). A capacidade
  `capabilities/notch.json` só deixa a origem do site (e `localhost:3000`, pra dev) chamar
  esses comandos.
- **Login por pareamento.** No site, `/notch` gera um código de 8 caracteres, uso único, 5
  minutos. O app troca por um token do aparelho, guardado no **Gerenciador de Credenciais do
  Windows** (não em arquivo). No banco só existe o sha256 (`042`). Desconectar em `/notch`
  derruba o token na hora; o app percebe no próximo 401 e volta pra tela de código.
- **Vários cronômetros (044, 06/10).** Iniciar não pausa as outras; o notch lista todas as que
  estão correndo, cada uma com Pausar e Entregar. Entregar usa o tempo medido como está; o
  diálogo completo (ajuste de minutos, quem fez, comentário) continua sendo o do site.
- **Janela transparente de verdade.** A janela tem 24 px de margem em volta do desenho (a sombra
  do card não é cortada reta pela borda), a cabeça não tem sombra, o fundo da página é
  transparente por CSS desde o primeiro frame e o Rust pede `set_background_color` transparente.
- **Bandeja:** Abrir Minha semana · Conectar o notch no site · Iniciar com o Windows (liga
  sozinho no primeiro pareamento) · Recarregar · Desconectar este computador · Sair.
- **Compatibilidade com o 0.2.0:** a página nova roda no app antigo. `entregar` não existe lá
  (a página abre `/semana` no navegador e avisa pra atualizar) e `pausar` ignora o `tarefaId`
  (pausa tudo). Atualize pra ter o comportamento completo.

## Mac (06/10)

O mesmo código roda no macOS (Tauri é multiplataforma): token no Keychain (`keyring` com
`apple-native`), janela transparente via `macOSPrivateApi`, app só na barra de menus
(`ActivationPolicy::Accessory`, sem ícone no Dock), início com o sistema por LaunchAgent. O que
**não** dá é compilar pra Mac a partir do Windows: o `.dmg` tem que ser gerado **num Mac** com
Xcode Command Line Tools (`xcode-select --install`), Rust (`rustup`) e Node:

```sh
cd desktop && npm install && npx tauri build   # gera src-tauri/target/release/bundle/dmg/*.dmg
```

Copie o `.dmg` pra `public/download/AtividadesOPEC.dmg` (o link já existe em `/notch`). O app é
assinado só ad hoc (`signingIdentity: "-"`): na primeira vez, botão direito → **Abrir**. Pra
sumir o aviso de vez seria preciso uma conta Apple Developer (US$ 99/ano) e notarização.

## Instalar

`AtividadesOPEC-Setup.exe` instala só pro usuário, sem administrador, e baixa o WebView2 se
faltar. Não é assinado: na primeira vez o SmartScreen avisa "O Windows protegeu o
computador" → **Mais informações** → **Executar assim mesmo**. O site serve o instalador em
`/download/AtividadesOPEC-Setup.exe` (link na página `/notch`). Instalar por cima atualiza.

## Build

Precisa de Rust (`rustup`, sem admin; fica em `%USERPROFILE%\.cargo\bin`, fora do PATH do
shell), das Build Tools do Visual Studio (C++) e de Node. A máquina do Desktop (06/10) não tem
nenhum dos dois: gerar no PC que já compilou o 0.2.0.

```sh
cd desktop
npm install
npx tauri build          # gera src-tauri/target/release/bundle/nsis/*-setup.exe
```

Pra testar contra o `npm run dev` local: `OPEC_NOTCH_SITE=http://localhost:3000 npx tauri dev`
(só em build de desenvolvimento; o instalador sempre fala com o site oficial).

Versão: `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` e `package.json` (os três juntos;
hoje **0.3.0**). Depois de gerar, copie o instalador pra `public/download/AtividadesOPEC-Setup.exe`
e suba.
