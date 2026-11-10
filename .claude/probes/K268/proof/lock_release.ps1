# Release the machine-wide perf lock if this owner holds it.
param([string]$Owner = 'K4 G2')
$lock = Join-Path $env:TEMP 'claude-perf.lock'
if (Test-Path $lock) {
  $line = Get-Content $lock -TotalCount 1
  if ($line -like "$Owner*") { Remove-Item $lock; Write-Output "lock released" }
  else { Write-Output "lock held by another owner, left alone: $line" }
} else { Write-Output "no lock" }
