// Os comandos do app sao chamados por uma pagina remota (/notch-app do site). No Tauri 2,
// comando de app so vale pra origem remota se estiver no manifesto e liberado na
// capacidade (capabilities/notch.json, "allow-<comando>"). So esses sete.
fn main() {
    tauri_build::try_build(tauri_build::Attributes::new().app_manifest(
        tauri_build::AppManifest::new().commands(&["estado", "parear", "iniciar", "pausar", "comecar", "abrir", "tamanho"]),
    ))
    .expect("tauri build");
}
