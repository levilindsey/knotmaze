# K1040: run run.mjs under the machine-wide perf lock ($env:TEMP\claude-perf.lock).
# Waits (one blocking loop, 20 min cap) while another owner holds a lock
# younger than 30 min, writes its own line, runs, and always deletes it.
# Usage: & .claude\probes\K1040\run_locked.ps1 -RunArgs @('<scene.json>', '--calib')
param([string[]]$RunArgs = @(), [int]$MaxWaitMin = 20)
$lock = Join-Path $env:TEMP 'claude-perf.lock'
$owner = 'K1040'
$deadline = (Get-Date).AddMinutes($MaxWaitMin)
while (Test-Path $lock) {
  $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
  $line = (Get-Content $lock -TotalCount 1)
  if ($line -match "^$owner ") { break }
  if ($age -gt 30) { Write-Host "stale lock ($([int]$age) min): $line"; break }
  if ((Get-Date) -gt $deadline) { throw "perf lock still held after $MaxWaitMin min: $line" }
  Start-Sleep -Seconds 10
}
"$owner $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ss') form B timing prototype (.claude/probes/K1040)" | Out-File -Encoding ASCII $lock
try {
  & node (Join-Path $PSScriptRoot 'run.mjs') @RunArgs
} finally {
  if ((Test-Path $lock) -and ((Get-Content $lock -TotalCount 1) -match "^$owner ")) { Remove-Item $lock -Force }
}
