param([string]$FileList,[int]$X,[int]$Y,[int]$S=120,[int]$Z=4,[string]$Out)
Add-Type -AssemblyName System.Drawing; $Files = $FileList -split ";"
$n=$Files.Count; $bmp=[System.Drawing.Bitmap]::new($S*$Z*$n+8*($n-1),$S*$Z); $g=[System.Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode='NearestNeighbor'; $g.PixelOffsetMode='Half'; $g.Clear([System.Drawing.Color]::White)
for($i=0;$i -lt $n;$i++){ $src=[System.Drawing.Bitmap]::new($Files[$i]); $g.DrawImage($src,[System.Drawing.Rectangle]::new($i*($S*$Z+8),0,$S*$Z,$S*$Z),[System.Drawing.Rectangle]::new($X,$Y,$S,$S),'Pixel'); $src.Dispose() }
$bmp.Save($Out); "saved $Out"

