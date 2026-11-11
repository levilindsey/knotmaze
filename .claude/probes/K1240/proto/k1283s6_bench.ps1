# K1283 s6 (copy of k1283s5_bench.ps1, own owner line): k1240s4b_bench.mjs on def, A B B A (A = before on -PortA, B = after on -PortB, each a
# `vite preview` of a scripts/preview.ps1 -BuildOnly build), under the perf lock: waits for another
# owner's lock inside this one call (a lock older than 30 min is stale), takes it, runs, deletes it.
#   pwsh .claude/probes/K1240/proto/k1283s6_bench.ps1 -Out <out.json> [-PortA 5531] [-PortB 5532]
param([Parameter(Mandatory = $true)][string]$Out, [int]$PortA = 5531, [int]$PortB = 5532)
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1283 s6 agent (worktree-agent-aef3d2423ba493150)"
$deadline = (Get-Date).AddMinutes(25)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 25 min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), k1240s4b_bench ABBA on def" | Out-File -Encoding ASCII $lock
try {
  $q = "?b&am=instant&snd=none&fw=0&rp=outline"
  $a = "http://localhost:$PortA/$q"; $b = "http://localhost:$PortB/$q"
  $bench = Join-Path $PSScriptRoot "..\s4\k1240s4b_bench.mjs"
  & node $bench $Out $a $b $b $a
  Write-Host "bench exit $LASTEXITCODE"
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
