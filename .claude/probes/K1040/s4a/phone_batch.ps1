# K1040 S4a: a batch of phone_time.mjs runs (label alone vs label + band), in
# order, each through run_phone.ps1 (the phone and perf locks, and the shared
# ready check with both held: no touch for 120 s before the first run and
# 20 s before each later one). Stops at the first non-zero exit. Logs to
# out/batch_<Name>_<stamp>.log; each run appends to out/phone_time_summary.md.
# -DryRun touches no phone and takes no lock: each run is `node
# phone_time.mjs --dry <args>` (the page bundled, the run printed).
# The S4a set (the one to run, Claude, with the phone on its charger):
#   & .claude\probes\K1040\s4a\phone_batch.ps1 -Name s4a -Runs @('--fit 411x753 --label s4afit', '--label s4a')
# Its first run is the Pixel's own window (K923's fit, as S3's tables); the
# second the scene's camera at 2480x1800 (the desktop's numbers).
param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string[]]$Runs, [int]$MaxWaitMin = 15, [int]$FirstQuietS = 120, [int]$QuietS = 20, [switch]$DryRun)
$s4a = $PSScriptRoot
$worktree = (Resolve-Path (Join-Path $s4a '..\..\..\..')).Path
$null = New-Item -ItemType Directory (Join-Path $s4a 'out') -Force
$log = Join-Path $s4a ("out\batch_{0}{1}_{2:yyyyMMdd_HHmm}.log" -f $Name, $(if ($DryRun) { '_dry' } else { '' }), (Get-Date))
function Say([string]$m) { $l = "$(Get-Date -Format HH:mm:ss) $m"; $l | Out-File -Append -Encoding utf8 $log; $l }
$first = $true
foreach ($r in $Runs) {
  $runArgs = @($r -split '\s+' | Where-Object { $_ })
  $q = if ($first) { $FirstQuietS } else { $QuietS }
  $first = $false
  $global:LASTEXITCODE = 0
  if ($DryRun) {
    Say "dry run: $($runArgs -join ' ')"
    Push-Location $worktree
    try {
      $o = @(& node (Join-Path $s4a 'phone_time.mjs') --dry @runArgs *>&1)
      $code = $LASTEXITCODE
    } finally { Pop-Location }
  } else {
    Say "run (ready check: no touch for $q s): $($runArgs -join ' ')"
    try {
      $o = @(& (Join-Path $s4a 'run_phone.ps1') -RunArgs $runArgs -MaxWaitMin $MaxWaitMin -QuietS $q *>&1)
      $code = $LASTEXITCODE
    } catch { $o = @("threw: $($_.Exception.Message)"); $code = 12 }
  }
  $o | Where-Object { "$_" -notmatch 'inlineDynamicImports' -and "$_".Trim() } | Select-Object -Last 10 | ForEach-Object { Say "  $_" }
  if ($code -ne 0) { Say "STOP: exit $code"; exit 11 }
}
Say "$Name done$(if ($DryRun) { ' (dry run)' })"
exit 0
