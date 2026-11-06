# K1211 S1: wait (one blocking command) until the perf lock is ours, shoot
# every stand on the branch build and on master's, then release the lock
# only if it still holds our exact line.
#   & .claude/probes/K1211/run_shots.ps1 [-BranchHost http://127.0.0.1:5962] [-MasterHost http://127.0.0.1:5961] [-MaxWaitMin 45]
param(
  [string]$BranchHost = "http://127.0.0.1:5962",
  [string]$MasterHost = "http://127.0.0.1:5961",
  [string]$BranchTag = "b607",
  [string]$MasterTag = "eb476",
  [int]$MaxWaitMin = 45
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$lock = Join-Path $env:TEMP "claude-perf.lock"
$deadline = (Get-Date).AddMinutes($MaxWaitMin)
$mine = $null
while ((Get-Date) -lt $deadline) {
  if (Test-Path $lock) {
    $txt = (Get-Content $lock -Raw).Trim()
    if ($txt.StartsWith("K1211-S1 |")) { $mine = $txt; break }
  }
  Start-Sleep -Seconds 5
}
if (-not $mine) { "never got the lock"; exit 2 }
"lock ours: $mine at $(Get-Date -Format HH:mm:ss)"
Push-Location $here
try {
  foreach ($run in @(@{ h = $BranchHost; t = $BranchTag }, @{ h = $MasterHost; t = $MasterTag })) {
    foreach ($stand in @("cross", "x4", "loop")) {
      $env:K1211_HOST = $run.h
      $out = Join-Path $here "out/$($run.t)/$stand"
      "--- $stand @ $($run.h) -> $out ($(Get-Date -Format HH:mm:ss))"
      & node (Join-Path $here "shoot.mjs") $stand $out 2>&1 | ForEach-Object { "$_" }
      "exit $LASTEXITCODE"
    }
  }
} finally {
  Pop-Location
  if ((Test-Path $lock) -and ((Get-Content $lock -Raw).Trim() -eq $mine)) {
    [System.IO.File]::Delete($lock)
    "lock released at $(Get-Date -Format HH:mm:ss)"
  } else { "lock not ours any more; left alone" }
}
