<#
  Instala o OPEC Atividades como aplicativo no Windows.
  Nao precisa de administrador: so cria atalhos na sua conta.

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1
    powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1 -Local     # aponta pro localhost:3000
    powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1 -Remover
#>
param(
  [string]$Url = "https://opec-atividades.vercel.app",
  [switch]$Local,
  [switch]$SemInicioAutomatico,
  [switch]$Remover
)

if ($Local) { $Url = "http://localhost:3000" }

$nomeApp  = "OPEC Atividades"
$nomeDock = "OPEC Atividades - Dock"
$desktop  = [Environment]::GetFolderPath("Desktop")
$inicio   = [Environment]::GetFolderPath("Startup")
$alvos    = @(
  (Join-Path $desktop "$nomeApp.lnk"),
  (Join-Path $desktop "$nomeDock.lnk"),
  (Join-Path $inicio  "$nomeDock.lnk")
)

if ($Remover) {
  $alvos | Where-Object { Test-Path $_ } | ForEach-Object { Remove-Item $_ -Force; "removido: $_" }
  "Pronto. Nada mais foi tocado."
  return
}

# Chrome ou Edge, o que existir. O modo --app abre sem barra de endereco nem abas.
$navegador = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe",
  "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $navegador) {
  Write-Error "Nao achei Chrome nem Edge. O app precisa de um dos dois para abrir em modo aplicativo."
  return
}

function Novo-Atalho($caminho, $argumentos, $descricao) {
  $sh = New-Object -ComObject WScript.Shell
  $lnk = $sh.CreateShortcut($caminho)
  $lnk.TargetPath       = $navegador
  $lnk.Arguments        = $argumentos
  $lnk.IconLocation     = "$navegador,0"
  $lnk.Description      = $descricao
  $lnk.WorkingDirectory = Split-Path $navegador
  $lnk.Save()
  "criado: $caminho"
}

Novo-Atalho (Join-Path $desktop "$nomeApp.lnk") `
  "--app=$Url/semana --window-size=1280,860" `
  "Minha semana na OPEC"

Novo-Atalho (Join-Path $desktop "$nomeDock.lnk") `
  "--app=$Url/dock --window-size=384,196 --window-position=1480,780" `
  "Dock de atividades"

if (-not $SemInicioAutomatico) {
  Novo-Atalho (Join-Path $inicio "$nomeDock.lnk") `
    "--app=$Url/dock --window-size=384,196 --window-position=1480,780" `
    "Dock de atividades, abre com o Windows"
}

""
"Instalado apontando para $Url"
"Navegador: $(Split-Path $navegador -Leaf)"
""
"Dois atalhos na area de trabalho: o app inteiro e o dock."
if (-not $SemInicioAutomatico) { "O dock abre junto com o Windows. Use -SemInicioAutomatico se nao quiser." }
""
"Para a janela ficar ACIMA das outras, abra o app e clique em Abrir dock:"
"isso usa o Picture-in-Picture do navegador, que e o unico modo de uma pagina"
"web ficar sempre no topo. O atalho do dock e uma janela normal."
""
"Desinstalar: powershell -ExecutionPolicy Bypass -File scripts\instalar.ps1 -Remover"
