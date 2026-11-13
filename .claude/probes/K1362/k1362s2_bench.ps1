# K1362 s2: k1362s2_bench.mjs under the perf lock (K1247 s18's wrapper, own owner line): waits for
# another owner's lock inside this one call (a lock older than 30 min is stale), takes it, runs the
# bench on <Base><query> for each query in order, deletes the lock.
# Optional: -AbOut <json> -AbQ '?q1','?q2' runs k1362s2_ab.mjs after it, in the same lock.
#   pwsh -Command "& ./.claude/probes/K1362/k1362s2_bench.ps1 -Out <out.json> -Base http://127.0.0.1:5372/ -Q '?a','?b'"
param([Parameter(Mandatory = $true)][string]$Out, [string]$Base = "http://127.0.0.1:5372/", [Parameter(Mandatory = $true)][string[]]$Q, [string]$AbOut = "", [string]$AbA = "http://127.0.0.1:5373/", [string]$AbB = "http://127.0.0.1:5372/", [string[]]$AbQ = @())
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1362 s2 agent (claude session 01SUPGULDxvE5gKXozfaFaFG)"
$deadline = (Get-Date).AddMinutes(25)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 25 min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 10
}
"$owner, $(Get-Date -Format s), k1362s2_bench rp=gf / rp=outline / today's look" | Out-File -Encoding ASCII $lock
try {
  $bench = Join-Path $PSScriptRoot "k1362s2_bench.mjs"
  $urls = $Q | ForEach-Object { if ($_ -match '^http') { $_ } else { "$Base$_" } }
  & node $bench $Out @urls
  Write-Host "bench exit $LASTEXITCODE"
  # Then, in the same lock, k1362s2_ab.mjs (master vs branch, frozen state) when -AbOut is given.
  if ($AbOut) { & node (Join-Path $PSScriptRoot "k1362s2_ab.mjs") $AbOut $AbA $AbB @AbQ; Write-Host "ab exit $LASTEXITCODE" }
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
