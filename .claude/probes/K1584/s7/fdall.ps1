# K1584 s7: framediff of every maze, s6\out\s6a\<m> -> s7\out\<To>\<m> (luminance step -Thr, default 6, and a second
# pass at 1 for pixel identity): out\fd_<To>.txt and out\fd\<m>_t<thr>.json.   pwsh fdall.ps1 [-To s7a]
param([string]$To = 's7a')
$s1 = Join-Path $PSScriptRoot '..\s1'; $o = Join-Path $PSScriptRoot 'out'
New-Item -ItemType Directory "$o\fd" -Force | Out-Null
$log = Join-Path $o "fd_$To.txt"; Set-Content $log ''
foreach ($m in (Get-ChildItem (Join-Path $o $To) -Directory).Name) {
  $b = Join-Path $PSScriptRoot "..\s6\out\s6a\$m"; $a = Join-Path $o "$To\$m"
  if (-not (Test-Path (Join-Path $a 'gf_b2.png'))) { "${m}: no capture" | Tee-Object -Append $log; continue }
  foreach ($thr in 6, 1) { python (Join-Path $s1 'framediff.py') $b $a "$o\fd\${m}_t$thr.json" $thr 2>&1 | ForEach-Object { "$m t$thr $_" } | Tee-Object -Append $log | Select-Object -First 2 }
}
