# K1247 s25: k1247s24_tfonly.mjs (the band placement alone, at rest, by timer query) on def and fat, ob=1, under the
# perf lock. obt=1 turns the timer query on (off by default since s25).
#   pwsh .claude/probes/K1247/k1247s25_tfonly.ps1 -Out <file.json> -Port <port>
param([Parameter(Mandatory = $true)][string]$Out, [int]$Port = 5995, [string]$QA = "?b&am=instant&snd=none&fw=0&rp=outline", [string]$QF = "?p9ar6.FHFUnxp1_T-IDyQ9&am=instant&snd=none&fw=0&rp=outline")
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1247 s25 agent (worktree-agent-a2a09438173cbb356)"
$deadline = (Get-Date).AddMinutes(30)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 30 min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 5
}
"$owner, $(Get-Date -Format s), k1247s25_tfonly ob=1 def + fat" | Out-File -Encoding ASCII $lock
try {
  & node (Join-Path $PSScriptRoot "k1247s24_tfonly.mjs") $Out "http://localhost:$Port/$QA&ob=1&obt=1" "http://localhost:$Port/$QF&ob=1&obt=1"
  Write-Host "tfonly exit $LASTEXITCODE"
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
