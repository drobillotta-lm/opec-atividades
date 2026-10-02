// Notch do Sr. Minutos no Windows (decisao 02/10, modelo do Codenotch).
//
// O app e uma casca: a janela abre /notch-app do site (visual da janela TELAS) e a pagina
// pede tudo por invoke(). Quem fala com a API e guarda o token e este lado Rust; a pagina
// nunca ve o token. O token vem do pareamento por codigo (/notch no site) e mora no
// Gerenciador de Credenciais do Windows, nao em arquivo.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde_json::{json, Value};
use std::time::Duration;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::TrayIconBuilder,
    Manager, PhysicalPosition, PhysicalSize, WebviewUrl, WebviewWindow, WebviewWindowBuilder,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_opener::OpenerExt;

const SITE: &str = "https://opec-atividades.vercel.app";
const SERVICO_COFRE: &str = "atividades-opec-notch";
const CONTA_COFRE: &str = "token-do-aparelho";

/// Em build de desenvolvimento da pra apontar pro `npm run dev` (OPEC_NOTCH_SITE).
/// No instalador nao: o token so vai pro site oficial.
fn site() -> String {
    #[cfg(debug_assertions)]
    if let Ok(s) = std::env::var("OPEC_NOTCH_SITE") {
        return s.trim_end_matches('/').to_string();
    }
    SITE.to_string()
}

// --- cofre ---------------------------------------------------------------------------

fn cofre() -> Result<keyring::Entry, String> {
    keyring::Entry::new(SERVICO_COFRE, CONTA_COFRE).map_err(|e| e.to_string())
}
fn ler_token() -> Option<String> {
    cofre().ok()?.get_password().ok()
}
fn guardar_token(token: &str) -> Result<(), String> {
    cofre()?.set_password(token).map_err(|e| e.to_string())
}
fn apagar_token() {
    if let Ok(c) = cofre() {
        let _ = c.delete_credential();
    }
}

// --- API -----------------------------------------------------------------------------

struct Http(reqwest::Client);

fn nao_pareado() -> Value {
    json!({ "pareado": false, "pessoa": null, "tarefa": null, "proximas": [] })
}

/// Chama /api/notch/<acao> com o token. 401 = aparelho desconectado no site: esquece o token.
async fn chamar(http: &reqwest::Client, acao: &str, corpo: Option<Value>) -> Result<Value, String> {
    let Some(token) = ler_token() else { return Ok(nao_pareado()) };
    let url = format!("{}/api/notch/{}", site(), acao);
    let req = match corpo {
        None => http.get(url),
        Some(c) => http.post(url).json(&c),
    };
    let r = req.bearer_auth(token).send().await.map_err(|e| format!("sem conexão com o site: {e}"))?;
    if r.status() == reqwest::StatusCode::UNAUTHORIZED {
        apagar_token();
        return Ok(nao_pareado());
    }
    let ok = r.status().is_success();
    let v: Value = r.json().await.map_err(|e| e.to_string())?;
    if !ok {
        return Err(v.get("erro").and_then(|e| e.as_str()).unwrap_or("o site recusou").to_string());
    }
    Ok(v)
}

#[tauri::command]
async fn estado(http: tauri::State<'_, Http>) -> Result<Value, String> {
    chamar(&http.0, "estado", None).await
}

#[tauri::command]
async fn iniciar(http: tauri::State<'_, Http>, tarefa_id: String) -> Result<Value, String> {
    chamar(&http.0, "iniciar", Some(json!({ "tarefaId": tarefa_id }))).await
}

#[tauri::command]
async fn pausar(http: tauri::State<'_, Http>) -> Result<Value, String> {
    chamar(&http.0, "pausar", Some(json!({}))).await
}

#[tauri::command]
async fn parear(app: tauri::AppHandle, http: tauri::State<'_, Http>, codigo: String) -> Result<Value, String> {
    let aparelho = std::env::var("COMPUTERNAME").unwrap_or_else(|_| "Windows".into());
    let r = http.0
        .post(format!("{}/api/notch/parear", site()))
        .json(&json!({ "codigo": codigo, "aparelho": aparelho }))
        .send().await.map_err(|e| format!("sem conexão com o site: {e}"))?;
    let ok = r.status().is_success();
    let v: Value = r.json().await.unwrap_or_else(|_| json!({}));
    if !ok {
        let erro = v.get("erro").and_then(|e| e.as_str()).unwrap_or("Não deu pra parear.");
        return Ok(json!({ "ok": false, "erro": erro }));
    }
    let token = v.get("token").and_then(|t| t.as_str()).ok_or("o site não mandou a chave")?;
    guardar_token(token)?;
    // Pareou: passa a abrir junto com o Windows (dá pra desligar na bandeja).
    let _ = app.autolaunch().enable();
    Ok(json!({ "ok": true, "nome": v.get("nome").cloned().unwrap_or(Value::Null) }))
}

/// Abre uma página do site no navegador padrão. Só caminho relativo do próprio site.
#[tauri::command]
fn abrir(app: tauri::AppHandle, caminho: String) -> Result<(), String> {
    if !caminho.starts_with('/') || caminho.starts_with("//") {
        return Err("caminho inválido".into());
    }
    app.opener().open_url(format!("{}{}", site(), caminho), None::<&str>).map_err(|e| e.to_string())
}

/// Redimensiona e gruda a janela na borda do monitor. Tamanhos em px de CSS; o canto da
/// janela encostado na borda é o canto da pílula, então ela não pula quando cresce.
fn posicionar(janela: &WebviewWindow, largura: f64, altura: f64, canto: &str) -> Result<(), String> {
    let monitor = janela.current_monitor().map_err(|e| e.to_string())?
        .or(janela.primary_monitor().map_err(|e| e.to_string())?)
        .ok_or("sem monitor")?;
    let escala = monitor.scale_factor();
    let area = monitor.work_area();
    let (ax, ay) = (area.position.x, area.position.y);
    let (aw, ah) = (area.size.width as i32, area.size.height as i32);
    let w = (largura.clamp(40.0, 600.0) * escala).round() as i32;
    let h = (altura.clamp(40.0, 700.0) * escala).round() as i32;
    let recuo = (96.0 * escala).round() as i32;
    let (x, y) = match canto {
        "baixo-esq" => (ax + recuo, ay + ah - h),
        "dir-alto" => (ax + aw - w, ay + recuo),
        "esq-alto" => (ax, ay + recuo),
        _ => (ax + aw - w - recuo, ay + ah - h), // baixo-dir
    };
    janela.set_size(PhysicalSize::new(w as u32, h as u32)).map_err(|e| e.to_string())?;
    janela.set_position(PhysicalPosition::new(x, y)).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn tamanho(window: WebviewWindow, largura: f64, altura: f64, canto: String) -> Result<(), String> {
    posicionar(&window, largura, altura, &canto)
}

fn recarregar(app: &tauri::AppHandle) {
    if let Some(j) = app.get_webview_window("notch") {
        let _ = j.eval("location.reload()");
    }
}

fn main() {
    tauri::Builder::default()
        // Segunda execução (atalho clicado de novo) não abre outro notch.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| recarregar(app)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, None))
        .plugin(tauri_plugin_opener::init())
        .manage(Http(
            reqwest::Client::builder()
                .timeout(Duration::from_secs(15))
                .user_agent(concat!("atividades-opec-notch/", env!("CARGO_PKG_VERSION")))
                .build()
                .expect("cliente http"),
        ))
        .invoke_handler(tauri::generate_handler![estado, parear, iniciar, pausar, abrir, tamanho])
        .setup(|app| {
            let url = format!("{}/notch-app", site()).parse().expect("url do notch");
            let janela = WebviewWindowBuilder::new(app, "notch", WebviewUrl::External(url))
                .title("Atividades OPEC")
                .inner_size(98.0, 53.0)
                .transparent(true)
                .decorations(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .resizable(false)
                .shadow(false)
                .focused(false)
                .build()?;
            let _ = posicionar(&janela, 98.0, 53.0, "baixo-dir");
            #[cfg(debug_assertions)]
            janela.open_devtools();

            let semana = MenuItem::with_id(app, "semana", "Abrir Minha semana", true, None::<&str>)?;
            let conectar = MenuItem::with_id(app, "conectar", "Conectar o notch no site", true, None::<&str>)?;
            let liga = app.autolaunch().is_enabled().unwrap_or(false);
            let autostart = CheckMenuItem::with_id(app, "autostart", "Iniciar com o Windows", true, liga, None::<&str>)?;
            let recarga = MenuItem::with_id(app, "recarregar", "Recarregar", true, None::<&str>)?;
            let desparear = MenuItem::with_id(app, "desparear", "Desconectar este computador", true, None::<&str>)?;
            let sair = MenuItem::with_id(app, "sair", "Sair", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[
                &semana, &conectar,
                &PredefinedMenuItem::separator(app)?,
                &autostart, &recarga, &desparear,
                &PredefinedMenuItem::separator(app)?,
                &sair,
            ])?;
            let item_autostart = autostart.clone();
            TrayIconBuilder::with_id("bandeja")
                .icon(app.default_window_icon().cloned().expect("ícone"))
                .tooltip("Atividades OPEC · Sr. Minutos")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(move |app, ev| match ev.id().as_ref() {
                    "semana" => { let _ = app.opener().open_url(format!("{}/semana", site()), None::<&str>); }
                    "conectar" => { let _ = app.opener().open_url(format!("{}/notch", site()), None::<&str>); }
                    "autostart" => {
                        let al = app.autolaunch();
                        let ligado = al.is_enabled().unwrap_or(false);
                        let _ = if ligado { al.disable() } else { al.enable() };
                        let _ = item_autostart.set_checked(!ligado);
                    }
                    "recarregar" => recarregar(app),
                    "desparear" => { apagar_token(); recarregar(app); }
                    "sair" => app.exit(0),
                    _ => {}
                })
                .build(app)?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("erro ao abrir o notch");
}
