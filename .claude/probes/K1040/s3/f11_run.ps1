# K1097 F11: the Pixel's 2 ms gate for S3c's tent pass. The Handoff's phone
# commands in order (control, tent, tent lr 2, the floor), each after a
# read-only quiet wait (phone_quiet.mjs), stopping at the first non-zero exit;
# then both tables. run_phone.ps1 takes the phone and perf locks itself.
# Logs to out/f11_<stamp>.log. Usage: & .claude\probes\K1040\s3\f11_run.ps1 [-Until 11:30]
param([string]$Until = '11:30', [int]$MaxWaitMin = 30)
$s3 = $PSScriptRoot
$log = Join-Path $s3 ("out\f11_{0:yyyyMMdd_HHmm}.log" -f (Get-Date))
function Say([string]$m) { $l = "$(Get-Date -Format HH:mm:ss) $m"; $l | Out-File -Append -Encoding utf8 $log; $l }
$runs = @(
  @{ quiet = 120; args = @('--fit', '411x753', '--label', 'fit', '--b2b') },
  @{ quiet = 20; args = @('--fit', '411x753', '--label', 'tent', '--b2b', '--tent') },
  @{ quiet = 20; args = @('--fit', '411x753', '--label', 'tentlr2', '--b2b', '--tent', '--lr', '2') },
  @{ quiet = 20; args = @('--fit', '411x753', '--label', 'floorall', '--b2b', '--floor') }
)
foreach ($r in $runs) {
  Say "wait: quiet $($r.quiet) s, until $Until"
  $global:LASTEXITCODE = 0
  $q = @(node (Join-Path $s3 'phone_quiet.mjs') --quiet $r.quiet --until $Until 2>&1)
  $code = $LASTEXITCODE
  Say "quiet exit ${code}: $(($q | Select-Object -Last 2) -join ' / ')"
  if ($code -ne 0) { Say 'STOP: the phone was not quiet by the deadline'; exit 10 }
  Say "run: $($r.args -join ' ')"
  $global:LASTEXITCODE = 0
  $o = @(& (Join-Path $s3 'run_phone.ps1') -RunArgs $r.args -MaxWaitMin $MaxWaitMin *>&1)
  $code = $LASTEXITCODE
  $o | Select-Object -Last 8 | ForEach-Object { Say "  $_" }
  if ($code -ne 0) { Say "STOP: run_phone exit $code"; exit 11 }
}
Say 'tables'
$t = @(& (Join-Path $s3 'phone_table.ps1') tent fit tentlr2 floorall -Floor floorall *>&1) + @('') +
  @(& (Join-Path $s3 'phone_table.ps1') tentlr2 fit tent floorall -Floor floorall *>&1)
$t | Out-File -Encoding utf8 (Join-Path $s3 'out\phone_table_f11.md')
$t | ForEach-Object { Say "  $_" }
Say 'F11 done'
