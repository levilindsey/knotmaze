# K1584 s3: framediff of every maze, stage 1's capture (s1/out/after/<m>) against s3's (out/<Tag>/<m>), one summary
# line each plus the boxes far from any crossing; whole output in fd_<Tag>.txt, per maze diff_<Tag>_<m>.json.
#   pwsh fdall.ps1 [-Tag s3b] [-Mazes A_3,A_4]
param([string]$Tag = 's3b', [string[]]$Mazes)
$s1 = Join-Path $PSScriptRoot '..\s1'
$log = Join-Path $PSScriptRoot "fd_$Tag.txt"
'' | Out-File -Encoding utf8 $log
$all = if ($Mazes) { $Mazes -split ',' } else { (Get-ChildItem (Join-Path $PSScriptRoot "out\$Tag") -Directory).Name }
foreach ($m in $all) {
  $b = Join-Path $s1 "out\after\$m"; $a = Join-Path $PSScriptRoot "out\$Tag\$m"
  if (-not (Test-Path (Join-Path $a 'gf_b2.png'))) { "${m}: no capture" | Tee-Object -Append $log; continue }
  python (Join-Path $s1 'framediff.py') $b $a (Join-Path $PSScriptRoot "diff_${Tag}_$m.json") 2>&1 | Tee-Object -Append $log
}
