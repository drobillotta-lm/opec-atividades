# Notch do Sr. Minutos (Windows)

App nativo pequeno que deixa o Sr. Minutos preso na borda da tela, fora do navegador: o
cronômetro da tarefa atual, pausar/retomar e as próximas da semana. Modelo: o
[Codenotch](https://github.com/vinzdg/codenotch) (MIT), que o Daniel usa — decisão de 02/10 no
`docs/01-decisoes.md`. Nenhum código do Codenotch foi copiado.

## Como funciona

- **Casca, não cópia.** A janela (Tauri 2 + WebView2, transparente, sem borda, sempre por cima,
  fora da barra de tarefas) abre `https://opec-atividades.vercel.app/notch-app`. O visual é o
  mesmo `<Notch>` do site, mantido pela janela TELAS: mudou lá, muda aqui sem reinstalar.
- **A página não vê o token.** Ela só chama `window.__TAURI__.core.invoke(...)`:
  `estado`, `parear {codigo}`, `iniciar {tarefaId}`, `pausar`, `abrir {caminho}`,
  `tamanho {largura, altura, canto}`. Quem fala com `/api/notch/*` levando o token é o Rust
  (`src-tauri/src/main.rs`). A capacidade `capabilities/notch.json` só deixa a origem do site
  (e `localhost:3000`, pra dev) chamar esses comandos.
- **Login por pareamento.** No site, `/notch` gera um código de 8 caracteres, uso único, 5
  minutos. O app troca por um token do aparelho, guardado no **Gerenciador de Credenciais do
  Windows** (não em arquivo). No banco só existe o sha256 (`042`). Desconectar em `/notch`
  derruba o token na hora; o app percebe no próximo 401 e volta pra tela de código.
- **Bandeja:** Abrir Minha semana · Conectar o notch no site · Iniciar com o Windows (liga
  sozinho no primeiro pareamento) · Recarregar · Desconectar este computador · Sair.
- **Entregar** abre `/semana` no navegador: o diálogo de entrega (tempo, quem fez, selo
  "Valeu cara") continua sendo o do site.

## Instalar

`AtividadesOPEC-Setup.exe` instala só pro usuário, sem administrador, e baixa o WebView2 se
faltar. Não é assinado: na primeira vez o SmartScreen avisa "O Windows protegeu o
computador" → **Mais informações** → **Executar assim mesmo**. O site serve o instalador em
`/download/AtividadesOPEC-Setup.exe` (link na página `/notch`).

## Build

Precisa de Rust (`rustup`, sem admin), das Build Tools do Visual Studio (C++) e de Node.

```sh
cd desktop
npm install
npx tauri build          # gera src-tauri/target/release/bundle/nsis/*-setup.exe
```

Pra testar contra o `npm run dev` local: `OPEC_NOTCH_SITE=http://localhost:3000 npx tauri dev`
(só em build de desenvolvimento; o instalador sempre fala com o site oficial).

Depois de gerar, copie o instalador pra `public/download/AtividadesOPEC-Setup.exe` e suba.
