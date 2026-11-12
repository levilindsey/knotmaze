# K1314 s9: k1314_s8_bench.ps1 with its own owner line and any port order (-Ports 5591,5593,5593,5591 = A B B A).
# Each port serves a `vite preview` of a scripts/preview.ps1 -BuildOnly build. Under the perf lock: waits for
# another owner's lock inside this one call (a lock older than 30 min is stale), takes it, runs, deletes it.
#   pwsh .claude/probes/K1314/k1314_s9_bench.ps1 -Out <out.json> -Ports 5591,5593,5593,5591
param([Parameter(Mandatory = $true)][string]$Out, [Parameter(Mandatory = $true)][string]$Ports, [int]$WaitMin = 60)
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1314 s9 agent (worktree-agent-a88e9bc054f3e16da)"
$deadline = (Get-Date).AddMinutes($WaitMin)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after $WaitMin min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), k1240s4b_bench on def, ports $Ports" | Out-File -Encoding ASCII $lock
try {
  $q = "?b&am=instant&snd=none&fw=0&rp=outline"
  $urls = $Ports.Split(",") | ForEach-Object { "http://localhost:$_/$q" }
  $bench = Join-Path $PSScriptRoot "..\K1240\s4\k1240s4b_bench.mjs"
  & node $bench $Out @urls
  Write-Host "bench exit $LASTEXITCODE"
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
