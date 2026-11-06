# K1211 S4 (a copy of S3's run_shots3.ps1, owner K1211-S4, default shoot4.mjs; S3: a copy of S2's run_shots2.ps1): take the perf lock (one blocking wait while another owner holds
# it; a lock older than 30 min is stale), run the given shoot2.mjs jobs,
# then release the lock only if it still holds our exact line.
#   & .claude/probes/K1211/run_shots4.ps1 -What "confirm" -Jobs "x4@http://127.0.0.1:5961@out4/m/x4", ...
# Each job: <stand>@<host>@<outDir relative to this folder>[@<script>] (script default shoot3.mjs;
# smoke2.mjs jobs take <query> in place of <stand>).
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
    $line = "K1211-S4 | $(Get-Date -Format s) | $What"
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
    $parts = $job.Split("@")
    $env:K1211_HOST = $parts[1]
    $script = if ($parts.Count -gt 3) { $parts[3] } else { "shoot4.mjs" }
    $out = Join-Path $here $parts[2]
    "--- $($parts[0]) @ $($parts[1]) -> $out ($(Get-Date -Format HH:mm:ss))"
    & node (Join-Path $here $script) $parts[0] $out 2>&1 | ForEach-Object { "$_" }
    "exit $LASTEXITCODE"
  }
} finally {
  Pop-Location
  if ((Test-Path $lock) -and ((Get-Content $lock -Raw).Trim() -eq $mine)) {
    [System.IO.File]::Delete($lock)
    "lock released at $(Get-Date -Format HH:mm:ss)"
  } else { "lock not ours any more; left alone" }
}
