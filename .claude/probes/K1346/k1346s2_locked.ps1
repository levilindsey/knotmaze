# K1346 s2: run one timing command under the machine-wide perf lock ($env:TEMP\claude-perf.lock). Waits for
# another owner inside this one call (a lock older than 30 min is stale), takes the lock with this owner line,
# runs the command, and deletes the lock only if it is still this owner's. Records the load before and after.
#   pwsh .claude/probes/K1346/k1346s2_locked.ps1 -What "<what>" -Cmd "<powershell command>" [-Log <file>]
param([Parameter(Mandatory)][string]$What, [Parameter(Mandatory)][string]$Cmd, [string]$Log = "", [int]$WaitMin = 90)
$ErrorActionPreference = "Continue"
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1346 s2 agent (worktree agent-a71bd8850e0bc2f5e)"
$deadline = (Get-Date).AddMinutes($WaitMin)
while ($true) {
  while (Test-Path $lock) {
    $age = (Get-Date) - (Get-Item $lock).LastWriteTime
    if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
    if ((Get-Date) -gt $deadline) { Write-Host "lock still held after $WaitMin min: $(Get-Content $lock -Raw)"; exit 2 }
    Start-Sleep -Seconds 5
  }
  "$owner, $(Get-Date -Format s), $What" | Out-File -Encoding ASCII $lock
  Start-Sleep -Milliseconds 500
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { break }
}
function Load([string]$tag) {
  $tot = (Get-Counter '\Processor(_Total)\% Processor Time' -SampleInterval 1 -MaxSamples 2).CounterSamples.CookedValue
  $pr = (Get-Counter '\Process(*)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples |
    Where-Object { $_.InstanceName -notin @('_total', 'idle') -and $_.CookedValue -gt 5 } |
    Sort-Object CookedValue -Descending | Select-Object -First 5 | ForEach-Object { "$($_.InstanceName) $([int]$_.CookedValue)" }
  "load $tag $(Get-Date -Format s): total % $([int](($tot | Measure-Object -Average).Average)); top: $($pr -join ', ')"
}
try {
  $o = @("== $What, lock taken $(Get-Date -Format s)", (Load "before"))
  $o += Invoke-Expression $Cmd 2>&1 | ForEach-Object { "$_" }
  $o += Load "after"
  if ($Log) { $o | Out-File -Append -Encoding utf8 $Log }
  $o
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock); Write-Host "lock released $(Get-Date -Format s)" }
}
