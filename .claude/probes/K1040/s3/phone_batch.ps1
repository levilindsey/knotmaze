# K1040 S3d: a batch of phone_time.mjs runs, in order, each through
# run_phone.ps1 (the phone and perf locks, and K1142's shared ready check
# with both held: no touch for 120 s before the first run and 20 s before
# each later one). Stops at the first non-zero exit. Then the tables:
# each -Tables entry is one phone_table.ps1 argument line, and the tables go
# to out/phone_table_<Name>.md. Logs to out/batch_<Name>_<stamp>.log.
# Usage: & .claude\probes\K1040\s3\phone_batch.ps1 -Name f11 -Runs @('--fit 411x753 --label fit --b2b', ...) [-Tables @('tent fit floorall -Floor floorall')]
param([Parameter(Mandatory)][string]$Name, [Parameter(Mandatory)][string[]]$Runs, [string[]]$Tables = @(), [int]$MaxWaitMin = 15, [int]$FirstQuietS = 120, [int]$QuietS = 20)
$s3 = $PSScriptRoot
$log = Join-Path $s3 ("out\batch_{0}_{1:yyyyMMdd_HHmm}.log" -f $Name, (Get-Date))
function Say([string]$m) { $l = "$(Get-Date -Format HH:mm:ss) $m"; $l | Out-File -Append -Encoding utf8 $log; $l }
$first = $true
foreach ($r in $Runs) {
  $runArgs = @($r -split '\s+' | Where-Object { $_ })
  $q = if ($first) { $FirstQuietS } else { $QuietS }
  $first = $false
  Say "run (ready check: no touch for $q s): $($runArgs -join ' ')"
  $global:LASTEXITCODE = 0
  # A throw in run_phone.ps1 (its lock waits: "perf lock still held") is a
  # stop too, logged; uncaught it ended the batch with no STOP line (S3d).
  try {
    $o = @(& (Join-Path $s3 'run_phone.ps1') -RunArgs $runArgs -MaxWaitMin $MaxWaitMin -QuietS $q *>&1)
    $code = $LASTEXITCODE
  } catch { $o = @("threw: $($_.Exception.Message)"); $code = 12 }
  $o | Select-Object -Last 10 | ForEach-Object { Say "  $_" }
  if ($code -ne 0) { Say "STOP: run_phone exit $code"; exit 11 }
}
if ($Tables.Count) {
  Say 'tables'
  $t = @()
  foreach ($line in $Tables) {
    $targs = @($line -split '\s+' | Where-Object { $_ })
    # An array splat binds no "-Floor" (or "-Upload", S3f): take them out by hand.
    $pos = @(); $fl = ''; $upl = $false
    for ($i = 0; $i -lt $targs.Count; $i++) { if ($targs[$i] -eq '-Floor') { $fl = $targs[++$i] } elseif ($targs[$i] -eq '-Upload') { $upl = $true } else { $pos += $targs[$i] } }
    $t += @(& (Join-Path $s3 'phone_table.ps1') @pos -Floor $fl -Upload:$upl *>&1) + @('')
  }
  $t | Out-File -Encoding utf8 (Join-Path $s3 "out\phone_table_$Name.md")
  $t | ForEach-Object { Say "  $_" }
}
Say "$Name done"
