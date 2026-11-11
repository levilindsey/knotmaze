param([string]$A, [string]$B)
$a = (Get-Content $A -Raw | ConvertFrom-Json).rows; $b = (Get-Content $B -Raw | ConvertFrom-Json).rows
$m = @{}; foreach ($r in $a) { $m["$($r.scene)|$($r.xi)"] = $r }
$d = foreach ($r in $b) { $o = $m["$($r.scene)|$($r.xi)"]; if ($o) { [pscustomobject]@{ k = "$($r.scene) x$($r.xi)"; b = $o.total; a = $r.total; d = [math]::Round($r.total - $o.total, 1) } } }
$sc = $b | Group-Object scene | ForEach-Object { $n = $_.Name; $sa = ($a | Where-Object scene -eq $n | Measure-Object total -Sum).Sum; $sb = ($_.Group | Measure-Object total -Sum).Sum; "{0} {1:N0} -> {2:N0}" -f $n, $sa, $sb }
$sc -join '; '
"worse > 12: " + (($d | Where-Object d -gt 12 | Sort-Object d -Descending | ForEach-Object { "$($_.k) $($_.b) -> $($_.a)" }) -join ', ')
"worse > 4: " + (($d | Where-Object { $_.d -gt 4 -and $_.d -le 12 } | Sort-Object d -Descending | ForEach-Object { "$($_.k) $($_.b) -> $($_.a)" }) -join ', ')
"better most: " + (($d | Sort-Object d | Select-Object -First 8 | ForEach-Object { "$($_.k) $($_.b) -> $($_.a)" }) -join ', ')
