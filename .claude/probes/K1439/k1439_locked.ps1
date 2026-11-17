# K1439 (a copy of K1407 c5's wrapper, its own owner): runs one command under the machine's perf lock ($env:TEMP\claude-perf.lock): waits while another owner
# holds it (a lock older than 30 min is stale), writes it, runs, deletes it (only if still ours).
#   pwsh -NoProfile -File .claude/probes/K1439/k1439_locked.ps1 -What 'K1439 parity' -Cmd 'pwsh -NoProfile -File ...'
param([Parameter(Mandatory)][string]$What, [Parameter(Mandatory)][string]$Cmd, [int]$MaxWaitMin = 90)
$lock = Join-Path $env:TEMP 'claude-perf.lock'
$owner = "K1439 agent-ab538fa6 (claude session 01SUPGULDxvE5gKXozfaFaFG) $(Get-Date -Format 'yyyy-MM-dd HH:mm') $What"
$t0 = Get-Date
while ($true) {
  if (-not (Test-Path $lock) -or ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes -gt 30) {
    Set-Content -Path $lock -Value $owner -Encoding ascii; Start-Sleep -Milliseconds 300
    if ((Get-Content $lock -Raw).Trim() -eq $owner) { break }
  }
  if (((Get-Date) - $t0).TotalMinutes -gt $MaxWaitMin) { Write-Output "lock wait timed out: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
Write-Output "lock taken $(Get-Date -Format 'HH:mm:ss') after $([int]((Get-Date) - $t0).TotalSeconds) s"
try { Invoke-Expression $Cmd } finally {
  if ((Test-Path $lock) -and (Get-Content $lock -Raw).Trim() -eq $owner) { [System.IO.File]::Delete($lock) }
  Write-Output "lock released $(Get-Date -Format 'HH:mm:ss')"
}
