param(
    [switch]$Atualizar,
    [switch]$NaoAbrirNavegador
)

$ErrorActionPreference = 'Stop'
$ProjectDir = 'C:\PCPowerLab'
$FrontendDir = Join-Path $ProjectDir 'frontend'
$ApiPrefix = '/api/v1'
$Port = 3000
$LocalUrl = "http://127.0.0.1:$Port"
$RuntimeDir = Join-Path $env:TEMP 'PCPowerLab'
$BackendLog = Join-Path $RuntimeDir 'backend.log'
$BackendErrorLog = Join-Path $RuntimeDir 'backend-error.log'
$TunnelLog = Join-Path $RuntimeDir 'tunnel.log'
$TunnelErrorLog = Join-Path $RuntimeDir 'tunnel-error.log'
$BackendProcess = $null
$TunnelProcess = $null
$PublicUrl = $null
$PowerStateActive = $false
$OriginalLocation = Get-Location
$OriginalNodeEnv = $env:NODE_ENV
$OriginalPort = $env:PORT
$OriginalApiPrefix = $env:API_PREFIX
$ExitCode = 0

function Assert-File($Path, $Description) {
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        throw "[ERRO] $Description nao encontrado: $Path"
    }
}

function Assert-Command($Name) {
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "[ERRO] $Name nao encontrado. Execute primeiro o script de instalacao."
    }
}

function Test-Running($Process) {
    if ($null -eq $Process) { return $false }
    try {
        $Process.Refresh()
        return -not $Process.HasExited
    }
    catch { return $false }
}

function Stop-OwnedProcess($Process) {
    if (Test-Running $Process) {
        Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        try { $Process.WaitForExit(5000) | Out-Null } catch {}
    }
}

function Show-LogTail($Path) {
    if (Test-Path -LiteralPath $Path) {
        Write-Host "--- $Path ---"
        Get-Content -LiteralPath $Path -Tail 15 -ErrorAction SilentlyContinue
    }
}

function Get-LocalResponse($Path) {
    try {
        return Invoke-WebRequest -Uri "$LocalUrl$Path" -UseBasicParsing -TimeoutSec 3
    }
    catch { return $null }
}

function Test-Health {
    $response = Get-LocalResponse "$ApiPrefix/health"
    if ($null -eq $response -or $response.StatusCode -ne 200) { return $false }
    try { return ((ConvertFrom-Json $response.Content).data.status -eq 'online') }
    catch { return $false }
}

function Test-Frontend($Path) {
    $response = Get-LocalResponse $Path
    return ($null -ne $response -and $response.StatusCode -eq 200 -and
        $response.Content -match '<div id="root"></div>' -and
        $response.Content -match '<title>PCPowerLab</title>')
}

function Get-Uptime($StartTime) {
    $elapsed = (Get-Date) - $StartTime
    return '{0:00}:{1:00}:{2:00}' -f [math]::Floor($elapsed.TotalHours), $elapsed.Minutes, $elapsed.Seconds
}

try {
    if (-not (Test-Path -LiteralPath $ProjectDir -PathType Container)) {
        throw "[ERRO] PCPowerLab nao encontrado em $ProjectDir. Execute primeiro o script de instalacao."
    }
    Assert-File (Join-Path $ProjectDir 'package.json') 'package.json'
    Assert-File (Join-Path $FrontendDir 'package.json') 'frontend/package.json'
    $EnvFile = Join-Path $ProjectDir '.env'
    Assert-File $EnvFile '.env'

    foreach ($command in @('node', 'npm.cmd', 'git', 'cloudflared')) {
        Assert-Command $command
    }

    if ($Atualizar) {
        Write-Host 'Atualizando repositorio com git pull --ff-only...'
        & git -C $ProjectDir pull --ff-only
        if ($LASTEXITCODE -ne 0) { throw '[ERRO] git pull --ff-only falhou.' }
    }

    $adminLine = Get-Content -LiteralPath $EnvFile | Where-Object { $_ -match '^\s*ADMIN_PASSWORD\s*=' } | Select-Object -Last 1
    $adminValue = if ($adminLine) { ($adminLine -split '=', 2)[1].Trim() } else { '' }
    $adminValue = ($adminValue -replace '\s+#.*$', '').Trim()
    if ($adminValue.Length -ge 2 -and
        (($adminValue.StartsWith('"') -and $adminValue.EndsWith('"')) -or
         ($adminValue.StartsWith("'") -and $adminValue.EndsWith("'")))) {
        $adminValue = $adminValue.Substring(1, $adminValue.Length - 2)
    }
    if ([string]::IsNullOrWhiteSpace($adminValue) -or $adminValue.StartsWith('#')) {
        throw '[ERRO] ADMIN_PASSWORD nao configurada no .env.'
    }
    Remove-Variable adminLine, adminValue -ErrorAction SilentlyContinue

    if ($Atualizar -or -not (Test-Path (Join-Path $ProjectDir 'node_modules') -PathType Container)) {
        Write-Host 'Instalando dependencias do backend...'
        Set-Location $ProjectDir
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw '[ERRO] npm ci do backend falhou.' }
    }
    if ($Atualizar -or -not (Test-Path (Join-Path $FrontendDir 'node_modules') -PathType Container)) {
        Write-Host 'Instalando dependencias do frontend...'
        Set-Location $FrontendDir
        & npm.cmd ci
        if ($LASTEXITCODE -ne 0) { throw '[ERRO] npm ci do frontend falhou.' }
    }

    Write-Host 'Compilando frontend para a mesma origem...'
    Set-Location $FrontendDir
    $OldViteApi = $env:VITE_API_BASE_URL
    $env:VITE_API_BASE_URL = $ApiPrefix
    try {
        & npm.cmd run build
        if ($LASTEXITCODE -ne 0) { throw '[ERRO] Build do frontend falhou.' }
    }
    finally {
        if ($null -eq $OldViteApi) { Remove-Item Env:\VITE_API_BASE_URL -ErrorAction SilentlyContinue }
        else { $env:VITE_API_BASE_URL = $OldViteApi }
    }
    Assert-File (Join-Path $FrontendDir 'dist/index.html') 'frontend/dist/index.html'

    New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null
    $env:NODE_ENV = 'production'
    $env:PORT = "$Port"
    $env:API_PREFIX = $ApiPrefix

    if (-not ('PCPowerLab.PowerState' -as [type])) {
        Add-Type @'
using System;
using System.Runtime.InteropServices;
namespace PCPowerLab {
    public static class PowerState {
        [DllImport("kernel32.dll")]
        public static extern uint SetThreadExecutionState(uint flags);
    }
}
'@
    }
    if ([PCPowerLab.PowerState]::SetThreadExecutionState(0x80000001) -eq 0) {
        throw '[ERRO] Nao foi possivel impedir a suspensao do Windows.'
    }
    $PowerStateActive = $true

    Write-Host 'Iniciando Node / Express em 127.0.0.1:3000...'
    $BackendProcess = Start-Process -FilePath (Get-Command node).Source `
        -ArgumentList 'src/server.js' -WorkingDirectory $ProjectDir `
        -RedirectStandardOutput $BackendLog -RedirectStandardError $BackendErrorLog `
        -WindowStyle Hidden -PassThru

    $deadline = (Get-Date).AddSeconds(30)
    $healthy = $false
    Start-Sleep -Milliseconds 300
    while ((Get-Date) -lt $deadline) {
        if (-not (Test-Running $BackendProcess)) { break }
        if (Test-Health) { $healthy = $true; break }
        Start-Sleep -Milliseconds 500
    }
    if (-not $healthy -or -not (Test-Running $BackendProcess)) {
        Show-LogTail $BackendLog
        Show-LogTail $BackendErrorLog
        throw '[ERRO] Backend nao respondeu em /api/v1/health.'
    }
    if (-not (Test-Frontend '/') -or -not (Test-Frontend '/admin')) {
        Show-LogTail $BackendErrorLog
        throw '[ERRO] Frontend compilado nao foi servido em / ou /admin.'
    }

    Write-Host 'Iniciando Cloudflare Quick Tunnel...'
    $TunnelProcess = Start-Process -FilePath (Get-Command cloudflared).Source `
        -ArgumentList @('tunnel', '--url', $LocalUrl) `
        -RedirectStandardOutput $TunnelLog -RedirectStandardError $TunnelErrorLog `
        -WindowStyle Hidden -PassThru

    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline) {
        if (-not (Test-Running $TunnelProcess)) { break }
        $logText = @(
            (Get-Content -LiteralPath $TunnelLog -Raw -ErrorAction SilentlyContinue),
            (Get-Content -LiteralPath $TunnelErrorLog -Raw -ErrorAction SilentlyContinue)
        ) -join "`n"
        $match = [regex]::Match($logText, 'https://[a-zA-Z0-9-]+\.trycloudflare\.com')
        if ($match.Success) { $PublicUrl = $match.Value; break }
        Start-Sleep -Seconds 1
    }
    if (-not $PublicUrl) {
        Show-LogTail $TunnelLog
        Show-LogTail $TunnelErrorLog
        throw '[ERRO] URL do Cloudflare Quick Tunnel nao encontrada em 60 segundos.'
    }

    if (-not $NaoAbrirNavegador) { Start-Process $PublicUrl }
    $StartTime = Get-Date

    while ($true) {
        $backendOnline = (Test-Running $BackendProcess) -and (Test-Health)
        $tunnelOnline = Test-Running $TunnelProcess
        [PCPowerLab.PowerState]::SetThreadExecutionState(0x80000001) | Out-Null
        Clear-Host
        Write-Host '============================================================'
        Write-Host '                    PCPowerLab'
        Write-Host '                  SERVIDOR ONLINE'
        Write-Host '============================================================'
        Write-Host ' NAO DESLIGUE ESTE COMPUTADOR'
        Write-Host ' NAO FECHE ESTA JANELA ENQUANTO O SITE ESTIVER EM USO'
        Write-Host ''
        Write-Host ('[ {0} ] Backend' -f $(if ($backendOnline) { 'ONLINE' } else { 'ERRO' }))
        Write-Host ('[ {0} ] Cloudflare Tunnel' -f $(if ($tunnelOnline) { 'ONLINE' } else { 'ERRO' }))
        if (-not $backendOnline -or -not $tunnelOnline) {
            Write-Host '[ ERRO ] O site pode estar indisponivel. Consulte os logs em:' -ForegroundColor Red
            Write-Host "         $RuntimeDir"
        }
        Write-Host ''
        Write-Host 'ACESSO PUBLICO'
        Write-Host $PublicUrl
        Write-Host "Admin: $PublicUrl/admin"
        Write-Host ''
        Write-Host "Backend PID    : $($BackendProcess.Id)"
        Write-Host "Cloudflare PID : $($TunnelProcess.Id)"
        Write-Host "Porta local    : $Port"
        Write-Host "Uptime         : $(Get-Uptime $StartTime)"
        Write-Host '============================================================'
        Write-Host 'Para desligar o servidor, pressione Ctrl+C.'
        Start-Sleep -Seconds 5
    }
}
catch {
    $ExitCode = 1
    Write-Host $_.Exception.Message -ForegroundColor Red
}
finally {
    Stop-OwnedProcess $TunnelProcess
    Stop-OwnedProcess $BackendProcess
    if ($PowerStateActive) {
        [PCPowerLab.PowerState]::SetThreadExecutionState(0x80000000) | Out-Null
    }
    if ($null -eq $OriginalNodeEnv) { Remove-Item Env:\NODE_ENV -ErrorAction SilentlyContinue }
    else { $env:NODE_ENV = $OriginalNodeEnv }
    if ($null -eq $OriginalPort) { Remove-Item Env:\PORT -ErrorAction SilentlyContinue }
    else { $env:PORT = $OriginalPort }
    if ($null -eq $OriginalApiPrefix) { Remove-Item Env:\API_PREFIX -ErrorAction SilentlyContinue }
    else { $env:API_PREFIX = $OriginalApiPrefix }
    Set-Location $OriginalLocation
    Write-Host 'PCPowerLab encerrado.'
    Write-Host 'Cloudflare Tunnel encerrado.'
    Write-Host 'O site nao esta mais disponivel publicamente.'
}
if ($ExitCode -ne 0) { exit $ExitCode }
