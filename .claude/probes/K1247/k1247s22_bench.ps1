# K1247 s22: k1247s21_bench.ps1 with its own owner line and k1247s22_bench.mjs; A = ob off, B = ob=1, one build
# (both on -Port), A B B A over def then fat in one perf lock.
#   pwsh .claude/probes/K1247/k1247s22_bench.ps1 -Out <prefix> -Port <port>   (writes <prefix>_def.json, <prefix>_fat.json)
param([Parameter(Mandatory = $true)][string]$Out, [int]$Port = 5991, [string]$QA = "?b&am=instant&snd=none&fw=0&rp=outline", [string]$QF = "?p9ar6.FHFUnxp1_T-IDyQ9&am=instant&snd=none&fw=0&rp=outline")
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1247 s22 agent (worktree-agent-a555ed905a6dda790)"
$deadline = (Get-Date).AddMinutes(30)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 30 min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), k1247s22_bench ABBA ob off vs ob=1, def + fat" | Out-File -Encoding ASCII $lock
try {
  $bench = Join-Path $PSScriptRoot "k1247s22_bench.mjs"
  $a = "http://localhost:$Port/$QA"; $b = "http://localhost:$Port/$QA&ob=1"
  & node $bench "${Out}_def.json" $a $b $b $a
  $fa = "http://localhost:$Port/$QF"; $fb = "http://localhost:$Port/$QF&ob=1"
  & node $bench "${Out}_fat.json" $fa $fb $fb $fa
  Write-Host "bench exit $LASTEXITCODE"
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
