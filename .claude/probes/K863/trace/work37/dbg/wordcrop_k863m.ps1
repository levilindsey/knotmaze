# K863 J3m: a copy of work36\dbg\endcrop_k863l.ps1 (J3l's, untouched) with one switch added, -Tile: each chosen row is
# cut into consecutive windows of Width px (24 px overlap) from its leftmost to its rightmost path point over the chosen
# columns, labelled "<case> [i/n]", so a long word or phrase is seen whole at the PNG's own scale (run as below, with
# work37\dbg\wordcrop_k863m.ps1 and -Tile; 3 columns at -Width 630 make a page 1980 px wide). Without -Tile it is J3l's
# tool unchanged:
# K863 J3l: the word ends of a sheet_k863k sheet, cut from its PNG at the PNG's own scale (no resampling: view each
# page at full size). No Python (it runs beside a capped batch): the window comes from the SVG, the pixels from the PNG.
# For each row (case) it takes the rightmost path point in the row over the chosen columns, measured from each cell's
# left edge (every column of a row shares one x mapping), plus half the pen (9.2 u = 9.2 SVG px), and cuts the same
# window [right - Width, right + 16 px] from every chosen column over [YTop, YBot] fu (baseline 0, x-height 500).
# Rows go onto pages no taller than MaxH px: <Out>_1.png, _2.png, ...
# Run: pwsh -NoProfile -File work36\dbg\endcrop_k863l.ps1 -Svg <sheet.svg> -Png <sheet.png> -Out <prefix>
#      [-Cols "font,approved (v6.8),J3l"] [-Rows 1,2] [-Width 420] [-YTop 650] [-YBot -200] [-MaxH 1900] [-Left]
# -Left crops from the row's leftmost point instead (a word's start, or a short word whole when Width covers it).
param([string]$Svg, [string]$Png, [string]$Out, [string]$Cols = "all", [int[]]$Rows = @(), [int]$Width = 420,
  [double]$YTop = 650, [double]$YBot = -200, [int]$MaxH = 1900, [switch]$Left, [switch]$Tile)
Add-Type -AssemblyName System.Drawing
$S = 0.24; $YT0 = 1000.0; $YB0 = -560.0; $GAPX = 30.0; $ROWH = ($YT0 - $YB0) * $S + 24.0; $HALF = 4.6
$txt = [IO.File]::ReadAllText((Resolve-Path $Svg))
$Wsvg = [double]([regex]::Match($txt, '<svg[^>]*width="([\d.]+)"').Groups[1].Value)
$hdr = [regex]::Matches($txt, '<text x="([\d.]+)" y="96"[^>]*font-weight="bold">([^<]+)</text>')
$xs = @($hdr | ForEach-Object { [double]$_.Groups[1].Value }); $nm = @($hdr | ForEach-Object { $_.Groups[2].Value })
$cw = $xs[1] - $xs[0] - $GAPX
$ci = if ($Cols -eq "all") { 0..($nm.Count - 1) } else { @($Cols -split ',' | ForEach-Object { [array]::IndexOf($nm, $_) }) }
if ($ci -contains -1) { throw "unknown column in '$Cols' (have: $($nm -join ', '))" }
$grp = [regex]::Matches($txt, '<g id="case-(\d+)">')
$bmp = [System.Drawing.Bitmap]::FromFile((Resolve-Path $Png).Path)
$k = $bmp.Width / $Wsvg
$ri = if ($Rows.Count) { @($Rows | ForEach-Object { $_ - 1 }) } else { 0..($grp.Count - 1) }
$tiles = @()
foreach ($r in $ri) {
  $a = $grp[$r].Index; $b = if ($r + 1 -lt $grp.Count) { $grp[$r + 1].Index } else { $txt.Length }
  $body = $txt.Substring($a, $b - $a)
  $case = [regex]::Match($body, 'font-size="20" fill="#222">([^<]+)</text>').Groups[1].Value
  $edge = if ($Left) { [double]::MaxValue } else { 0.0 }
  $lo = [double]::MaxValue; $hi = 0.0
  foreach ($d in [regex]::Matches($body, ' d="([^"]+)"')) {
    foreach ($m in [regex]::Matches($d.Groups[1].Value, '(-?[\d.]+),(-?[\d.]+)')) {
      $x = [double]$m.Groups[1].Value
      foreach ($c in $ci) {
        if ($x -ge $xs[$c] -and $x -le $xs[$c] + $cw) {
          $rel = $x - $xs[$c]
          if ($Left) { if ($rel -lt $edge) { $edge = $rel } } else { if ($rel -gt $edge) { $edge = $rel } }
          if ($rel -lt $lo) { $lo = $rel }; if ($rel -gt $hi) { $hi = $rel }
        }
      }
    }
  }
  $oy = 110.0 + $r * $ROWH + $YT0 * $S
  $y0 = [int](($oy - $YTop * $S) * $k); $y1 = [int](($oy - $YBot * $S) * $k)
  if ($Tile) {
    $tL = [int](($lo - $HALF - 16) * $k); $tR = [int](($hi + $HALF + 16) * $k)
    $n = [int][Math]::Max(1, [Math]::Ceiling(($tR - $tL - 24) / [double]$Width))
    for ($t = 0; $t -lt $n; $t++) {
      $rects = foreach ($c in $ci) { New-Object System.Drawing.Rectangle(([int]($xs[$c] * $k) + $tL + $t * $Width), $y0, ($Width + 24), ($y1 - $y0)) }
      $tiles += , @("$case [$($t + 1)/$n]", @($rects))
    }
    continue
  }
  $rects = foreach ($c in $ci) {
    if ($Left) { $x0 = [int](($xs[$c] + $edge - $HALF - 16) * $k) } else { $x0 = [int](($xs[$c] + $edge + $HALF + 16) * $k) - $Width - 24 }
    New-Object System.Drawing.Rectangle($x0, $y0, ($Width + 24), ($y1 - $y0))
  }
  $tiles += , @($case, @($rects))
}
$tw = $Width + 24; $th = $tiles[0][1][0].Height
$per = [Math]::Max(1, [Math]::Floor(($MaxH - 24) / ($th + 18)))
$font = New-Object System.Drawing.Font("Arial", 9); $ink = [System.Drawing.Brushes]::Black; $grey = [System.Drawing.Brushes]::DimGray
$pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(221, 221, 221))
for ($p = 0; $p -lt $tiles.Count; $p += $per) {
  $part = @($tiles[$p..([Math]::Min($p + $per, $tiles.Count) - 1)])
  $page = New-Object System.Drawing.Bitmap(($ci.Count * ($tw + 6)), (24 + $part.Count * ($th + 18)))
  $gfx = [System.Drawing.Graphics]::FromImage($page); $gfx.Clear([System.Drawing.Color]::White)
  $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  for ($j = 0; $j -lt $ci.Count; $j++) { $gfx.DrawString($nm[$ci[$j]], $font, $ink, ($j * ($tw + 6) + 4), 4) }
  for ($i = 0; $i -lt $part.Count; $i++) {
    $y = 24 + $i * ($th + 18)
    $gfx.DrawString($part[$i][0], $font, $grey, 4, $y)
    for ($j = 0; $j -lt $ci.Count; $j++) {
      $src = $part[$i][1][$j]
      $dst = New-Object System.Drawing.Rectangle(($j * ($tw + 6)), ($y + 14), $src.Width, $src.Height)
      $gfx.DrawImage($bmp, $dst, $src, [System.Drawing.GraphicsUnit]::Pixel)
      $gfx.DrawLine($pen, ($j * ($tw + 6) + $tw + 2), ($y + 14), ($j * ($tw + 6) + $tw + 2), ($y + 14 + $th))
    }
  }
  $o = "$($Out)_$([int]($p / $per) + 1).png"
  $page.Save((Join-Path $PWD $o), [System.Drawing.Imaging.ImageFormat]::Png); $gfx.Dispose()
  "$o $($page.Width)x$($page.Height) rows $(@($part | ForEach-Object { $_[0] }) -join ',')"
  $page.Dispose()
}
$bmp.Dispose()
