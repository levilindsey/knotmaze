# K1247 s32: a copy of k1247s31_run.ps1 (s32 owner and outputs), two builds: master and the branch with its flags
# at their defaults, A B B A. One batch under the perf lock. Steps (comma list, in this order):
#   load    - the machine's CPU load and its top processes (before and after the batch: other agents' load)
#   def/fat - k1240s4b_bench.mjs over the ports A B B A (master, branch), summarised by k1247s30_abba.mjs (drag, rest)
# Waits for another owner's lock inside this one call (a lock older than 30 min is stale), takes it with this
# agent's owner line, and deletes it only if it is still this owner's.
#   pwsh .claude/probes/K1247/k1247s32_run.ps1 [-Out <dir>] [-Steps load,def,fat] [-Ports 5751,5752]
param([string]$Out = ".claude/probes/K1247/out/s32/run", [string]$Steps = "load,def,fat",
  [string]$Ports = "5751,5752", [int]$WaitMin = 75)
$ErrorActionPreference = "Continue"
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1247 s32 agent (worktree agent-a0b7ae19795e37c2f)"
$deadline = (Get-Date).AddMinutes($WaitMin)
while ($true) {
  while (Test-Path $lock) {
    $age = (Get-Date) - (Get-Item $lock).LastWriteTime
    if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
    if ((Get-Date) -gt $deadline) { Write-Host "lock still held after $WaitMin min: $(Get-Content $lock -Raw)"; exit 2 }
    Start-Sleep -Seconds 5
  }
  "$owner, $(Get-Date -Format s), k1247s32_run $Steps, ports $Ports" | Out-File -Encoding ASCII $lock
  Start-Sleep -Milliseconds 500
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { break }
}
Write-Host "lock taken $(Get-Date -Format s)"
New-Item -ItemType Directory $Out -Force | Out-Null
$P = $Ports.Split(",")
$S = $Steps.Split(",")
$bench = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1240\s4\k1240s4b_bench.mjs"
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
    $urls = @($P[0], $P[1], $P[1], $P[0]) | ForEach-Object { "http://localhost:$_/$($q[$k])" }
    node $bench "$Out\abba_$k.json" @urls 2>&1 | Select-Object -Last 3
    node .claude/probes/K1247/k1247s30_abba.mjs "$Out\abba_$k.json" 2>&1 | Tee-Object -FilePath "$Out\abba_$k.txt"
    node .claude/probes/K1247/k1247s30_abba.mjs "$Out\abba_$k.json" phase=rest 2>&1 | Tee-Object -FilePath "$Out\abba_${k}_rest.txt" | Out-Null
  }
  if ($S -contains "load") { Load "after" }
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock); Write-Host "lock released $(Get-Date -Format s)" }
}
