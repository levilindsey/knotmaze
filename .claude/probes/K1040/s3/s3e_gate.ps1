# K1040 S3e step 3: the gate's phone batch, through phone_batch.ps1 (the phone
# and perf locks, K1142's ready check), stopping at the first non-zero exit.
# First the lean empty pass beside the ideal floor on one page (split.mjs
# s3e3, the gate's first condition), then tentv with the lean fixed part
# (moving: every used row uploaded each frame) and floorall (the label cost
# per scene), then the controls: tentv, fit, and lean at rest (the row diff).
# Then:
#   node split.mjs s3e3 out/split_s3e3.md s3e3
# The gate's first condition is split_s3e3.md's "leanempty - ideal" column (the
# floor cancels: both on one page); "save" and "ns - ideal" give draw()'s GL
# state save and restore and the lean empty pass without it. The label cost
# per scene against the 2 ms gate is out/phone_table_s3e.md's s3eleantentv
# column.
# Usage: & .claude\probes\K1040\s3\s3e_gate.ps1
param([int]$MaxWaitMin = 15)
& (Join-Path $PSScriptRoot 'phone_batch.ps1') -Name s3e -MaxWaitMin $MaxWaitMin -Runs @(
  '--fit 411x753 --label s3e3 --variants ideal,ideal32f,leanempty,leanemptynoup,leanemptyns,leanemptynoupns,leantentv,leantentvrest,leantentvst,leanempty24,leantentv24,empty,tentv,floor',
  '--fit 411x753 --label s3eleantentv --b2b --mode tentv --lean',
  '--fit 411x753 --label s3efloorall --b2b --floor',
  '--fit 411x753 --label s3etentv --b2b --mode tentv',
  '--fit 411x753 --label s3efit --b2b',
  '--fit 411x753 --label s3eleanrest --b2b --mode tentv --lean --rest'
) -Tables @('s3eleantentv s3etentv s3eleanrest s3efit s3efloorall -Floor s3efloorall')
exit $LASTEXITCODE
