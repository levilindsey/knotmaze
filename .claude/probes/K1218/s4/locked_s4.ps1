# K1218 S4 (a copy of S3's locked_s3.ps1): run one node probe under the perf lock (owner K1218-S4), one browser.
#   & .claude/probes/K1218/s4/locked_s4.ps1 -What "slots loop" -Host5 http://127.0.0.1:5980 -NodeArgs @("live_s3.mjs","loop","out/slots12","slots_s3.mjs","1727,634")
# Waits inside this one command while another owner holds the lock (a lock older
# than 30 min is stale), runs node from this folder, and releases the lock only
# if it still holds our line.
param(
  [Parameter(Mandatory = $true)][string]$What,
  [Parameter(Mandatory = $true)][string[]]$NodeArgs,
  [string]$Host5 = "http://127.0.0.1:5980",
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
    $line = "K1218-S4 | $(Get-Date -Format s) | $What"
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
  $env:K1211_HOST = $Host5
  Push-Location $here
  try { & node @NodeArgs; $code = $LASTEXITCODE } finally { Pop-Location }
} finally {
  if ((Test-Path $lock) -and ((Get-Content $lock -Raw).Trim() -eq $mine)) { [System.IO.File]::Delete($lock); "lock released" }
}
exit $code
