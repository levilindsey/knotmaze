# Run one command under the machine perf lock ($env:TEMP\claude-perf.lock, one line: owner | start time | what):
# wait while another owner holds it, take it, run the command, release it. K1533.
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1482 s24" -What "hold, dragchecks" -Cmd "& '.\run24.ps1' -Port 6090"
# Two owners that both go through this script take turns, which a hand-written "delete it, write my line" does not
# give (2026-11-19: one owner re-took the lock that way for 80 minutes and a waiter polling it never saw it free):
#   - it never removes another owner's lock, unless that lock is older than 30 minutes (stale);
#   - it releases in a finally block, so the lock does not outlive the command;
#   - an owner that released the lock less than 45 s ago waits those 45 s out before taking it again, so a waiter
#     (5 s poll) gets its turn between two sequences of one owner.
# Keep one sequence under 25 minutes. Exit code: the command's, or 3 when the wait gave up (-MaxWaitMin, default 60).
param(
  [Parameter(Mandatory)][string]$Owner,
  [Parameter(Mandatory)][string]$What,
  [Parameter(Mandatory)][string]$Cmd,
  [int]$MaxWaitMin = 60,
  [string]$Dir = $env:TEMP # tests only
)
$lock = Join-Path $Dir 'claude-perf.lock'
$last = Join-Path $Dir 'claude-perf.last'
$t0 = Get-Date
if (Test-Path $last) {
  $since = ((Get-Date) - (Get-Item $last).LastWriteTime).TotalSeconds
  if ((Get-Content $last -TotalCount 1) -eq $Owner -and $since -lt 45) { Start-Sleep -Seconds ([int](45 - $since) + 1) }
}
while ($true) {
  if (Test-Path $lock) {
    $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
    if ($age -gt 30) { "stale lock ($([int]$age) min) removed: $(Get-Content $lock -TotalCount 1)"; Remove-Item $lock -ErrorAction SilentlyContinue; continue }
  } else {
    try {
      # CreateNew fails when another waiter took it first
      $fs = [IO.File]::Open($lock, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::Read)
      $bytes = [Text.Encoding]::ASCII.GetBytes("$Owner | $((Get-Date).ToString('o')) | $What`r`n")
      $fs.Write($bytes, 0, $bytes.Length); $fs.Dispose()
      break
    } catch [IO.IOException] { }
  }
  if (((Get-Date) - $t0).TotalMinutes -ge $MaxWaitMin) { "gave up after $MaxWaitMin min: $(Get-Content $lock -TotalCount 1 -ErrorAction SilentlyContinue)"; exit 3 }
  Start-Sleep -Seconds 5
}
"lock taken $((Get-Date).ToString('HH:mm:ss')) after $([int]((Get-Date) - $t0).TotalSeconds) s"
$code = 0
try {
  $global:LASTEXITCODE = 0
  Invoke-Expression $Cmd
  $code = $global:LASTEXITCODE
} finally {
  if ((Test-Path $lock) -and ((Get-Content $lock -TotalCount 1) -like "$Owner |*")) { Remove-Item $lock -ErrorAction SilentlyContinue }
  Set-Content $last $Owner -Encoding ascii
  "lock released $((Get-Date).ToString('HH:mm:ss'))"
}
exit $code
