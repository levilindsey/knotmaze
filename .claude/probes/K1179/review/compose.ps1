param([string[]]$Rows, [string]$Out)
Add-Type -AssemblyName System.Drawing
$d = Split-Path $Out
$cw=440; $pad=12; $lab=28; $rowH=$cw+$lab+$pad
$W = 2*($cw+$pad)+$pad; $H = $rowH*$Rows.Count + $pad
$o = New-Object System.Drawing.Bitmap $W, $H
$g = [System.Drawing.Graphics]::FromImage($o)
$g.Clear([System.Drawing.Color]::White)
$g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
$g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::Half
$font = New-Object System.Drawing.Font 'Consolas', 14
$i=0
foreach($r in $Rows){
  $b=[System.Drawing.Bitmap]::FromFile("$d\row${r}_v.png")
  $y0 = $i*$rowH
  foreach($pp in @(@(0,'before the rework (S1f)'),@(2,'master today (S1i)'))){
    $p=$pp[0]; $k = if($p -eq 0){0}else{1}
    $src = New-Object System.Drawing.Rectangle (12+$p*452), $lab, $cw, $cw
    $dst = New-Object System.Drawing.Rectangle ($pad+$k*($cw+$pad)), ($y0+$lab), $cw, $cw
    $g.DrawImage($b, $dst, $src, [System.Drawing.GraphicsUnit]::Pixel)
    $g.DrawString("row $r  " + $pp[1], $font, [System.Drawing.Brushes]::Black, ($pad+$k*($cw+$pad)), ($y0+4))
  }
  $b.Dispose(); $i++
}
$g.Dispose(); $o.Save($Out, [System.Drawing.Imaging.ImageFormat]::Png); $o.Dispose()
"wrote $Out ${W}x${H}"
