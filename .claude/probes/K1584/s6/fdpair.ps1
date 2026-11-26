# K1584 s6: framediff of every maze, s5\out\<From>\<m> -> s6\out\<To>\<m>; fd_<To>_vs_<From>.txt and per maze json.
#   pwsh fdpair.ps1 [-From s5d] [-To s6a]
param([string]$From = 's5d', [string]$To = 's6a')
$s1 = Join-Path $PSScriptRoot '..\s1'
$log = Join-Path $PSScriptRoot "fd_${To}_vs_$From.txt"
Set-Content $log ''
foreach ($m in (Get-ChildItem (Join-Path $PSScriptRoot "out\$To") -Directory).Name) {
  $b = Join-Path $PSScriptRoot "..\s5\out\$From\$m"; $a = Join-Path $PSScriptRoot "out\$To\$m"
  if (-not (Test-Path (Join-Path $a 'gf_b2.png'))) { "${m}: no capture" | Tee-Object -Append $log; continue }
  python (Join-Path $s1 'framediff.py') $b $a (Join-Path $PSScriptRoot "diff_${To}_vs_${From}_$m.json") 2>&1 | Tee-Object -Append $log
}
