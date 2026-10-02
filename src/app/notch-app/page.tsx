import { NotchApp } from "./NotchApp";

// Rota que a janela nativa (Tauri) carrega. Pública no middleware: autenticação é o token
// de pareamento, que fica só no Rust (contrato com a janela APP, 02/10).
export default function NotchAppPagina() {
  return <NotchApp />;
}
