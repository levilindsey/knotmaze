# K1247 s29: K1314's k1314_s10_bench.ps1 with its own owner line and a -Query (fat: the K868 fat scene's link).
# Each port serves a `vite preview` of a scripts/preview.ps1 -BuildOnly build; -Ports 5591,5593,5593,5591 = A B B A.
# Under the perf lock: waits for another owner's lock inside this one call (a lock older than 30 min is stale),
# takes it, runs the main checkout's K1240 s4b bench (rest + 5 s mid-drag, the outline's parts), deletes it.
#   pwsh .claude/probes/K1247/k1247s29_bench.ps1 -Out <out.json> -Ports 5591,5593,5593,5591 [-Query "?b&am=instant&snd=none&fw=0&rp=outline"]
#   fat: -Query "?p9ar6.EihVJ8adf0_iA8kPQ0HgzAtI&am=instant&snd=none&fw=0&rp=outline"
param([Parameter(Mandatory = $true)][string]$Out, [Parameter(Mandatory = $true)][string]$Ports, [int]$WaitMin = 60,
  [string]$Query = "?b&am=instant&snd=none&fw=0&rp=outline")
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1247 s29 agent (worktree-agent-ae54518a925be4103)"
$deadline = (Get-Date).AddMinutes($WaitMin)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after $WaitMin min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), k1240s4b_bench $Query, ports $Ports" | Out-File -Encoding ASCII $lock
try {
  $urls = $Ports.Split(",") | ForEach-Object { "http://localhost:$_/$Query" }
  $bench = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1240\s4\k1240s4b_bench.mjs"
  & node $bench $Out @urls
  Write-Host "bench exit $LASTEXITCODE"
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
exit 0
