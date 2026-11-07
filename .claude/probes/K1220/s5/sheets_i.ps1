# K1220 S5: sheets for each i fork (rows master, mine; zoom 4), from
# shoot.mjs's "states" shots. _A = rest, nofans, its pluck, flow a, flow b;
# _B = the trace reveal at 20/40/60/80%. Ref meta is mine's rest meta.
#   & .claude/probes/K1220/s3/sheets_i.ps1 [-Size 190] [-Zoom 4]
param([int]$Size = 190, [int]$Zoom = 4)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$cases = @(
  @("i_xh3", 0), @("i_xh2", 0),
  @("ai_xh3", 2), @("ai_xh2", 2),
  @("ia_xh3", 0), @("ia_xh2", 0),
  @("ii_xh3", 0), @("ii_xh3", 1), @("ii_xh2", 0), @("ii_xh2", 1)
)
foreach ($c in $cases) {
  $stand = $c[0]; $jn = $c[1]
  $refMeta = "out/shots/mine/$stand/meta.json"
  if (-not (Test-Path $refMeta)) { "skip ${stand}: no $refMeta"; continue }
  $rowsA = @(); $rowsB = @()
  foreach ($bl in @("base", "mine")) {
    $d0 = "out/shots/$bl/$stand"
    $rowsA += "$d0|rest.png,nofans.png,${d0}_pluck/pluck_ji$jn.png,${d0}_flow/flow_a.png,${d0}_flow/flow_b.png"
    $rowsB += "${d0}_reveal|reveal_20.png,reveal_40.png,reveal_60.png,reveal_80.png"
  }
  node sheets.mjs "out/sheets/${stand}_ji${jn}_A.png" $Size $Zoom $refMeta $jn @rowsA
  node sheets.mjs "out/sheets/${stand}_ji${jn}_B.png" $Size $Zoom $refMeta $jn @rowsB
}
