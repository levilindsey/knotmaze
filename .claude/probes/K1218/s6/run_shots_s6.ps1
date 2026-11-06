# K1218 S6 (a copy of S5's run_shots_s5.ps1: owner K1218-S6, default ../s5/shoot_s5.mjs).
# K1218 S5 (a copy of S4's run_shots_s4.ps1: owner K1218-S5, default shoot_s5.mjs).
# K1218 S4 (a copy of S3's run_shots_s3.ps1: owner K1218-S4, default shoot_s4.mjs). K1218 S3 (a copy of S2's run_shots_s2.ps1). K1218 S2 (a copy of K1211 S6's run_shots6.ps1: owner K1218-S2, default shoot_s2.mjs). K1211 S6 (a copy of S4's run_shots4.ps1, owner K1211-S6, default shoot6.mjs, and
# at most TWO jobs at a time - two browsers - under the one lock): take the perf
# lock (one blocking wait while another owner holds it; a lock older than 30 min
# is stale), run the jobs, then release the lock only if it still holds our line.
#   & .claude/probes/K1211/run_shots6.ps1 -What "refs" -Jobs "x4@http://127.0.0.1:5960@out6/r/x4", ...
# Each job: <stand>@<host>@<outDir relative to this folder>[@<script>]. Each job's
# output goes to <outDir>.log as well as to this script's output.
param(
  [Parameter(Mandatory = $true)][string]$What,
  [Parameter(Mandatory = $true)][string[]]$Jobs,
  [int]$MaxWaitMin = 40,
  [int]$Parallel = 2
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
    $line = "K1218-S6 | $(Get-Date -Format s) | $What"
    [System.IO.File]::WriteAllText($lock, $line)
    Start-Sleep -Milliseconds 300
    if ((Get-Content $lock -Raw).Trim() -eq $line) { $mine = $line; break }
  }
  Start-Sleep -Seconds 5
}
if (-not $mine) { "never got the lock"; exit 2 }
"lock ours: $mine"
try {
  $queue = [System.Collections.Generic.Queue[string]]::new([string[]]$Jobs)
  $running = @()
  while ($queue.Count -gt 0 -or $running.Count -gt 0) {
    while ($queue.Count -gt 0 -and $running.Count -lt $Parallel) {
      $job = $queue.Dequeue()
      $parts = $job.Split("@")
      $script = if ($parts.Count -gt 3) { $parts[3] } else { "../s5/shoot_s5.mjs" }
      $out = Join-Path $here $parts[2]
      New-Item -ItemType Directory -Force $out | Out-Null
      "--- $($parts[0]) @ $($parts[1]) -> $out ($(Get-Date -Format HH:mm:ss))"
      $env:K1211_HOST = $parts[1]
      $p = Start-Process -FilePath node -ArgumentList @((Join-Path $here $script), $parts[0], $out) -WorkingDirectory $here `
        -NoNewWindow -PassThru -RedirectStandardOutput "$out.log" -RedirectStandardError "$out.err"
      $running += [pscustomobject]@{ P = $p; Job = $job; Out = $out }
      Start-Sleep -Seconds 2
    }
    Start-Sleep -Seconds 2
    $still = @()
    foreach ($r in $running) {
      if ($r.P.HasExited) {
        "=== $($r.Job) exit $($r.P.ExitCode) ($(Get-Date -Format HH:mm:ss))"
        Get-Content "$($r.Out).log" -ErrorAction SilentlyContinue | ForEach-Object { "  $_" }
        Get-Content "$($r.Out).err" -ErrorAction SilentlyContinue | Select-Object -Last 8 | ForEach-Object { "  ERR $_" }
      } else { $still += $r }
    }
    $running = $still
  }
} finally {
  if ((Test-Path $lock) -and ((Get-Content $lock -Raw).Trim() -eq $mine)) {
    [System.IO.File]::Delete($lock)
    "lock released at $(Get-Date -Format HH:mm:ss)"
  } else { "lock not ours any more; left alone" }
}
