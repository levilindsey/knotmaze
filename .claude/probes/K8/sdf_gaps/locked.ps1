# locked.ps1: run one node probe under the perf lock (K8 sdf gaps).
#   & .\.claude\probes\K8\sdf_gaps\locked.ps1 -What "..." -NodeArgs "script.mjs","a","b"
# Waits (one blocking loop) while another owner holds $env:TEMP\claude-perf.lock
# (stale after 30 min), takes it, runs node, deletes the lock. Keep a hold
# under 10 minutes.
param([string]$What = "K8 sdf gaps probe", [string[]]$NodeArgs)
$ErrorActionPreference = "Stop"
$lockPath = Join-Path $env:TEMP "claude-perf.lock"
while (Test-Path $lockPath) {
  $age = (Get-Date) - (Get-Item $lockPath).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lockPath)"; break }
  Start-Sleep -Seconds 10
}
"K8 agent (claude session 09c7a672), $(Get-Date -Format o), $What" | Set-Content -Encoding ascii $lockPath
$t0 = Get-Date
try {
  & node @NodeArgs
} finally {
  if (Test-Path $lockPath) { [System.IO.File]::Delete($lockPath) }
  Write-Host "held $([int]((Get-Date) - $t0).TotalSeconds) s"
}
