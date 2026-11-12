# K1247 s26: k1247s25_bench.ps1 across two builds (k1247s24_bench.mjs): A = the base on -PortA, B = the branch on
# -PortB (scripts/preview.ps1 -Ref), each at its default (ob on under rp=outline), A B B A over def then fat in one perf lock.
#   pwsh .claude/probes/K1247/k1247s26_bench.ps1 -Out <prefix> -PortA <port> -PortB <port>   (writes <prefix>_def.json, <prefix>_fat.json)
param([Parameter(Mandatory = $true)][string]$Out, [int]$PortA = 5996, [int]$PortB = 5997, [string]$QA = "?b&am=instant&snd=none&fw=0&rp=outline", [string]$QF = "?p9ar6.FHFUnxp1_T-IDyQ9&am=instant&snd=none&fw=0&rp=outline")
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1247 s26 agent (worktree-agent-aa4ea631c73c1c296)"
$deadline = (Get-Date).AddMinutes(30)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 30 min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), k1247s26_bench ABBA base vs branch, def + fat" | Out-File -Encoding ASCII $lock
try {
  $bench = Join-Path $PSScriptRoot "k1247s24_bench.mjs"
  $a = "http://localhost:$PortA/$QA"; $b = "http://localhost:$PortB/$QA"
  & node $bench "${Out}_def.json" $a $b $b $a
  $fa = "http://localhost:$PortA/$QF"; $fb = "http://localhost:$PortB/$QF"
  & node $bench "${Out}_fat.json" $fa $fb $fb $fa
  Write-Host "bench exit $LASTEXITCODE"
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
