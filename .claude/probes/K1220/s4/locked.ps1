# K1220 S4 (a copy of K1218 S7's locked_s7.ps1: owner K1220-S4): run one node
# probe from this folder under the machine perf lock.
#   & .claude/probes/K1220/s3/locked.ps1 -What "census" -NodeArgs @("census.mjs","out/census.json","http://127.0.0.1:5980,http://127.0.0.1:5981")
# Waits inside this one command while another owner holds the lock (a lock older
# than 30 min is stale), runs node from this folder, and releases the lock only
# if it still holds our line.
param(
  [Parameter(Mandatory = $true)][string]$What,
  [Parameter(Mandatory = $true)][string[]]$NodeArgs,
  [int]$MaxWaitMin = 40
)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$lock = Join-Path $env:TEMP "claude-perf.lock"
$deadline = (Get-Date).AddMinutes($MaxWaitMin)
$mine = $null
while ((Get-Date) -lt $deadline) {
  $free = -not (Test-Path $lock)
  if (-not $free) {
    $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
    if ($age -gt 30) { "stale lock ($([int]$age) min): $((Get-Content $lock -Raw).Trim())"; $free = $true }
  }
  if ($free) {
    $line = "K1220-S4 | $(Get-Date -Format s) | $What"
    [System.IO.File]::WriteAllText($lock, $line)
    Start-Sleep -Milliseconds 300
    if ((Get-Content $lock -Raw).Trim() -eq $line) { $mine = $line; break }
  }
  Start-Sleep -Seconds 5
}
if (-not $mine) { "never got the lock"; exit 2 }
"lock ours: $mine"
$code = 0
try {
  Push-Location $here
  try { & node @NodeArgs; $code = $LASTEXITCODE } finally { Pop-Location }
} finally {
  if ((Test-Path $lock) -and ((Get-Content $lock -Raw).Trim() -eq $mine)) { [System.IO.File]::Delete($lock); "lock released" }
}
exit $code
