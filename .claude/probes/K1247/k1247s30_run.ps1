# K1247 s30 (K1338): one batch under the perf lock. Steps (comma list, in this order):
#   load    - the machine's CPU load and its top processes (before and after the batch: other agents' load)
#   capture - today's def drag on port A's build (k1247s30_capture.mjs; needs outline_app's capture hook)
#   engine  - k1247s30_engine.mjs (one bundle: Node, Chrome worker, Chrome main) on s18's def frames and today's
#   engcold - the same, cold: warm=0 reps=1, fresh Workers (the app's drag is about frame()'s first ~40 calls)
#   def/fat - k1240s4b_bench.mjs over the ports A B C C B A (master, flags off, flags on), summarised by k1247s30_abba.mjs
#   inc     - k1247s30_inc.ts in Node on s30's def, muse_hash and fat drags (sub 10, T 0.5): identity, hits, phases
# Waits for another owner's lock inside this one call (a lock older than 30 min is stale), takes it with this
# agent's owner line, and deletes it only if it is still this owner's.
#   pwsh .claude/probes/K1247/k1247s30_run.ps1 [-Out <dir>] [-Steps load,capture,engine,def,fat] [-Ports 5741,5742,5743]
param([string]$Out = ".claude/probes/K1247/out/s30/run", [string]$Steps = "load,capture,engine,def,fat",
  [string]$Ports = "5741,5742,5743", [int]$WaitMin = 75)
$ErrorActionPreference = "Continue"
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1338 s30 agent (worktree agent-a644f27c6e57d73f2)"
$deadline = (Get-Date).AddMinutes($WaitMin)
while ($true) {
  while (Test-Path $lock) {
    $age = (Get-Date) - (Get-Item $lock).LastWriteTime
    if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
    if ((Get-Date) -gt $deadline) { Write-Host "lock still held after $WaitMin min: $(Get-Content $lock -Raw)"; exit 2 }
    Start-Sleep -Seconds 5
  }
  "$owner, $(Get-Date -Format s), k1247s30_run $Steps, ports $Ports" | Out-File -Encoding ASCII $lock
  Start-Sleep -Milliseconds 500
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { break }
}
Write-Host "lock taken $(Get-Date -Format s)"
New-Item -ItemType Directory $Out -Force | Out-Null
$P = $Ports.Split(","); $A = $P[0]
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
  if ($S -contains "capture") {
    Remove-Item "$Out\drag_now" -Recurse -Force -ErrorAction SilentlyContinue
    node .claude/probes/K1247/k1247s30_capture.mjs "$Out\drag_now" def "http://localhost:$A/$($q.def)" 2>&1 | Select-Object -Last 4
  }
  if ($S -contains "engine") {
    node .claude/probes/K1247/k1247s30_engine.mjs .claude/probes/K1247/out/s18/drag/def 2 3 2>&1 | Tee-Object -FilePath "$Out\engine_s18def.txt" | Select-Object -Last 12
    if (Test-Path "$Out\drag_now\def") { node .claude/probes/K1247/k1247s30_engine.mjs "$Out/drag_now/def" 2 3 2>&1 | Tee-Object -FilePath "$Out\engine_nowdef.txt" | Select-Object -Last 12 }
  }
  if ($S -contains "engcold") {
    # Cold JIT: no warm-up, one rep, a fresh Worker (and the first Node call) per run - as the app's drag, whose
    # ~40 frames are about the first frame() calls the worker ever makes.
    foreach ($d in ".claude/probes/K1247/out/s18/drag/def", "$Out/drag_now/def") {
      if (Test-Path $d) { node .claude/probes/K1247/k1247s30_engine.mjs $d warm=0 reps=1 order=worker,node,worker 2>&1 | Tee-Object -FilePath "$Out\engcold_$((Split-Path (Split-Path $d -Parent) -Leaf)).txt" | Select-Object -Last 8 }
    }
  }
  foreach ($k in "def", "fat") {
    if ($S -notcontains $k) { continue }
    $urls = @($P[0], $P[1], $P[2], $P[2], $P[1], $P[0]) | ForEach-Object { "http://localhost:$_/$($q[$k])" }
    node $bench "$Out\abba_$k.json" @urls 2>&1 | Select-Object -Last 3
    node .claude/probes/K1247/k1247s30_abba.mjs "$Out\abba_$k.json" 2>&1 | Tee-Object -FilePath "$Out\abba_$k.txt"
  }
  if ($S -contains "inc") {
    foreach ($d in "def", "muse_hash", "fat") {
      node scripts/run_node.mjs .claude/probes/K1247/k1247s30_inc.ts ".claude/probes/K1247/out/s30/drag/$d" sub=10 T=0.5 2>&1 | Tee-Object -FilePath "$Out\inc_$d.txt" | Select-Object -Last 6
    }
  }
  if ($S -contains "load") { Load "after" }
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock); Write-Host "lock released $(Get-Date -Format s)" }
}
