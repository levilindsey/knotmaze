# K1240 S1: run a Node script under the machine-wide perf lock
# ($env:TEMP\claude-perf.lock), owner K1240-S1. Copied from K1040's
# s4c/run_locked.ps1 with the owner renamed. Waits (one blocking loop,
# -MaxWaitMin cap) while another owner holds a lock younger than 30 min,
# writes its own line, runs, and always deletes its own lock.
# Usage: & .claude\probes\K1240\proto\run_locked.ps1 -Script bench.ts -RunArgs @()
#        & .claude\probes\K1240\proto\run_locked.ps1 -ScriptName run_page.mjs -RunArgs @('def')
param([string]$Script = 'bench.ts', [string]$ScriptName = '', [string[]]$RunArgs = @(), [int]$MaxWaitMin = 25)
$worktree = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$top = (& git -C $worktree rev-parse --show-toplevel).Trim()
if ((($top -replace '/', '\').ToLower()) -ne ($worktree.TrimEnd('\').ToLower())) { throw "toplevel $top is not $worktree" }
$lock = Join-Path $env:TEMP 'claude-perf.lock'
$owner = 'K1240-S2'
$deadline = (Get-Date).AddMinutes($MaxWaitMin)
while (Test-Path $lock) {
  $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
  $line = (Get-Content $lock -TotalCount 1)
  if ($line -match "^$owner \|") { break }
  if ($age -gt 30) { Write-Host "stale lock ($([int]$age) min): $line"; break }
  if ((Get-Date) -gt $deadline) { throw "perf lock still held after $MaxWaitMin min: $line" }
  Start-Sleep -Seconds 10
}
"$owner | $(Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz') | $($Script)$($ScriptName) $($RunArgs -join ' ') (.claude/probes/K1240/proto)" | Out-File -Encoding ASCII $lock
Write-Host "lock taken $(Get-Date -Format 'HH:mm:ss')"
try {
  Push-Location $worktree
  if ($ScriptName) {
    & node (Join-Path $PSScriptRoot $ScriptName) @RunArgs
  } else {
    & node scripts/run_node.mjs (Join-Path $PSScriptRoot $Script) @RunArgs
  }
  $code = $LASTEXITCODE
} finally {
  Pop-Location
  if ((Test-Path $lock) -and ((Get-Content $lock -TotalCount 1) -match "^$owner \|")) { Remove-Item $lock -Force }
  Write-Host "lock released $(Get-Date -Format 'HH:mm:ss')"
}
exit $code
