# K1314 s11: Node ABBA of the worker's whole frame (k1314s11_proc.ts: OutlineModel.update's parts, p50 per process)
# under the perf lock. M = master, run from a `git archive` export of $MasterRef (src, scripts, configs) with a
# node_modules junction; B = this worktree. One process per run, order M B B M per pair, on each captured drag.
#   pwsh .claude/probes/K1314/k1314s11_abba.ps1 -Master <export dir> [-Scenes def,fat] [-Pairs 2] [-Rounds 5] [-Log <file>]
# Make the export: git archive <ref> src scripts package.json tsconfig.json vite.config.ts notices | tar -x -C <dir>;
# New-Item -ItemType Junction <dir>\node_modules -Target <main checkout>\node_modules; copy k1314s11_proc.ts to
# <dir>\.claude\probes\K1314\. Delete the junction with (Get-Item <dir>\node_modules).Delete() before the dir.
param([Parameter(Mandatory)][string]$Master, [string]$Scenes = "def,fat", [int]$Pairs = 2, [int]$Rounds = 5,
  [string]$Log = "", [int]$WaitMin = 60)
$ErrorActionPreference = "Continue"
$here = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1314 s11 agent (worktree agent-a2fd366dec3d37858)"
$deadline = (Get-Date).AddMinutes($WaitMin)
while ($true) {
  while (Test-Path $lock) {
    $age = (Get-Date) - (Get-Item $lock).LastWriteTime
    if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
    if ((Get-Date) -gt $deadline) { Write-Host "lock still held after $WaitMin min: $(Get-Content $lock -Raw)"; exit 2 }
    Start-Sleep -Seconds 5
  }
  "$owner, $(Get-Date -Format s), k1314s11_abba Node ABBA $Scenes" | Out-File -Encoding ASCII $lock
  Start-Sleep -Milliseconds 500
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { break }
}
function Load([string]$tag) {
  $tot = (Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 2).CounterSamples.CookedValue
  $pr = (Get-Counter '\Process(*)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples |
    Where-Object { $_.InstanceName -notin @('_total', 'idle') -and $_.CookedValue -gt 5 } |
    Sort-Object CookedValue -Descending | Select-Object -First 5 | ForEach-Object { "$($_.InstanceName) $([int]$_.CookedValue)" }
  "load $tag $(Get-Date -Format s): total % $([int](($tot | Measure-Object -Average).Average)); top: $($pr -join ', ')"
}
$out = @("== lock taken $(Get-Date -Format s)", (Load "before"))
try {
  foreach ($sc in $Scenes.Split(",")) {
    $dir = Join-Path $here ".claude/probes/K1314/out/s11/drag/$sc"
    $rows = @()
    for ($p = 0; $p -lt $Pairs; $p++) {
      foreach ($v in @("M", "B", "B", "M")) {
        $root = if ($v -eq "M") { $Master } else { $here }
        Push-Location $root
        $r = & node --expose-gc scripts/run_node.mjs .claude/probes/K1314/k1314s11_proc.ts $dir "which=$v" "rounds=$Rounds" 2>&1 |
          Where-Object { "$_" -match '^[MB] total' } | Select-Object -Last 1
        Pop-Location
        $rows += "$r"; $out += "$sc $r"; Write-Host "$sc $r"
      }
    }
    foreach ($k in @("total", "frame", "zChains", "fill", "paint", "band")) {
      $s = foreach ($v in @("M", "B")) {
        $vals = $rows | Where-Object { $_.StartsWith("$v ") } | ForEach-Object { if ($_ -match "(?:^|\| |^[MB] )$k ([\d.]+)") { [double]$Matches[1] } }
        $mo = $vals | Measure-Object -Average -Minimum -Maximum
        "$v mean $([math]::Round($mo.Average, 2)) spread $([math]::Round($mo.Maximum - $mo.Minimum, 2))"
      }
      $line = "$sc $k : $($s -join ' | ')"; $out += $line; Write-Host $line
    }
  }
  $out += Load "after"
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock); Write-Host "lock released $(Get-Date -Format s)" }
  if ($Log) { $out | Out-File -Encoding utf8 $Log }
}
