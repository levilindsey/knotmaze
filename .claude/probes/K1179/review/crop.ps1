param([string]$Src, [int]$Half, [int]$Scale, [string]$Out, [string]$Label)
Add-Type -AssemblyName System.Drawing
$bmp = [System.Drawing.Bitmap]::FromFile($Src)
$W = $bmp.Width; $H = $bmp.Height
$rect = New-Object System.Drawing.Rectangle 0,0,$W,$H
$data = $bmp.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadOnly, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$stride = $data.Stride
$bytes = New-Object byte[] ($stride*$H)
[System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)
$bmp.UnlockBits($data)
# V's y: the left tick of panel 1 (red, x < 40)
$ys=New-Object System.Collections.Generic.List[int]
for($y=0;$y -lt $H;$y++){ $row=$y*$stride; for($x=0;$x -lt 40;$x++){ $i=$row+$x*3; if($bytes[$i+2] -gt 180 -and $bytes[$i+1] -lt 90 -and $bytes[$i] -lt 90){ $ys.Add($y); break } } }
$vy = [int](($ys | Measure-Object -Average).Average)
# left ticks along row vy: first three red clusters
$row=$vy*$stride; $lx=New-Object System.Collections.Generic.List[int]
for($x=0;$x -lt $W;$x++){ $i=$row+$x*3; if($bytes[$i+2] -gt 180 -and $bytes[$i+1] -lt 90 -and $bytes[$i] -lt 90){ $lx.Add($x) } }
$cl=@(); $cur=New-Object System.Collections.Generic.List[int]
foreach($k in $lx){ if($cur.Count -gt 0 -and $k - $cur[$cur.Count-1] -gt 3){ $cl += [int](($cur|Measure-Object -Average).Average); $cur=New-Object System.Collections.Generic.List[int] }; $cur.Add($k) }
if($cur.Count -gt 0){ $cl += [int](($cur|Measure-Object -Average).Average) }
$pitch = $cl[1]-$cl[0]
# top tick of each panel: rows above vy - pitch/2 + 10 .. vy - pitch/2 - 40, x within that panel's pitch
$vx=@()
for($p=0;$p -lt 3;$p++){
  $found=New-Object System.Collections.Generic.List[int]
  $x0=$cl[$p]+3; $x1=[Math]::Min($W-1,$cl[$p]+$pitch-3)
  for($y=[Math]::Max(0,$vy-[int]($pitch/2)-40);$y -lt $vy-[int]($pitch/2)+10;$y++){ $row=$y*$stride; for($x=$x0;$x -le $x1;$x++){ $i=$row+$x*3; if($bytes[$i+2] -gt 180 -and $bytes[$i+1] -lt 90 -and $bytes[$i] -lt 90){ $found.Add($x) } } }
  $vx += [int](($found|Measure-Object -Average).Average)
}
"{0}: vy={1} leftTicks={2} vx={3}" -f (Split-Path $Src -Leaf), $vy, ($cl -join ','), ($vx -join ',')
$n=3; $cw=2*$Half*$Scale; $pad=12; $lab=28
$outBmp = New-Object System.Drawing.Bitmap (($cw+$pad)*$n+$pad), ($cw+$lab+$pad)
$gr=[System.Drawing.Graphics]::FromImage($outBmp)
$gr.Clear([System.Drawing.Color]::White)
$gr.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$gr.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half
$font = New-Object System.Drawing.Font 'Consolas', 14
$names=@('S1f (before the rework)','today','restored')
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(255,220,0,0)), 2
for($p=0;$p -lt $n;$p++){
  $sx=$vx[$p]-$Half; $sy=$vy-$Half; $ox=$pad+$p*($cw+$pad)
  $dst = New-Object System.Drawing.Rectangle $ox, $lab, $cw, $cw
  $srcR = New-Object System.Drawing.Rectangle $sx, $sy, (2*$Half), (2*$Half)
  $gr.DrawImage($bmp, $dst, $srcR, [System.Drawing.GraphicsUnit]::Pixel)
  $gr.DrawString("$Label  " + $names[$p], $font, [System.Drawing.Brushes]::Black, $ox, 4)
  $cx = $ox+$cw/2; $cy=$lab+$cw/2
  $gr.DrawLine($pen, $cx, $lab, $cx, $lab+10); $gr.DrawLine($pen, $ox, $cy, $ox+10, $cy)
}
$gr.Dispose(); $bmp.Dispose()
$outBmp.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png); $outBmp.Dispose()
