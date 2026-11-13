# K1247 s28: k1247s21_bench.ps1 with its own owner line (def, then fat, ABBA in one perf lock; QF is the
# codec-v10 fat link, checked 2026-11-12 with decodeToken).
#   pwsh .claude/probes/K1247/k1247s28_bench.ps1 -Out <prefix> -PortA <master> -PortB <branch>
# K1247 s21: k1247s20_bench.ps1 with its own owner line.
#   pwsh .claude/probes/K1247/k1247s21_bench.ps1 -Out <prefix> -PortA <master> -PortB <branch>
# K1247 s20: k1247s19_bench.ps1 with its own owner line, run over def then fat in one lock: master (-PortA) vs this branch (-PortB), both at their defaults (no oe key).
#   pwsh .claude/probes/K1247/k1247s20_bench.ps1 -Out <prefix> -PortA 5988 -PortB 5987   (writes <prefix>_def.json, <prefix>_fat.json)
# K1247 s19: k1247s18_bench.ps1 with its own owner line.
# K1247 s18: k1283s11_bench.ps1 with its own owner line; A = QA, B = QB (default: oe off vs on, one build).
# K1283 s11: a copy of k1283s10_bench.ps1 with its own owner line.
# K1283 s10 (copy of k1283s9_bench.ps1, own owner line). K1283 s9 (copy of k1283s8_bench.ps1, own owner line; s8 copied k1283s7_bench.ps1): k1240s4b_bench.mjs on def, A B B A (A = before on -PortA, B = after on -PortB, each a
# `vite preview` of a scripts/preview.ps1 -BuildOnly build), under the perf lock: waits for another
# owner's lock inside this one call (a lock older than 30 min is stale), takes it, runs, deletes it.
#   pwsh .claude/probes/K1240/proto/k1283s9_bench.ps1 -Out <out.json> [-PortA 5531] [-PortB 5532]
param([Parameter(Mandatory = $true)][string]$Out, [int]$PortA = 5981, [int]$PortB = 5981, [string]$QA = "?b&am=instant&snd=none&fw=0&rp=outline", [string]$QB = "?b&am=instant&snd=none&fw=0&rp=outline", [string]$QF = "?p9ar6.FHFUnxp1_T-IDyQ9&am=instant&snd=none&fw=0&rp=outline")
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1247 s28 agent (worktree-agent-a4625873239640993)"
$deadline = (Get-Date).AddMinutes(30)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 15 min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), k1247s28_bench ABBA master vs branch, def + fat" | Out-File -Encoding ASCII $lock
try {
  $a = "http://localhost:$PortA/$QA"; $b = "http://localhost:$PortB/$QB"
  $bench = Join-Path $PSScriptRoot "k1247s18_bench.mjs"
  & node $bench "${Out}_def.json" $a $b $b $a
  $fa = "http://localhost:$PortA/$QF"; $fb = "http://localhost:$PortB/$QF"
  & node $bench "${Out}_fat.json" $fa $fb $fb $fa
  Write-Host "bench exit $LASTEXITCODE"
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
