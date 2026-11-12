# K1314 s1: crop sheets from a k1314_crops.ts output directory.
#   pwsh .claude/probes/K1314/k1314_sheet.ps1 -Crops <dir with manifest.json> [-Census <census_<tag>.txt>] [-Per 18] [-Cols 3]
# Writes <dir>/sheets/000_totals.png (the census table, the legend) then <kind>_<pp>.png:
# numbered rows "form B | today | rp=outline", the artifact ringed in red, grouped by kind.
param([Parameter(Mandatory)][string]$Crops, [string]$Census = '', [int]$Per = 18, [int]$Cols = 3)
Add-Type -AssemblyName System.Drawing
$man = Get-Content (Join-Path $Crops 'manifest.json') -Raw | ConvertFrom-Json
$out = Join-Path $Crops 'sheets'; New-Item -ItemType Directory $out -Force | Out-Null
Get-ChildItem $out -Filter *.png | Remove-Item -Confirm:$false
$fB = New-Object System.Drawing.Font 'Segoe UI', 14, ([System.Drawing.FontStyle]::Bold)
$fS = New-Object System.Drawing.Font 'Segoe UI', 10
$fM = New-Object System.Drawing.Font 'Consolas', 12
$blk = [System.Drawing.Brushes]::Black
$pad = 12; $lab = 34; $gap = 10

# First sheet: totals.
$lines = @('K1314 s1 census: rp=outline at rest vs form B (the approved look), 12 seam-test scenes', '')
if ($Census -and (Test-Path $Census)) { $lines += Get-Content $Census }
$lines += @('', 'Each crop row: form B (approved; app section paint, black ink) | today (master.png) | rp=outline (src at this commit, CPU twin).',
  'The red ring marks the artifact. Kinds: stray_ink, paper (hole/notch/covered eye K1045), broken_ink (faded/missing),',
  'hard_edge (visible colour step), k1049 (sharp inner corner where Levi chose rounded), owner_only (fill owner differs',
  'from form B but the app paint hides it: informational, not counted).')
$kinds = $man | Group-Object kind
$lines += ''; $lines += 'Sheets: ' + (($kinds | ForEach-Object { "$($_.Name) $($_.Count)" }) -join ', ')
$W = 1500; $H = 60 + 20 * $lines.Count
$bmp = New-Object System.Drawing.Bitmap $W, $H; $g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::White)
$y = $pad; foreach ($l in $lines) { $g.DrawString($l, $fM, $blk, $pad, $y); $y += 20 }
$bmp.Save((Join-Path $out '000_totals.png'), [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()

foreach ($k in $kinds) {
  $items = @($k.Group); $pages = [Math]::Ceiling($items.Count / $Per)
  for ($p = 0; $p -lt $pages; $p++) {
    $chunk = $items[($p * $Per)..([Math]::Min($items.Count, ($p + 1) * $Per) - 1)]
    $first = [System.Drawing.Image]::FromFile((Join-Path $Crops $chunk[0].file)); $cw = $first.Width; $ch = $first.Height; $first.Dispose()
    $rows = [Math]::Ceiling($chunk.Count / $Cols)
    $W = $pad * 2 + $Cols * $cw + ($Cols - 1) * $gap; $H = 44 + $rows * ($ch + $lab + $gap) + $pad
    $bmp = New-Object System.Drawing.Bitmap $W, $H; $g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::White)
    $g.DrawString("$($k.Name): $($items.Count) finds, page $($p + 1)/$pages   (form B | today | rp=outline)", $fB, $blk, $pad, 8)
    for ($i = 0; $i -lt $chunk.Count; $i++) {
      $it = $chunk[$i]; $cx = $pad + ($i % $Cols) * ($cw + $gap); $cy = 44 + [Math]::Floor($i / $Cols) * ($ch + $lab + $gap)
      $im = [System.Drawing.Image]::FromFile((Join-Path $Crops $it.file)); $g.DrawImage($im, $cx, $cy + $lab, $cw, $ch); $im.Dispose()
      $g.DrawString($it.label, $fS, $blk, (New-Object System.Drawing.RectangleF $cx, $cy, $cw, $lab))
    }
    $name = '{0}_{1:d2}.png' -f $k.Name, ($p + 1)
    $bmp.Save((Join-Path $out $name), [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()
  }
}
Get-ChildItem $out -Filter *.png | Measure-Object | ForEach-Object { "$($_.Count) sheets -> $out" }
