# K1482 s34b: diff capseq34's captures of link A (raw/<tag>_on, raw/<tag>_off) with s33's diff33.py, master (m, m2)
# against mine (c, c2), per shot (gf = as loaded, gf_b2 = the still border shot, gf_fill = the fill look):
#   m vs c   (floor m vs m2)  -> every changed place with its site and px count, and the top-places sheet
#   m2 vs c2 (floor m2 vs m)  -> the same change on the repeat loads
#   c vs c2                   -> mine against mine again (its "today vs new" line is my build's floor)
# Whole output to ../out/s34/diff/diffseq.txt (and the console).
#   pwsh diffseq34.ps1 [-Raw <dir>] [-Out <dir>]
param([string]$Raw = "", [string]$Out = "")
$here = $PSScriptRoot
if (-not $Raw) { $Raw = Join-Path $here ../out/s34/raw }
if (-not $Out) { $Out = Join-Path $here ../out/s34/diff }
New-Item -ItemType Directory $Out -Force | Out-Null
$d33 = Join-Path $here ../s33/diff33.py
$log = Join-Path $Out diffseq.txt
"diffseq34 $(Get-Date -Format s) raw $Raw" | Set-Content $log -Encoding utf8
foreach ($v in "on", "off") {
  foreach ($img in "gf", "gf_b2", "gf_fill") {
    $f = "$img.png"
    $sites = Join-Path $Raw "m_$v/sites_gf.json"
    foreach ($p in @(@("m", "c", "m2"), @("m2", "c2", "m"), @("c", "c2", "-"))) {
      $a = Join-Path $Raw "$($p[0])_$v/$f"; $b = Join-Path $Raw "$($p[1])_$v/$f"; $a2 = Join-Path $Raw "$($p[2])_$v/$f"
      if (-not ((Test-Path $a) -and (Test-Path $b))) { "== $v $img $($p[0]) vs $($p[1]): missing" | Tee-Object -Append $log; continue }
      if ($p[2] -eq "-" -or -not (Test-Path $a2)) { $a2 = "-" }
      "== $v $img $($p[0]) vs $($p[1]) (floor $($p[0]) vs $($p[2]))" | Tee-Object -Append $log
      python $d33 $a $b $sites (Join-Path $Out "${v}_${img}_$($p[0])$($p[1])") $a2 1 12 2>&1 | Tee-Object -Append $log
    }
  }
}
"DIFFDONE $(Get-Date -Format HH:mm:ss)" | Tee-Object -Append $log
