# K1283 s11: the brief's perf-locked guards in one call, in order (each step takes and frees the
# perf lock itself, waiting for another owner's): the worker-frame ABBA bench on def, K1291's
# palette/overlay A/B on the dev server, the reveal IoUs on master and head, the main-frame bench.
#   pwsh .claude/probes/K1240/proto/k1283s11_chain.ps1 -Out <dir> [-Master http://localhost:5541] [-Head http://localhost:5542] [-Dev http://127.0.0.1:5543]
param([Parameter(Mandatory = $true)][string]$Out, [string]$Master = "http://localhost:5541",
  [string]$Head = "http://localhost:5542", [string]$Dev = "http://127.0.0.1:5543")
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")).Path
Set-Location $root
New-Item -ItemType Directory -Force $Out | Out-Null
$pm = ([uri]$Master).Port; $ph = ([uri]$Head).Port
Write-Output "bench start $(Get-Date -Format HH:mm:ss)"
& pwsh -File .claude/probes/K1240/proto/k1283s11_bench.ps1 -Out (Join-Path $Out "bench.json") -PortA $pm -PortB $ph *> (Join-Path $Out "bench.log")
Write-Output "guards start $(Get-Date -Format HH:mm:ss)"
& pwsh -File .claude/probes/K1291/k1283s11_guards.ps1 -Master $Master -Head $Head -AbBase $Dev -Out (Join-Path $Out "k1291") -AbOnly *> (Join-Path $Out "guards.log")
Write-Output "reveal start $(Get-Date -Format HH:mm:ss)"
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1283 s11 agent (worktree-agent-ae62168490360313e)"
$t0 = Get-Date
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Output "stale lock: $(Get-Content $lock -Raw)"; break }
  if (((Get-Date) - $t0).TotalMinutes -gt 20) { Write-Output "lock held 20 min, reveal not run"; break }
  Start-Sleep -Seconds 10
}
if (-not (Test-Path $lock)) {
  "$owner, $(Get-Date -Format s), k1291_reveal IoUs on master and head" | Out-File -Encoding ASCII $lock
  try {
    node .claude/probes/K1291/k1291_reveal.mjs $Master (Join-Path $Out "reveal_master") *> (Join-Path $Out "reveal_master.log")
    node .claude/probes/K1291/k1291_reveal.mjs $Head (Join-Path $Out "reveal_head") *> (Join-Path $Out "reveal_head.log")
  } finally {
    $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
    if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
  }
  node .claude/probes/K1291/s3_iou.mjs (Join-Path $Out "reveal_master") (Join-Path $Out "reveal_head") *> (Join-Path $Out "iou.txt")
}
Write-Output "s3 bench start $(Get-Date -Format HH:mm:ss)"
& pwsh -File .claude/probes/K1291/k1283s11_s3_bench.ps1 -S1 $Master -Master $Master -Head $Head -Out (Join-Path $Out "s3") -Sets none *> (Join-Path $Out "s3.log")
$js = Get-ChildItem (Join-Path $Out "s3") -Filter "none_r*.json" -ErrorAction SilentlyContinue | ForEach-Object FullName
if ($js) { node .claude/probes/K1291/s3_bench_sum.mjs @js *> (Join-Path $Out "s3_sum.txt") }
Write-Output "chain done $(Get-Date -Format HH:mm:ss)"
