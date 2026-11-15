param([string]$src, [string]$dst, [int]$x, [int]$y, [int]$w, [int]$h, [int]$scale = 4)
Add-Type -AssemblyName System.Drawing
$im = [System.Drawing.Bitmap]::FromFile($src)
$out = New-Object System.Drawing.Bitmap ($w * $scale), ($h * $scale)
$g = [System.Drawing.Graphics]::FromImage($out)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
$g.DrawImage($im, (New-Object System.Drawing.Rectangle 0, 0, ($w * $scale), ($h * $scale)), (New-Object System.Drawing.Rectangle $x, $y, $w, $h), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $im.Dispose()
$out.Save($dst, [System.Drawing.Imaging.ImageFormat]::Png); $out.Dispose()
