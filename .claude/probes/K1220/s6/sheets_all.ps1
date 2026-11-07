# K1220 S6: every fork sheet from shoot.mjs's shots (rows master, mine; zoom 4).
#   & .claude/probes/K1220/s3/sheets_all.ps1 [-Size 190] [-Zoom 4] [-Words a,ai]
# For "a" and "ai" (the states set): <stand>_ji<n>_A.png = rest, nofans, the
# fork's pluck, flow a, flow b; <stand>_ji<n>_B.png = the reveal at 20/40/60/80%.
# For "i", "ia", "aa", "ii" (the rest set): <stand>_ji<n>_R.png = rest, nofans.
# Writes out/sheets/; the ref meta is mine's rest meta (the forks' ji).
param([int]$Size = 190, [int]$Zoom = 4, [string[]]$Words = @("a", "ai", "i", "ia", "aa", "ii"))
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$forksOf = @{ "a" = @(0, 1); "ai" = @(0, 1, 2); "i" = @(0); "ia" = @(0, 1, 2); "aa" = @(0, 1, 2, 3); "ii" = @(0, 1) }
foreach ($wd in $Words) {
  foreach ($xhId in @("xh3", "xh2")) {
    $stand = "${wd}_$xhId"
    $refMeta = "out/shots/mine/$stand/meta.json"
    if (-not (Test-Path $refMeta)) { "skip ${stand}: no $refMeta"; continue }
    foreach ($jn in $forksOf[$wd]) {
      $rowsA = @(); $rowsB = @()
      foreach ($bl in @("master", "mine")) {
        $d0 = "out/shots/$bl/$stand"
        if ($wd -eq "a" -or $wd -eq "ai") {
          $rowsA += "$d0|rest.png,nofans.png,$d0`_pluck/pluck_ji$jn.png,$d0`_flow/flow_a.png,$d0`_flow/flow_b.png"
          $rowsB += "$d0`_reveal|reveal_20.png,reveal_40.png,reveal_60.png,reveal_80.png"
        } else {
          $rowsA += "$d0|rest.png,nofans.png"
        }
      }
      if ($wd -eq "a" -or $wd -eq "ai") {
        node sheets.mjs "out/sheets/${stand}_ji${jn}_A.png" $Size $Zoom $refMeta $jn @rowsA
        node sheets.mjs "out/sheets/${stand}_ji${jn}_B.png" $Size $Zoom $refMeta $jn @rowsB
      } else {
        node sheets.mjs "out/sheets/${stand}_ji${jn}_R.png" $Size $Zoom $refMeta $jn @rowsA
      }
    }
  }
}
