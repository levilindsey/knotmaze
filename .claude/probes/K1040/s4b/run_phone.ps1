# K1040 S4b: phone_time.mjs under both locks and the shared ready check
# (scripts/phone_pass/phone_ready.mjs), as s3's run_phone.ps1.
# 1. A state-only check (scripts/phone_pass.ps1 -Phase check -QuietS 0:
#    dumpsys reads only): it stops unless the phone is awake, unlocked and
#    the launcher is in front.
# 2. The phone lock, then the perf lock (one blocking loop each, -MaxWaitMin).
# 3. With both held, the full check: launcher in front and no touchscreen or
#    button event for -QuietS seconds, waiting up to -MaxWaitMin.
#    phone_time.mjs runs only when it passes.
# Always releases both locks, matched by owner. Prints only the check's
# awake/locked/top fields and its "not ready" line, masked.
# Usage: & .claude\probes\K1040\s4b\run_phone.ps1 [-RunArgs @('muse_hash,def', '--fit', '411x753')] [-QuietS 120] [-MaxWaitMin 15]
param([string[]]$RunArgs = @(), [int]$MaxWaitMin = 15, [int]$QuietS = 120)
$worktree = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$probes = 'C:\Users\lsl\Repositories\knotmaze\.claude\probes\agents'
$phoneOwner = 'K1040 S4b'
$perfOwner = 'K1040-S4b'
$mask = { param([string]$t) (($t -replace 'adb devices:[^)\r\n]*', 'adb devices: <masked>') -replace '\b\d{1,3}(\.\d{1,3}){3}(:\d+)?\b', '<addr>') -replace 'device \S+ is not connected', 'device <serial> is not connected' }
$chk = (pwsh -NoProfile -File (Join-Path $worktree 'scripts\phone_pass.ps1') -Phase check -QuietS 0 2>&1) -join "`n"
$fields = if ($chk -match 'awake=(\w+) locked=(\w+) top=(\S+)') { "awake=$($Matches[1]) locked=$($Matches[2]) top=$($Matches[3])" } else { 'no state' }
$ready = $chk -match 'phone is ready'
Write-Host "$(Get-Date -Format HH:mm:ss) phone state check: ready=$ready $fields"
if (-not $ready) {
  if ($chk -match 'PHONE NOT READY[^\r\n]*') { Write-Host "$(Get-Date -Format HH:mm:ss) $(& $mask $Matches[0])" }
  Write-Host 'phone not ready: stopping'; exit 2
}

$took = & (Join-Path $probes 'phone_lock_take.ps1') -Owner $phoneOwner -What 'K1040 S4b band pass render sync (.claude/probes/K1040/s4b)' -MaxWaitMin $MaxWaitMin
Write-Host "$(Get-Date -Format HH:mm:ss) $($took -join ' / ')"
if ($LASTEXITCODE -ne 0 -or -not ($took -match 'phone lock taken')) { Write-Host 'no phone lock: stopping'; exit 3 }
$lock = Join-Path $env:TEMP 'claude-perf.lock'
$code = 1
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
  "$perfOwner | $(Get-Date -Format 'yyyy-MM-ddTHH:mm:sszzz') | phone band pass $($RunArgs -join ' ') (.claude/probes/K1040/s4b)" | Out-File -Encoding ASCII $lock
  Write-Host "$(Get-Date -Format HH:mm:ss) perf lock taken"
  Push-Location $worktree
  Write-Host "$(Get-Date -Format HH:mm:ss) ready check: launcher in front, no touch for $QuietS s (waiting up to $MaxWaitMin min)"
  & node (Join-Path $worktree 'scripts\phone_pass\phone_ready.mjs') --quiet-s $QuietS --timeout-min $MaxWaitMin --progress 2>&1 | ForEach-Object { Write-Host "$(Get-Date -Format HH:mm:ss) $(& $mask "$_")" }
  $code = $LASTEXITCODE
  if ($code -eq 0) {
    & node (Join-Path $PSScriptRoot 'phone_time.mjs') @RunArgs
    $code = $LASTEXITCODE
  } else { Write-Host "$(Get-Date -Format HH:mm:ss) phone not ready (exit $code): stopping" }
} finally {
  Pop-Location
  if ((Test-Path $lock) -and ((Get-Content $lock -TotalCount 1) -match "^$perfOwner \|")) { Remove-Item $lock -Force }
  Write-Host "$(Get-Date -Format HH:mm:ss) perf lock released"
  & (Join-Path $probes 'phone_lock_release.ps1') -Owner $phoneOwner | ForEach-Object { Write-Host "$(Get-Date -Format HH:mm:ss) $_" }
}
exit $code
