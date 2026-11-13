# K1346 s2: the app ABBA under the perf lock (k1247s30_run.ps1's load/def/fat steps, this agent's owner line and
# out dir). def/fat: k1240s4b_bench.mjs over the ports A B C C B A, summarised by k1247s30_abba.mjs (the worker's
# parts, p50 over the drag, each port's mean and its run-to-run spread). The bench and summariser are read from
# the main checkout (untracked there). Waits for another owner's lock inside this call (stale after 30 min).
#   pwsh .claude/probes/K1346/k1346s2_run.ps1 -Out <dir> [-Steps load,def,fat] [-Ports 5971,5972,5972]
param([string]$Out = ".claude/probes/K1346/out/s2/app", [string]$Steps = "load,def,fat",
  [string]$Ports = "5971,5972,5972", [int]$WaitMin = 75)
$ErrorActionPreference = "Continue"
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1346 s2 agent (worktree agent-a71bd8850e0bc2f5e)"
$deadline = (Get-Date).AddMinutes($WaitMin)
while ($true) {
  while (Test-Path $lock) {
    $age = (Get-Date) - (Get-Item $lock).LastWriteTime
    if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
    if ((Get-Date) -gt $deadline) { Write-Host "lock still held after $WaitMin min: $(Get-Content $lock -Raw)"; exit 2 }
    Start-Sleep -Seconds 5
  }
  "$owner, $(Get-Date -Format s), k1346s2_run $Steps, ports $Ports" | Out-File -Encoding ASCII $lock
  Start-Sleep -Milliseconds 500
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { break }
}
Write-Host "lock taken $(Get-Date -Format s)"
New-Item -ItemType Directory $Out -Force | Out-Null
$S = $Steps.Split(","); $P = $Ports.Split(",")
$main = "C:\Users\lsl\Repositories\knotmaze\.claude\probes"
$bench = "$main\K1240\s4\k1240s4b_bench.mjs"; $abba = "$main\K1247\k1247s30_abba.mjs"
$q = @{ def = "?b&am=instant&snd=none&fw=0&rp=outline"; fat = "?p9ar6.FHFUnxp1_T-IDyQ9&am=instant&snd=none&fw=0&rp=outline" }
function Load([string]$tag) {
  $tot = (Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 3).CounterSamples.CookedValue
  $pr = (Get-Counter '\Process(*)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples |
    Where-Object { $_.InstanceName -notin @('_total', 'idle') -and $_.CookedValue -gt 5 } |
    Sort-Object CookedValue -Descending | Select-Object -First 6 | ForEach-Object { "$($_.InstanceName) $([int]$_.CookedValue)" }
  "load $tag $(Get-Date -Format s): total % $([int](($tot | Measure-Object -Average).Average)); top (% of one core): $($pr -join ', ')" | Tee-Object -FilePath "$Out\load.txt" -Append
}
try {
  if ($S -contains "load") { Load "before" }
  foreach ($k in "def", "fat") {
    if ($S -notcontains $k) { continue }
    $urls = @($P[0], $P[1], $P[2], $P[2], $P[1], $P[0]) | ForEach-Object { "http://localhost:$_/$($q[$k])" }
    node $bench "$Out\abba_$k.json" @urls 2>&1 | Select-Object -Last 3
    node $abba "$Out\abba_$k.json" 2>&1 | Tee-Object -FilePath "$Out\abba_$k.txt"
  }
  if ($S -contains "load") { Load "after" }
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock); Write-Host "lock released $(Get-Date -Format s)" }
}
