# K1097 F11: the Pixel's 2 ms gate for S3c's tent pass. The Handoff's phone
# commands in order (control, tent, tent lr 2, the floor), through
# phone_batch.ps1 (run_phone.ps1's locks and K1142's shared ready check: no
# touch for 120 s before the first run, 20 s before each later one), stopping
# at the first non-zero exit; then both tables (out/phone_table_f11.md).
# K1040 S3d: rewritten for K1142 (phone_quiet.mjs and its -Until are gone).
# Usage: & .claude\probes\K1040\s3\f11_run.ps1
param([int]$MaxWaitMin = 5)
& (Join-Path $PSScriptRoot 'phone_batch.ps1') -Name f11 -MaxWaitMin $MaxWaitMin -Runs @(
  '--fit 411x753 --label fit --b2b',
  '--fit 411x753 --label tent --b2b --tent',
  '--fit 411x753 --label tentlr2 --b2b --tent --lr 2',
  '--fit 411x753 --label floorall --b2b --floor'
) -Tables @('tent fit tentlr2 floorall -Floor floorall', 'tentlr2 fit tent floorall -Floor floorall')
exit $LASTEXITCODE
