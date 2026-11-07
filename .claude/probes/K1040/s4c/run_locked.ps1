# K1040 s4c (copied from S4a2): run s4a.mjs under the machine-wide perf lock ($env:TEMP\claude-perf.lock).
# Stops unless git's toplevel is this probe's worktree. Waits (one blocking
# loop, -MaxWaitMin cap) while another owner holds a lock younger than 30 min,
# writes its own line (owner | start | what), runs, and always deletes its own
# lock (matched exactly by owner).
# Usage: & .claude\probes\K1040\s4c\run_locked.ps1 -RunArgs @('check', 'fat')
#        & .claude\probes\K1040\s4c\run_locked.ps1 -Script smoke.mjs -RunArgs @('http://127.0.0.1:5961', '<outDir>')
param([string[]]$RunArgs = @(), [int]$MaxWaitMin = 25, [string]$Script = 's4a.mjs')
$worktree = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$top = (& git -C $worktree rev-parse --show-toplevel).Trim()
if ((($top -replace '/', '\').ToLower()) -ne ($worktree.TrimEnd('\').ToLower())) { throw "toplevel $top is not $worktree" }
$lock = Join-Path $env:TEMP 'claude-perf.lock'
$owner = 'K1040-S4c'
$deadline = (Get-Date).AddMinutes($MaxWaitMin)
while (Test-Path $lock) {
  $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
  $line = (Get-Content $lock -TotalCount 1)
  if ($line -match "^$owner \|") { break }
  if ($age -gt 30) { Write-Host "stale lock ($([int]$age) min): $line"; break }
  if ((Get-Date) -gt $deadline) { throw "perf lock still held after $MaxWaitMin min: $line" }
  Start-Sleep -Seconds 10
}
"$owner | $(Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz') | band pass $($RunArgs -join ' ') (.claude/probes/K1040/s4c)" | Out-File -Encoding ASCII $lock
Write-Host "lock taken $(Get-Date -Format 'HH:mm:ss')"
try {
  Push-Location $worktree
  & node (Join-Path $PSScriptRoot $Script) @RunArgs
} finally {
  Pop-Location
  if ((Test-Path $lock) -and ((Get-Content $lock -TotalCount 1) -match "^$owner \|")) { Remove-Item $lock -Force }
  Write-Host "lock released $(Get-Date -Format 'HH:mm:ss')"
}

