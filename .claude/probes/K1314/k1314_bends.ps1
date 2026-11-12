# K1314 s3 follow-up: titled crops of the 5 through bends s3 leaves sharp ("past a junction"), and one sheet.
# Recipe (each crop run from a checkout of that commit with this folder's tools copied in; spots by junction id):
#   $sp = 'muse_hash:j135,muse_hash:j78,muse_hash:j98,g41_user_tw64:j48,g41_user_tw64:j49'
#   08f25f4b (now):  node scripts/run_node.mjs .claude/probes/K1314/k1314_crops.ts x --spots=$sp --out=<bends>/now --px=240
#   092c696a (arc):  ... k1314_crops.ts x --spots=$sp --out=<bends>/arc --before=<bends>/now --px=240
#                    (panels: fillet reference | now's outline panel | 092c696a's outline panel)
#   c51244ea (s2):   ... k1314_crops.ts x --spots=$sp --out=<bends>/s2 --px=240
#   node scripts/run_node.mjs .claude/probes/K1314/k1314_bends_cmp.ts <bends>   (s2 vs now, outline panel)
# Then this script titles <bends>/arc/spot_00N.png as <bends>/<scene>_<j>.png and stacks them into bends_sheet.png.
#   pwsh .claude/probes/K1314/k1314_bends.ps1 [-Dir <bends>]
param([string]$Dir = (Join-Path $PSScriptRoot 'out/s3/bends'))
Add-Type -AssemblyName System.Drawing
$rows = @(@('muse_hash', 'j135'), @('muse_hash', 'j78'), @('muse_hash', 'j98'), @('g41_user_tw64', 'j48'), @('g41_user_tw64', 'j49'))
$font = New-Object System.Drawing.Font('Segoe UI', 11, [System.Drawing.FontStyle]::Bold); $sfont = New-Object System.Drawing.Font('Segoe UI', 9)
$labs = @('fillet reference (K1049)', 'stage 2 = now: sharp V', '092c696a try: arc + spur'); $outs = @()
for ($i = 0; $i -lt $rows.Count; $i++) {
  $src = [System.Drawing.Image]::FromFile((Join-Path $Dir "arc/spot_00$($i + 1).png")); $W = [int]$src.Width; $H = [int]$src.Height; $T = 44
  $bmp = New-Object System.Drawing.Bitmap($W, [int]($H + $T)); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.TextRenderingHint = 'AntiAlias'
  $g.Clear([System.Drawing.Color]::White)
  $g.DrawString("$($rows[$i][0]) $($rows[$i][1]): through-pass bend left sharp (past a junction)", $font, [System.Drawing.Brushes]::Black, [single]4, [single]2)
  $P = [int](($W - 8) / 3)
  for ($k = 0; $k -lt 3; $k++) { $g.DrawString($labs[$k], $sfont, [System.Drawing.Brushes]::DimGray, [single]($k * ($P + 4) + 4), [single]24) }
  $g.DrawImage($src, 0, $T, $W, $H); $g.Dispose(); $src.Dispose()
  $f = Join-Path $Dir "$($rows[$i][0])_$($rows[$i][1]).png"; $bmp.Save($f, [System.Drawing.Imaging.ImageFormat]::Png); $bmp.Dispose(); $outs += $f
}
$imgs = $outs | ForEach-Object { [System.Drawing.Image]::FromFile($_) }
$SW = [int]$imgs[0].Width; $SH = [int](($imgs | Measure-Object -Property Height -Sum).Sum + 6 * ($imgs.Count - 1))
$sheet = New-Object System.Drawing.Bitmap($SW, $SH); $g = [System.Drawing.Graphics]::FromImage($sheet); $g.Clear([System.Drawing.Color]::White); $y = 0
foreach ($im in $imgs) { $g.DrawImage($im, 0, [int]$y, [int]$im.Width, [int]$im.Height); $y += [int]$im.Height + 6 }
$g.Dispose(); $sheet.Save((Join-Path $Dir 'bends_sheet.png'), [System.Drawing.Imaging.ImageFormat]::Png); $sheet.Dispose(); $imgs | ForEach-Object { $_.Dispose() }
"wrote $($outs.Count) images + bends_sheet.png in $Dir"
