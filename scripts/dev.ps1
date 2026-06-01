<#
.SYNOPSIS
  Orchestrate the RoundReady demo stack - backend + frontend.

.DESCRIPTION
  One script to start, stop, restart, reseed, and inspect the local
  dev/demo stack. Replaces the fragile "kill some Python processes by
  hand and hope" workflow that left zombie uvicorn workers across
  sessions.

  Why this exists:
    - uvicorn --reload spawns a parent reloader and a child worker.
      Killing only one leaves the other running. This script walks the
      parent chain so taskkill /F /T removes both.
    - WMI's Win32_Process can return null CommandLine for processes
      started by another user/session, so filters that key on
      CommandLine silently drop zombies. This script keys on the
      listening PID instead, which is always accurate.
    - DEMO_MODE=true must be set in the same shell that launches
      uvicorn for the admin/seed-reset endpoint to mount.
    - PS 5.1 needs ASCII-only string literals when the script is saved
      as UTF-8 without BOM (em-dashes etc. get mojibake'd otherwise).

.PARAMETER Action
  start    Launch backend + frontend in minimized windows; wait until ready.
  stop     Kill anything listening on 3000/8000 and its parent process.
  restart  stop, then start.
  reseed   POST /api/v1/admin/seed-reset to refresh today-anchored demo data.
  status   Show what's running on 3000/8000.

.EXAMPLE
  .\scripts\dev.ps1 start
  .\scripts\dev.ps1 reseed
  .\scripts\dev.ps1 stop
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory=$true, Position=0)]
    [ValidateSet('start','stop','restart','reseed','status')]
    [string]$Action
)

$ErrorActionPreference = 'Stop'

$repoRoot     = Resolve-Path "$PSScriptRoot\.."
$backendDir   = Join-Path $repoRoot 'backend'
$frontendDir  = Join-Path $repoRoot 'frontend'
$BackendPort  = 8000
$FrontendPort = 3000
$BackendUrl   = "http://127.0.0.1:$BackendPort"
$FrontendUrl  = "http://127.0.0.1:$FrontendPort"

function Get-PortPids($port) {
    Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty OwningProcess -Unique
}

function Stop-Stack {
    Write-Host "[stop] scanning ports $BackendPort and $FrontendPort..."
    $seen = @{}
    foreach ($port in @($BackendPort, $FrontendPort)) {
        foreach ($procId in (Get-PortPids $port)) { $seen[$procId] = $true }
    }
    # Walk parent chain - uvicorn --reload has a parent reloader and
    # a child worker; only the worker holds the port, so we'd miss
    # the reloader without this. Only walk up through py/python/node
    # to avoid killing the user's shell or explorer.exe.
    $changed = $true
    while ($changed) {
        $changed = $false
        foreach ($procId in @($seen.Keys)) {
            $parent = (Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue).ParentProcessId
            if ($parent -and -not $seen.ContainsKey($parent)) {
                $pname = (Get-Process -Id $parent -ErrorAction SilentlyContinue).ProcessName
                if ($pname -in @('py','python','pythonw','node')) {
                    $seen[$parent] = $true
                    $changed = $true
                }
            }
        }
    }
    if ($seen.Count -eq 0) {
        Write-Host "[stop] nothing listening on those ports."
        return
    }
    foreach ($procId in $seen.Keys) {
        $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
        if (-not $proc) { continue }   # already gone (often a child of a parent we just killed)
        Write-Host "[stop] taskkill /F /T /PID $procId  ($($proc.ProcessName))"
        # Redirect both streams to $null so taskkill's "process not found" output
        # from a child that already exited (because we just killed its parent)
        # doesn't surface as a NativeCommandError in the caller's shell.
        cmd.exe /c "taskkill /F /T /PID $procId >nul 2>&1" | Out-Null
    }
    # Don't propagate taskkill's exit-128 ("process not found") to the caller -
    # for our purposes, the process being gone is success.
    $global:LASTEXITCODE = 0
    Start-Sleep -Milliseconds 900
}

function Show-Status {
    foreach ($port in @($BackendPort, $FrontendPort)) {
        $label = if ($port -eq $BackendPort) { 'backend ' } else { 'frontend' }
        $pids  = Get-PortPids $port
        if (-not $pids) {
            Write-Host "  $label :$port  not running"
            continue
        }
        foreach ($procId in $pids) {
            $p = Get-Process -Id $procId -ErrorAction SilentlyContinue
            $started = if ($p.StartTime) { $p.StartTime.ToString('yyyy-MM-dd HH:mm:ss') } else { '(unknown)' }
            Write-Host "  $label :$port  PID $procId  ($($p.ProcessName))  started $started"
        }
    }
}

function Wait-Ready($url, $deadline, $name) {
    while ((Get-Date) -lt $deadline) {
        try {
            $null = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2 -MaximumRedirection 0 -ErrorAction Stop
            return $true
        } catch {
            # Redirects (307 -> /dashboard) throw in -MaximumRedirection 0 mode
            # but mean the server is responding. Treat any HTTP response as ready.
            if ($_.Exception.Response -and $_.Exception.Response.StatusCode) { return $true }
        }
        Start-Sleep -Milliseconds 500
    }
    return $false
}

function Start-Stack {
    Stop-Stack

    Write-Host "[start] launching backend on :$BackendPort (DEMO_MODE=true)..."
    $beCmd = "Set-Location '$backendDir'; `$env:DEMO_MODE='true'; py -m uvicorn app.main:app --port $BackendPort"
    Start-Process powershell -ArgumentList '-NoExit','-Command',$beCmd -WindowStyle Minimized

    Write-Host "[start] launching frontend on :$FrontendPort..."
    $feCmd = "Set-Location '$frontendDir'; npm run dev"
    Start-Process powershell -ArgumentList '-NoExit','-Command',$feCmd -WindowStyle Minimized

    $deadline = (Get-Date).AddSeconds(60)
    Write-Host "[start] waiting for backend..."
    if (Wait-Ready "$BackendUrl/api/v1/health" $deadline 'backend') {
        Write-Host "[start]   backend  READY  $BackendUrl"
    } else {
        Write-Host "[start]   backend  TIMEOUT - check the minimized PowerShell window for traceback"
    }
    Write-Host "[start] waiting for frontend..."
    if (Wait-Ready $FrontendUrl $deadline 'frontend') {
        Write-Host "[start]   frontend READY  $FrontendUrl"
    } else {
        Write-Host "[start]   frontend TIMEOUT - check the minimized PowerShell window"
    }
}

function Invoke-Reseed {
    Write-Host "[reseed] POST $BackendUrl/api/v1/admin/seed-reset (DEMO_MODE-gated, ~5s)..."
    try {
        $r = Invoke-RestMethod -Uri "$BackendUrl/api/v1/admin/seed-reset" -Method Post -TimeoutSec 120
        $s = $r.summary
        Write-Host "[reseed] ok - angels=$($s.angels) residents=$($s.residents) rounds=$($s.rounds) issues=$($s.issues_total)"
    } catch {
        $msg = $_.Exception.Message
        Write-Host "[reseed] FAILED: $msg"
        if ($msg -like '*Not Found*' -or $msg -like '*404*') {
            Write-Host "[reseed]   (DEMO_MODE may be off - restart with .\scripts\dev.ps1 restart)"
        }
        if ($msg -like '*getaddrinfo*' -or $msg -like '*tenant*not found*' -or $msg -like '*INACTIVE*') {
            Write-Host "[reseed]   (Supabase project may be paused - visit https://app.supabase.com)"
        }
    }
}

switch ($Action) {
    'start'   { Start-Stack;  Write-Host ""; Show-Status }
    'stop'    { Stop-Stack;   Write-Host ""; Show-Status }
    'restart' { Stop-Stack;   Start-Stack;   Write-Host ""; Show-Status }
    'reseed'  { Invoke-Reseed }
    'status'  { Show-Status }
}
