# K1451: crop squares out of PNGs and lay them in a grid, upscaled (nearest).
#   crop.ps1 -Out <png> -Scale 4 -Size 80 -Cells "<png>|<x>|<y>|<label>;..." [-PerRow 3]
# x, y = the crop's centre in device px of each source.
param([string]$Out, [int]$Scale = 4, [int]$Size = 80, [string]$Cells, [int]$PerRow = 3)
Add-Type -AssemblyName System.Drawing
$items = $Cells.Split(';') | Where-Object { $_ } | ForEach-Object { $p = $_.Split('|'); [pscustomobject]@{ f = $p[0]; x = [int]$p[1]; y = [int]$p[2]; l = $(if ($p.Count -gt 3) { $p[3] } else { '' }) } }
$cell = $Size * $Scale; $lab = 18
$cols = [Math]::Min($PerRow, $items.Count); $rows = [Math]::Ceiling($items.Count / $PerRow)
$bmp = New-Object System.Drawing.Bitmap ($cols * ($cell + 4)), ($rows * ($cell + $lab + 4))
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::FromArgb(24, 24, 28))
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$font = New-Object System.Drawing.Font 'Arial', 10
$cache = @{}
for ($i = 0; $i -lt $items.Count; $i++) {
  $it = $items[$i]
  if (-not $cache.ContainsKey($it.f)) { $cache[$it.f] = [System.Drawing.Image]::FromFile((Resolve-Path $it.f).Path) }
  $src = $cache[$it.f]
  $c = $i % $PerRow; $r = [Math]::Floor($i / $PerRow)
  $dx = $c * ($cell + 4); $dy = $r * ($cell + $lab + 4)
  $g.DrawString($it.l, $font, [System.Drawing.Brushes]::White, $dx + 2, $dy + 1)
  $sr = New-Object System.Drawing.Rectangle ($it.x - [int]($Size / 2)), ($it.y - [int]($Size / 2)), $Size, $Size
  $dr = New-Object System.Drawing.Rectangle $dx, ($dy + $lab), $cell, $cell
  $g.DrawImage($src, $dr, $sr, [System.Drawing.GraphicsUnit]::Pixel)
}
$bmp.Save([IO.Path]::GetFullPath($Out, (Get-Location).Path), [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose(); foreach ($v in $cache.Values) { $v.Dispose() }
"wrote $Out"
