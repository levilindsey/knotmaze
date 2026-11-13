# K1325 s1: a census against a baseline, find by find (the brief's Done check).
#   pwsh .claude/probes/K1325/k1325_compare.ps1 [-Base s9] [-Tag k1325s1]
# Counts per kind for both, then every counted find (stray_ink, hard_edge, paper, broken_ink, k1049) matched by
# scene, kind and junction (near), place within 0.05 world and size (sizePx) within 2 px; prints the unmatched on
# each side and the matched ones whose pixel count (px) moved.
param([string]$Base = 's9', [string]$Tag = 'k1325s1')
$dir = Join-Path $PSScriptRoot '../K1314/out/s1'
$kinds = 'stray_ink', 'hard_edge', 'paper', 'broken_ink', 'k1049'
$A = (Get-Content (Join-Path $dir "census_$Base.json") -Raw | ConvertFrom-Json).arts
$B = (Get-Content (Join-Path $dir "census_$Tag.json") -Raw | ConvertFrom-Json).arts
foreach ($k in $kinds + 'owner_only', 'tail_look') { '{0,-11} {1,5} -> {2,5}' -f $k, @($A | Where-Object kind -EQ $k).Count, @($B | Where-Object kind -EQ $k).Count }
$a = @($A | Where-Object { $_.kind -in $kinds }); $b = [System.Collections.ArrayList]@($B | Where-Object { $_.kind -in $kinds })
$moved = @(); $gone = @()
foreach ($f in $a) {
  $m = $b | Where-Object { $_.scene -eq $f.scene -and $_.kind -eq $f.kind -and $_.near -eq $f.near -and [math]::Abs($_.x - $f.x) -le 0.05 -and [math]::Abs($_.y - $f.y) -le 0.05 -and [math]::Abs($_.sizePx - $f.sizePx) -le 2 } | Select-Object -First 1
  if ($m) { $b.Remove($m); if ($m.px -ne $f.px) { $moved += "$($f.scene) $($f.kind) $($f.near) ($($f.x), $($f.y)) px $($f.px) -> $($m.px)" } } else { $gone += $f }
}
"only in ${Base}: " + (($gone | ForEach-Object { "$($_.scene) $($_.kind) $($_.near) ($($_.x), $($_.y)) $($_.px) px size $($_.sizePx)" }) -join '; ')
"only in ${Tag}: " + (($b | ForEach-Object { "$($_.scene) $($_.kind) $($_.near) ($($_.x), $($_.y)) $($_.px) px size $($_.sizePx)" }) -join '; ')
"matched with px moved: " + ($moved -join '; ')
