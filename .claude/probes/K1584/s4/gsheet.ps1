# K1584 s4: crops of every box fdpair.ps1 found (s3 / From / To at each), plus extra "maze:x:y:label" places, stacked
# into sheets of up to `PerSheet` tiles.   pwsh gsheet.ps1 -From s4f -To s4g -Out sheet_s4g [-Extra "A_3:1022:277:x100",...]
param([string]$From = 's4f', [string]$To = 's4g', [string]$Out = 'sheet_s4g', [string[]]$Extra, [int]$PerSheet = 12, [int]$Half = 32, [int]$Sc = 4)
$h = $PSScriptRoot; $tiles = Join-Path $h "g_$To"; New-Item -ItemType Directory $tiles -Force | Out-Null
$todo = @()
foreach ($f in Get-ChildItem (Join-Path $h "diff_${To}_vs_${From}_*.json")) {
  $m = $f.BaseName -replace "diff_${To}_vs_${From}_", ''
  foreach ($b in (Get-Content $f -Raw | ConvertFrom-Json).boxes) { $todo += , @($m, [int]($b.x + $b.w / 2), [int]($b.y + $b.h / 2), "x$($b.cross)_$($b.site)") }
}
foreach ($e in $Extra) { $p = $e -split ':'; $todo += , @($p[0], [int]$p[1], [int]$p[2], $p[3]) }
$made = @()
foreach ($t in $todo) {
  $m = $t[0]; $png = Join-Path $tiles "$($m)_$($t[3]).png"
  python (Join-Path $h '..\s3\ctx.py') $png $t[1] $t[2] $Half $Sc - "$m $($t[3]) s3=$(Join-Path $h "..\s3\out\s3b\$m")" "$From=$(Join-Path $h "out\$From\$m")" "$To=$(Join-Path $h "out\$To\$m")" | Out-Null
  if (Test-Path $png) { $made += $png }
}
for ($i = 0; $i -lt $made.Count; $i += $PerSheet) {
  $n = [int]($i / $PerSheet) + 1
  python (Join-Path $h 'stack.py') (Join-Path $h "${Out}_$n.png") 2 @($made[$i..([Math]::Min($i + $PerSheet, $made.Count) - 1)])
  "${Out}_$n.png: $([Math]::Min($PerSheet, $made.Count - $i)) tiles"
}
