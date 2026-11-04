# K1040 S3d step 3: the gate's phone batch. The S3c Handoff's phone commands
# (the control fit, S3c's tent, floorall) plus the new mode, through
# phone_batch.ps1 (run_phone.ps1's locks and K1142's shared ready check: no
# touch for 120 s before the first run, 20 s before each later one), stopping
# at the first non-zero exit; then the tables (out/phone_table_s3d.md).
# Usage: & .claude\probes\K1040\s3\s3d_gate.ps1 [-Mode tentv]
param([string]$Mode = 'tentv', [int]$MaxWaitMin = 15)
& (Join-Path $PSScriptRoot 'phone_batch.ps1') -Name s3d -MaxWaitMin $MaxWaitMin -Runs @(
  '--fit 411x753 --label s3dfit --b2b',
  '--fit 411x753 --label s3dtent --b2b --tent',
  "--fit 411x753 --label s3d$Mode --b2b --mode $Mode",
  '--fit 411x753 --label s3dfloorall --b2b --floor',
  # step 2's split (split.mjs s3d2 out/split_s3d2.md s3d2): the new mode's
  # vertex and raster parts and the fixed part's (upload, empty pass, D's store)
  '--fit 411x753 --label s3d2 --variants tentv,tentvdegen,tentvinv,tent,empty,emptynoup,emptyinv,uponly,floor'
) -Tables @("s3d$Mode s3dtent s3dfit s3dfloorall -Floor s3dfloorall", "s3dtent s3d$Mode s3dfit s3dfloorall -Floor s3dfloorall")
exit $LASTEXITCODE
