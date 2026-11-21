# K1482 s40 (diffseq39.ps1 on out/s40): diff capseq37's captures (../out/s39/<Sub>/<tag>/<maze>[_off]) with s33's diff33.py, the start commit
# (tags m, m2) against the candidate (c, c2), per maze and per shot (gf_b2 = the still border shot, gf = as loaded,
# gf_fill = the fill look, when captured):
#   m vs c   (floor m vs m2)  -> every changed place with its site and px count, and the top-places sheet
#   m2 vs c2 (floor m2 vs m)  -> the same change on the repeat loads
#   c vs c2                   -> the candidate against itself (its "today vs new" line is the candidate's floor)
# Before the diffs it prints each load's log tail (hash, passes, lost) and view record, so a load with another view,
# hash or passes 0 is seen before its numbers are read. With only m and c captured it diffs m vs c with no floor.
# Whole output to <Out>/diffseq_<maze>.txt.
#   pwsh diffseq37.ps1 -Mazes A_3,A_5 [-Sub raw] [-Step 1] [-Top 12]
param([string[]]$Mazes, [string]$Sub = "raw", [int]$Step = 1, [int]$Top = 40)
$Mazes = @($Mazes | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$here = $PSScriptRoot
$rawDir = Join-Path $here "../out/s40/$Sub"
$outDir = Join-Path $here "../out/s40/diff_$Sub"
New-Item -ItemType Directory $outDir -Force | Out-Null
$d33 = Join-Path $here ../s33/diff33.py
foreach ($mz in $Mazes) {
  $log = Join-Path $outDir "diffseq_$mz.txt"
  "diffseq37 $mz $(Get-Date -Format s) step $Step" | Set-Content $log -Encoding utf8
  foreach ($v in "", "_off") {
    $any = Test-Path (Join-Path $rawDir "m/$mz$v/gf_b2.png")
    if (-not $any) { continue }
    foreach ($tg in "m", "c", "m2", "c2") {
      $dd = Join-Path $rawDir "$tg/$mz$v"
      if (-not (Test-Path $dd)) { continue }
      $shot = Join-Path $dd cap_shot.log
      $tail = if (Test-Path $shot) { (Get-Content $shot | Where-Object { $_ -match 'gf: hash|TIMEOUT' } | Select-Object -Last 1) } else { "" }
      $hash = if ($tail -match 'hash (\w+), lost (\d+)') { "hash $($Matches[1]) lost $($Matches[2])" } else { "NO gf LINE" }
      $pass = if ($tail -match '"passes":(\d+)') { "passes $($Matches[1])" } else { "passes ?" }
      $chars = if ($tail -match '"chars":(\d+)') { "src chars $($Matches[1])" } else { "" }
      $vw = Join-Path $dd gf_b2view.txt
      $view = if (Test-Path $vw) { (Get-Content $vw | Where-Object { $_ -match '^\d' } | Select-Object -Last 1) } else { "no view" }
      "load $tg/$mz${v}: $hash $pass $chars view $view" | Tee-Object -Append $log
    }
    foreach ($img in "gf_b2", "gf", "gf_fill") {
      $f = "$img.png"
      $sites = Join-Path $rawDir "m/$mz$v/sites_gf.json"
      foreach ($p in @(@("m", "c", "m2"), @("m2", "c2", "m"), @("c", "c2", "-"))) {
        $a = Join-Path $rawDir "$($p[0])/$mz$v/$f"; $b = Join-Path $rawDir "$($p[1])/$mz$v/$f"; $a2 = Join-Path $rawDir "$($p[2])/$mz$v/$f"
        if (-not ((Test-Path $a) -and (Test-Path $b))) { continue }
        if ($p[2] -eq "-" -or -not (Test-Path $a2)) { $a2 = "-" }
        "== $mz$v $img $($p[0]) vs $($p[1]) (floor $($p[0]) vs $($p[2]))" | Tee-Object -Append $log
        python $d33 $a $b $sites (Join-Path $outDir "$mz${v}_${img}_$($p[0])$($p[1])") $a2 $Step $Top 2>&1 | Tee-Object -Append $log
      }
    }
  }
}
"DIFFDONE $(Get-Date -Format HH:mm:ss)"
exit 0


