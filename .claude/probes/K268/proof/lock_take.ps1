# Take the machine-wide perf lock (claude-config rules/sessions.md,
# "Concurrency and pacing"): $env:TEMP\claude-perf.lock holds one line
# (owner, start time, what). Waits while another owner holds a fresh lock
# (a lock older than 30 min is stale). Usage: pwsh lock_take.ps1 -What "..."
param([string]$What = 'perf measurement', [string]$Owner = 'K4 G2', [int]$MaxWaitMin = 60)
$lock = Join-Path $env:TEMP 'claude-perf.lock'
$deadline = (Get-Date).AddMinutes($MaxWaitMin)
while ($true) {
  if (Test-Path $lock) {
    $item = Get-Item $lock
    $line = (Get-Content $lock -TotalCount 1)
    $age = ((Get-Date) - $item.LastWriteTime).TotalMinutes
    if ($line -like "$Owner*") { break }  # Ours (re-entrant).
    if ($age -ge 30) { Write-Output "stale lock ($([int]$age) min): $line - taking it"; break }
    if ((Get-Date) -gt $deadline) { Write-Output "TIMEOUT waiting for lock: $line"; exit 1 }
    Write-Output "lock held ($([int]$age) min): $line - waiting"
    Start-Sleep -Seconds 30
    continue
  }
  break
}
"$Owner | $(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssK') | $What" | Out-File -FilePath $lock -Encoding ASCII
Write-Output "lock taken: $(Get-Content $lock)"
