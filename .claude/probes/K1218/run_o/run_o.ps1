# K1218 Run O: take the perf lock (owner K1218-O; one blocking wait while
# another owner holds it; a lock older than 30 min is stale), run the given
# node jobs, then release the lock only if it still holds our exact line.
#   & .claude/probes/K1218/run_o/run_o.ps1 -What "shots" -Jobs "shoot_o.mjs loop out/loop", ...
# Each job is "<script> <args...>" run with node from this folder.
param(
  [Parameter(Mandatory = $true)][string]$What,
  [Parameter(Mandatory = $true)][string[]]$Jobs,
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
    $line = "K1218-O | $(Get-Date -Format s) | $What"
    [System.IO.File]::WriteAllText($lock, $line)
    Start-Sleep -Milliseconds 300
    if ((Get-Content $lock -Raw).Trim() -eq $line) { $mine = $line; break }
  }
  Start-Sleep -Seconds 5
}
if (-not $mine) { "never got the lock"; exit 2 }
"lock ours: $mine"
Push-Location $here
try {
  foreach ($job in $Jobs) {
    $parts = $job.Split(" ")
    $script = $parts[0]
    $rest = $parts[1..($parts.Count - 1)]
    "--- node $script $rest ($(Get-Date -Format HH:mm:ss))"
    & node (Join-Path $here $script) @rest 2>&1 | ForEach-Object { "$_" }
    "exit $LASTEXITCODE"
  }
} finally {
  Pop-Location
  if ((Test-Path $lock) -and ((Get-Content $lock -Raw).Trim() -eq $mine)) {
    [System.IO.File]::Delete($lock)
    "lock released at $(Get-Date -Format HH:mm:ss)"
  } else { "lock not ours any more; left alone" }
}
