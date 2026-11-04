# K1040 S3d: the fixed part against one GPU round trip. Variant kick clears a
# 1x1 R32UI + DEPTH32F target and reads it back (a submit and its wait, no
# store to speak of), on one page with the empty pass (emptynoup, empty) and
# the vertex-light tent; one run through phone_batch.ps1 (the phone and perf
# locks, K1142's ready check). Then: node split.mjs s3d3 out/split_s3d3.md s3d3
# Usage: & .claude\probes\K1040\s3\s3d_kick.ps1
param([int]$MaxWaitMin = 15)
& (Join-Path $PSScriptRoot 'phone_batch.ps1') -Name s3dk -MaxWaitMin $MaxWaitMin -Runs @(
  '--fit 411x753 --label s3d3 --variants kick,emptynoup,empty,tentv,floor'
)
exit $LASTEXITCODE
