# K1040 S3e step 1: the floor before building. page.ts's ideal family (a
# full-size 32-bit target cleared and stored, depth a renderbuffer invalidated;
# its parts; the clears against a DONT_CARE load and a full-screen draw) on one
# page beside S3d's controls (empty, emptynoup, floor, kick); one run through
# phone_batch.ps1 (the phone and perf locks, K1142's ready check).
# Then: node split.mjs s3e1 out/split_s3e1.md s3e1
# Usage: & .claude\probes\K1040\s3\s3e_floor.ps1
param([int]$MaxWaitMin = 15)
& (Join-Path $PSScriptRoot 'phone_batch.ps1') -Name s3e1 -MaxWaitMin $MaxWaitMin -Runs @(
  '--fit 411x753 --label s3e1 --variants ideal,idealnoinv,idealnod,ideal8,ideal32f,idealpt,idealpt32f,idealnoclr,idealfsq,empty,emptynoup,floor,kick'
)
exit $LASTEXITCODE
