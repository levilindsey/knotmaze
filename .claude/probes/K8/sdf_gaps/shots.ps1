# shots.ps1: one batch of headed-Chrome shots under the perf lock (K8).
#   pwsh .claude/probes/K8/sdf_gaps/shots.ps1 -Jobs "url|out.png","url2|out2.png" [-Settle 20000]
# Waits (one blocking loop) while another owner holds $env:TEMP\claude-perf.lock
# (stale after 30 min), takes it, runs scripts/diag_screenshot.mjs per job,
# deletes the lock. Keep a batch under 10 minutes (about 18 shots at 20 s).
param([string[]]$Jobs, [int]$Settle = 20000, [string]$What = "K8 sdf gaps shots")
$ErrorActionPreference = "Stop"
$lockPath = Join-Path $env:TEMP "claude-perf.lock"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "../../../..")).Path
while (Test-Path $lockPath) {
  $age = (Get-Date) - (Get-Item $lockPath).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lockPath)"; break }
  Start-Sleep -Seconds 10
}
"K8 agent (claude session 09c7a672), $(Get-Date -Format o), $What" | Set-Content -Encoding ascii $lockPath
try {
  foreach ($j in $Jobs) {
    $u, $o = $j -split '\|', 2
    New-Item -ItemType Directory (Split-Path $o -Parent) -Force | Out-Null
    $log = node (Join-Path $repo "scripts/diag_screenshot.mjs") $u $o $Settle 2>&1 | Out-String
    $stamp = ($log -split "`n" | Where-Object { $_ -match 'stamp|error|Error' } | Select-Object -First 3) -join " / "
    Write-Host "$o :: $($stamp.Trim())"
    $log | Set-Content -Encoding utf8 ($o -replace '\.png$', '.log.txt')
  }
} finally {
  if (Test-Path $lockPath) { [System.IO.File]::Delete($lockPath) }
}
