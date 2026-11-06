# K1218 S7: rough_s7.mjs over every stand and moment, both ways.
#   fwd: where the build is rougher than master (the brief's item 3);
#   rev: where master is rougher than the build (what the build smooths).
# Each run's lines go to out/rough/<tag>/<stand>_<png>_<fwd|rev>.txt, and
# out/rough/summary_<tag>.txt holds one line per run plus its flagged groups.
#   & .\rough_all_s7.ps1 [-Build out/b2] [-Tag b2] [-Stands cross,x4,loop]
param([string]$Build = "out/b2", [string]$Tag = "b2", [string[]]$Stands = @("cross", "x4", "loop"))
$here = $PSScriptRoot
$master = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1218/s4/out/b2"
$bdir = if ([IO.Path]::IsPathRooted($Build)) { $Build } else { Join-Path $here $Build }
$od = Join-Path $here "out/rough/$Tag"
New-Item -ItemType Directory $od -Force | Out-Null
$sum = @()
foreach ($st in $Stands) {
  foreach ($p in "np.png", "L0_t3.png", "L0_t4.png", "L0_t5.png", "L0_t6.png") {
    foreach ($dir in "fwd", "rev") {
      $a = if ($dir -eq "fwd") { "$master/$st" } else { "$bdir/$st" }
      $b = if ($dir -eq "fwd") { "$bdir/$st" } else { "$master/$st" }
      $lines = & node (Join-Path $here "rough_s7.mjs") $a $b $p 2>&1
      $f = Join-Path $od ("{0}_{1}_{2}.txt" -f $st, ($p -replace '\.png$', ''), $dir)
      $lines | Out-File -Encoding utf8 $f
      $head = "$st $p $dir :: " + (($lines | Select-Object -First 1) -replace '^.*?png: ', '')
      $sum += $head
      $sum += ($lines | Where-Object { "$_".StartsWith("*") } | ForEach-Object { "    $_" })
    }
  }
}
$sum | Out-File -Encoding utf8 (Join-Path $here "out/rough/summary_$Tag.txt")
$sum
