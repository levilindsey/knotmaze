# K1247 s19: k1247s18_bench.ps1 with its own owner line.
# K1247 s18: k1283s11_bench.ps1 with its own owner line; A = QA, B = QB (default: oe off vs on, one build).
# K1283 s11: a copy of k1283s10_bench.ps1 with its own owner line.
# K1283 s10 (copy of k1283s9_bench.ps1, own owner line). K1283 s9 (copy of k1283s8_bench.ps1, own owner line; s8 copied k1283s7_bench.ps1): k1240s4b_bench.mjs on def, A B B A (A = before on -PortA, B = after on -PortB, each a
# `vite preview` of a scripts/preview.ps1 -BuildOnly build), under the perf lock: waits for another
# owner's lock inside this one call (a lock older than 30 min is stale), takes it, runs, deletes it.
#   pwsh .claude/probes/K1240/proto/k1283s9_bench.ps1 -Out <out.json> [-PortA 5531] [-PortB 5532]
param([Parameter(Mandatory = $true)][string]$Out, [int]$PortA = 5981, [int]$PortB = 5981, [string]$QA = "?b&am=instant&snd=none&fw=0&rp=outline", [string]$QB = "?b&am=instant&snd=none&fw=0&rp=outline&oe=1")
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1247 s19 agent (worktree-agent-ad99eae806bca8e74)"
$deadline = (Get-Date).AddMinutes(25)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 15 min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), k1247s18_bench ABBA oe off/on" | Out-File -Encoding ASCII $lock
try {
  $a = "http://localhost:$PortA/$QA"; $b = "http://localhost:$PortB/$QB"
  $bench = Join-Path $PSScriptRoot "k1247s18_bench.mjs"
  & node $bench $Out $a $b $b $a
  Write-Host "bench exit $LASTEXITCODE"
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
