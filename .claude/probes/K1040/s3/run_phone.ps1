# K1040 S3b step 4: phone_time.mjs under both locks. Checks the phone first
# (scripts/phone_pass.ps1 -Phase check: dumpsys reads only; it stops unless
# the phone is ready, awake and unlocked), takes the phone lock and then the
# perf lock (one blocking loop each, -MaxWaitMin), runs, and always releases
# both, matched by owner. Prints only the check's awake/locked/top fields
# (never the device serial or an address).
# Usage: & .claude\probes\K1040\s3\run_phone.ps1 [-RunArgs @('muse_hash,def')]
param([string[]]$RunArgs = @(), [int]$MaxWaitMin = 5)
$worktree = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$probes = 'C:\Users\lsl\Repositories\knotmaze\.claude\probes\agents'
$phoneOwner = 'K1097 S3c'
$perfOwner = 'K1040-S3c'
$chk = (pwsh -NoProfile -File (Join-Path $worktree 'scripts\phone_pass.ps1') -Phase check 2>&1) -join "`n"
$fields = if ($chk -match 'awake=(\w+) locked=(\w+) top=(\S+)') { "awake=$($Matches[1]) locked=$($Matches[2]) top=$($Matches[3])" } else { 'no state' }
$ready = $chk -match 'phone is ready'
Write-Host "$(Get-Date -Format HH:mm:ss) phone check: ready=$ready $fields"
if (-not $ready) { Write-Host 'phone not ready: stopping'; exit 2 }

$took = & (Join-Path $probes 'phone_lock_take.ps1') -Owner $phoneOwner -What 'K1040 S3c label pass render sync (.claude/probes/K1040/s3)' -MaxWaitMin $MaxWaitMin
Write-Host "$(Get-Date -Format HH:mm:ss) $($took -join ' / ')"
if ($LASTEXITCODE -ne 0 -or -not ($took -match 'phone lock taken')) { Write-Host 'no phone lock: stopping'; exit 3 }
$lock = Join-Path $env:TEMP 'claude-perf.lock'
try {
  $deadline = (Get-Date).AddMinutes($MaxWaitMin)
  while (Test-Path $lock) {
    $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
    $line = (Get-Content $lock -TotalCount 1)
    if ($line -match "^$perfOwner \|") { break }
    if ($age -gt 30) { Write-Host "stale perf lock ($([int]$age) min): $line"; break }
    if ((Get-Date) -gt $deadline) { throw "perf lock still held after $MaxWaitMin min: $line" }
    Start-Sleep -Seconds 10
  }
  "$perfOwner | $(Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz') | phone label pass $($RunArgs -join ' ') (.claude/probes/K1040/s3)" | Out-File -Encoding ASCII $lock
  Write-Host "$(Get-Date -Format HH:mm:ss) perf lock taken"
  Push-Location $worktree
  & node (Join-Path $PSScriptRoot 'phone_time.mjs') @RunArgs
  $code = $LASTEXITCODE
} finally {
  Pop-Location
  if ((Test-Path $lock) -and ((Get-Content $lock -TotalCount 1) -match "^$perfOwner \|")) { Remove-Item $lock -Force }
  Write-Host "$(Get-Date -Format HH:mm:ss) perf lock released"
  & (Join-Path $probes 'phone_lock_release.ps1') -Owner $phoneOwner | ForEach-Object { Write-Host "$(Get-Date -Format HH:mm:ss) $_" }
}
exit $code
