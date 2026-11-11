# K1291 s2 guards under the perf lock: k1291_ab palette + overlay on the
# HEAD preview, then an ABBA worker/main frame bench, master vs HEAD.
#   pwsh .claude/probes/K1291/s2_guards.ps1 -Master <url> -Head <url> -Out <dir> [-Rounds 4]
#     [-AbBase <dev server url>] [-AbOnly]
# k1291_ab's palette mode imports /src/... in the page, so -AbBase must be a Vite DEV server of the
# same commit as -Head (a `vite preview` build has no /src).
param([string]$Master, [string]$Head, [string]$Out, [int]$Rounds = 4, [int]$MaxWaitMin = 20,
  [string]$AbBase = "", [switch]$AbOnly)
if (-not $AbBase) { $AbBase = $Head }
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1291 s2 agent (worktree agent-a72915389c5d50e4a)"
$deadline = (Get-Date).AddMinutes($MaxWaitMin)
while (Test-Path $lock) {
  $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
  if ($age -gt 30) { Write-Output "stale lock ($([int]$age) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { throw "perf lock still held: $(Get-Content $lock -Raw)" }
  Start-Sleep -Seconds 10
}
"$owner | $(Get-Date -Format s) | k1291_ab palette/overlay + ABBA bench" | Out-File -Encoding ascii $lock
try {
  New-Item -ItemType Directory -Force $Out | Out-Null
  Set-Location $root
  foreach ($m in "palette", "overlay") {
    node .claude/probes/K1291/k1291_ab.mjs $AbBase (Join-Path $Out "ab_$m") $m 2>&1 | Out-File -Encoding utf8 (Join-Path $Out "ab_$m.log")
    Write-Output "ab $m exit $LASTEXITCODE"
  }
  if ($AbOnly) { return }
  $q = "?s=b&am=instant&snd=none&rp=outline"
  for ($i = 1; $i -le $Rounds; $i++) {
    $urls = if ($i % 2) { @("$Master/$q", "$Head/$q") } else { @("$Head/$q", "$Master/$q") }
    node .claude/probes/K1240/s4/k1240s4b_bench.mjs (Join-Path $Out "bench_r$i.json") @urls 2>&1 | Out-File -Encoding utf8 (Join-Path $Out "bench_r$i.log")
    Write-Output "bench r$i exit $LASTEXITCODE"
  }
} finally {
  if ((Test-Path $lock) -and ((Get-Content $lock -Raw) -like "$owner*")) { [System.IO.File]::Delete($lock) }
  Write-Output "lock released $(Get-Date -Format HH:mm:ss)"
}
