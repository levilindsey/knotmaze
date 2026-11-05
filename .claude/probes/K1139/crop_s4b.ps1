# K1139 S4b: crops of sheets_cyc.mjs's sheets (S4 top, S4b below) at 3x,
# nearest neighbour (System.Drawing). The moments sheet: the box where the
# two rows differ (+ margin) in each of the four moments, both rows; with
# no difference, the box given by -Box x,y,w,h (cell px). The kymograph:
# the columns where the rows differ (+ margin), or the arm's two end
# stretches (-EndCols px each) when they do not.
#   pwsh crop_s4b.ps1 -Sheets out/s4b/sheets -Out out/s4b/crops -Stand cyc_e210
param(
  [string]$Sheets = "out/s4b/sheets",
  [string]$Out = "out/s4b/crops",
  [string]$Stand = "cyc_e210",
  [int]$Scale = 3,
  [int]$Margin = 14,
  [int]$EndCols = 70,
  [string]$Box = ""
)
Add-Type -AssemblyName System.Drawing
$here = $PSScriptRoot
$sd = Join-Path $here $Sheets
$od = Join-Path $here $Out
New-Item -ItemType Directory $od -Force | Out-Null
$G = 6

function Px([System.Drawing.Bitmap]$b, [int]$x, [int]$y) { $c = $b.GetPixel($x, $y); return ($c.R -shl 16) -bor ($c.G -shl 8) -bor $c.B }

function Save-Grid($cells, [int]$cols, [string]$file) {
  # cells: list of @{ bmp; rect } crops, row-major
  # [int] casts: a (double, double) pair binds Bitmap(string, bool). And
  # no $g here: PowerShell names are case-blind, so it would be $G.
  $cw = [int](($cells | ForEach-Object { $_.rect.Width } | Measure-Object -Maximum).Maximum * $Scale)
  $ch = [int](($cells | ForEach-Object { $_.rect.Height } | Measure-Object -Maximum).Maximum * $Scale)
  $rows = [int][Math]::Ceiling($cells.Count / $cols)
  $W = [int]($cols * $cw + ($cols + 1) * $G); $H = [int]($rows * $ch + ($rows + 1) * $G)
  $out = New-Object System.Drawing.Bitmap ([int]$W), ([int]$H)
  $gr = [System.Drawing.Graphics]::FromImage($out)
  $gr.Clear([System.Drawing.Color]::FromArgb(40, 40, 40))
  $gr.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
  $gr.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
  for ($i = 0; $i -lt $cells.Count; $i++) {
    $c = $cells[$i]
    $dx = [int]($G + ($i % $cols) * ($cw + $G)); $dy = [int]($G + [Math]::Floor($i / $cols) * ($ch + $G))
    $dst = New-Object System.Drawing.Rectangle $dx, $dy, ([int]($c.rect.Width * $Scale)), ([int]($c.rect.Height * $Scale))
    $gr.DrawImage($c.bmp, $dst, $c.rect, [System.Drawing.GraphicsUnit]::Pixel)
  }
  $gr.Dispose()
  $p = Join-Path $od $file
  $out.Save($p, [System.Drawing.Imaging.ImageFormat]::Png); $out.Dispose()
  "$p : ${W}x${H}"
}

# Moments: 4 columns x 2 rows of equal cells.
$m = [System.Drawing.Bitmap]::FromFile((Join-Path $sd "${Stand}_moments.png"))
$cellW = [int](($m.Width - 5 * $G) / 4); $cellH = [int](($m.Height - 3 * $G) / 2)
$x0 = [int]::MaxValue; $y0 = [int]::MaxValue; $x1 = -1; $y1 = -1; $nd = 0
for ($k = 0; $k -lt 4; $k++) {
  $ax = $G + $k * ($cellW + $G); $ay = $G; $by = $G + $cellH + $G
  for ($y = 0; $y -lt $cellH; $y += 1) {
    for ($x = 0; $x -lt $cellW; $x += 1) {
      if ((Px $m ($ax + $x) ($ay + $y)) -ne (Px $m ($ax + $x) ($by + $y))) {
        $nd++
        if ($x -lt $x0) { $x0 = $x }; if ($y -lt $y0) { $y0 = $y }; if ($x -gt $x1) { $x1 = $x }; if ($y -gt $y1) { $y1 = $y }
      }
    }
  }
}
"${Stand} moments: cell ${cellW}x${cellH}, $nd px differ (sheet px, 4 moments)"
if ($nd -gt 0) {
  $x0 = [Math]::Max(0, $x0 - $Margin); $y0 = [Math]::Max(0, $y0 - $Margin)
  $x1 = [Math]::Min($cellW - 1, $x1 + $Margin); $y1 = [Math]::Min($cellH - 1, $y1 + $Margin)
} elseif ($Box) {
  $b = $Box.Split(",") | ForEach-Object { [int]$_ }
  $x0 = $b[0]; $y0 = $b[1]; $x1 = $b[0] + $b[2] - 1; $y1 = $b[1] + $b[3] - 1
} else { $x0 = $null }
if ($null -ne $x0) {
  "  box x $x0..$x1 y $y0..$y1"
  $cells = @()
  foreach ($row in 0, 1) {
    for ($k = 0; $k -lt 4; $k++) {
      $ax = $G + $k * ($cellW + $G); $ay = $G + $row * ($cellH + $G)
      $cells += @{ bmp = $m; rect = (New-Object System.Drawing.Rectangle ($ax + $x0), ($ay + $y0), ($x1 - $x0 + 1), ($y1 - $y0 + 1)) }
    }
  }
  Save-Grid $cells 4 "${Stand}_moments_seam_x$Scale.png"
}

# Kymograph: 1 column x 2 rows.
$q = [System.Drawing.Bitmap]::FromFile((Join-Path $sd "${Stand}_kymo.png"))
$kW = $q.Width - 2 * $G; $kH = [int](($q.Height - 3 * $G) / 2)
$c0 = [int]::MaxValue; $c1 = -1; $kd = 0
for ($y = 0; $y -lt $kH; $y++) {
  for ($x = 0; $x -lt $kW; $x++) {
    if ((Px $q ($G + $x) ($G + $y)) -ne (Px $q ($G + $x) ($G + $kH + $G + $y))) { $kd++; if ($x -lt $c0) { $c0 = $x }; if ($x -gt $c1) { $c1 = $x } }
  }
}
"${Stand} kymo: ${kW}x${kH} per row, $kd px differ, columns $c0..$c1"
$spans = @()
if ($kd -gt 0) { $spans += , @([Math]::Max(0, $c0 - $Margin), [Math]::Min($kW - 1, $c1 + $Margin)) }
else { $spans += , @(0, ($EndCols - 1)); $spans += , @(($kW - $EndCols), ($kW - 1)) }  # (a - b): "," binds tighter than "-"
$si = 0
foreach ($s in $spans) {
  $cells = @()
  foreach ($row in 0, 1) {
    $cells += @{ bmp = $q; rect = (New-Object System.Drawing.Rectangle ($G + $s[0]), ($G + $row * ($kH + $G)), ($s[1] - $s[0] + 1), $kH) }
  }
  Save-Grid $cells 2 "${Stand}_kymo_cols$($s[0])-$($s[1])_x$Scale.png"
  $si++
}
$m.Dispose(); $q.Dispose()
