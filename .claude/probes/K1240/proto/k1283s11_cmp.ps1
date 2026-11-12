# K1283 s11: two k1279 census JSONs compared per crossing: totals, per scene deltas, the crossings
# worse or better by more than 12 px, and the four spots x77, x304, x134 (muse_hash) by name.
#   pwsh .claude/probes/K1240/proto/k1283s11_cmp.ps1 <beforeTag> <afterTag>
param([string]$Before, [string]$After)
$d = Join-Path $PSScriptRoot "..\out\k1279"
$A = (Get-Content (Join-Path $d "census_$Before.json") -Raw | ConvertFrom-Json).rows
$B = (Get-Content (Join-Path $d "census_$After.json") -Raw | ConvertFrom-Json).rows
$m = @{}; foreach ($e in $A) { $m["$($e.scene)|$($e.xi)"] = $e }
$ta = ($A | Measure-Object total -Sum).Sum; $tb = ($B | Measure-Object total -Sum).Sum
"total $Before {0:N1} -> $After {1:N1}" -f $ta, $tb
$w = foreach ($e in $B) { $o = $m["$($e.scene)|$($e.xi)"]; [pscustomobject]@{ s = $e.scene; k = "$($e.scene) x$($e.xi)"; o = $o.total; n = $e.total; d = $e.total - $o.total } }
$w | Group-Object s | ForEach-Object { $g = $_.Group; "  {0}: {1:N1} -> {2:N1}" -f $_.Name, ($g | Measure-Object o -Sum).Sum, ($g | Measure-Object n -Sum).Sum }
$wo = @($w | Where-Object { $_.d -gt 12 } | Sort-Object d -Descending)
$be = @($w | Where-Object { $_.d -lt -12 } | Sort-Object d)
"worse > 12: $($wo.Count); better > 12: $($be.Count)"
$wo | Select-Object -First 8 | ForEach-Object { "  worse $($_.k) $($_.o) -> $($_.n)" }
$be | Select-Object -First 6 | ForEach-Object { "  better $($_.k) $($_.o) -> $($_.n)" }
foreach ($x in 77, 304, 134) { $r = $w | Where-Object { $_.k -eq "muse_hash x$x" }; "  spot $($r.k) $($r.o) -> $($r.n)" }
