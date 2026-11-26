# K1584 s4: framediff of every maze between two s4 captures (out/<From>/<m> -> out/<To>/<m>); output fd_<To>_vs_<From>.txt,
# per maze diff_<To>_vs_<From>_<m>.json.   pwsh fdpair.ps1 -From s4f -To s4g [-Mazes A_3,A_4]
param([string]$From = 's4f', [string]$To = 's4g', [string[]]$Mazes)
$s1 = Join-Path $PSScriptRoot '..\s1'
$log = Join-Path $PSScriptRoot "fd_${To}_vs_$From.txt"
Remove-Item $log -ErrorAction SilentlyContinue
$all = if ($Mazes) { $Mazes -split ',' } else { (Get-ChildItem (Join-Path $PSScriptRoot "out\$To") -Directory).Name }
foreach ($m in $all) {
  $b = Join-Path $PSScriptRoot "out\$From\$m"; $a = Join-Path $PSScriptRoot "out\$To\$m"
  if (-not (Test-Path (Join-Path $a 'gf_b2.png'))) { "${m}: no capture" | Tee-Object -Append $log; continue }
  python (Join-Path $s1 'framediff.py') $b $a (Join-Path $PSScriptRoot "diff_${To}_vs_${From}_$m.json") 2>&1 | Tee-Object -Append $log
}
