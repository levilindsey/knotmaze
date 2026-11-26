# K1584 s4: framediff of every maze, stage 3's capture (s3/out/s3b/<m>) against s4's (out/<Tag>/<m>, default s4f, the
# final); output fd_<Tag>.txt, per maze diff_<Tag>_<m>.json.   pwsh fdall4.ps1 [-Tag s4f] [-Mazes A_3,A_4]
param([string[]]$Mazes, [string]$Tag = 's4f')
$s1 = Join-Path $PSScriptRoot '..\s1'; $s3 = Join-Path $PSScriptRoot '..\s3'
$log = Join-Path $PSScriptRoot "fd_$Tag.txt"
$all = if ($Mazes) { $Mazes -split ',' } else { (Get-ChildItem (Join-Path $PSScriptRoot "out\$Tag") -Directory).Name }
foreach ($m in $all) {
  $b = Join-Path $s3 "out\s3b\$m"; $a = Join-Path $PSScriptRoot "out\$Tag\$m"
  if (-not (Test-Path (Join-Path $a 'gf_b2.png'))) { "${m}: no capture" | Tee-Object -Append $log; continue }
  python (Join-Path $s1 'framediff.py') $b $a (Join-Path $PSScriptRoot "diff_${Tag}_$m.json") 2>&1 | Tee-Object -Append $log
}
