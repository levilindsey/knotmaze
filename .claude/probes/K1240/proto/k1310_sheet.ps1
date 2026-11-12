param($c,$out)
Add-Type -AssemblyName System.Drawing
$cw=448; $g=6
$spots=@(
 @('census_worst',0,'x77'),@('census_worst',1,'x304'),@('census_worst',2,'x64'),@('census_worst',3,'x292'),
 @('census_worst',4,'x201'),@('census_worst',5,'x273'),@('census_worst',6,'x134'),@('census_worst',7,'x346'),
 @('census_worst',8,'x22'),@('census_worst',9,'x325'),@('muse_hash_spots',3,'j59'),@('muse_hash_spots',4,'j58'),
 @('g41_user_tw64_j7_j9',1,'g41 j8'),@('g41_user_tw64_j7_j9',2,'g41 j9'))
$img=@{}; foreach($n in 'census_worst','muse_hash_spots','g41_user_tw64_j7_j9'){ $img[$n]=[System.Drawing.Image]::FromFile("$c\$n.png") }
$s=300; $lab=22; $pad=10; $head=40
$W=4*$s+3*4+$pad*2+20; $rows=[Math]::Ceiling($spots.Count/2); $H=$head+$rows*($s+$lab+8)+$pad
$bmp=New-Object System.Drawing.Bitmap $W,$H; $gr=[System.Drawing.Graphics]::FromImage($bmp)
$gr.Clear([System.Drawing.Color]::White); $gr.InterpolationMode='HighQualityBicubic'
$f=New-Object System.Drawing.Font 'Segoe UI',13,([System.Drawing.FontStyle]::Bold); $fs=New-Object System.Drawing.Font 'Segoe UI',11
$gr.DrawString('Each pair: form B (approved) | rp=outline (master today)',$f,[System.Drawing.Brushes]::Black,$pad,8)
for($i=0;$i -lt $spots.Count;$i++){
 $sp=$spots[$i]; $r=[Math]::Floor($i/2); $k=$i%2
 $x0=$pad+$k*(2*$s+4+20); $y0=$head+$r*($s+$lab+8)
 $scene= if($sp[0] -like 'g41*'){'g41_user_tw64'}else{'muse_hash'}
 $gr.DrawString("$($sp[2])  ($scene)",$fs,[System.Drawing.Brushes]::Black,$x0,$y0)
 foreach($col in 0,2){ $dx= if($col -eq 0){0}else{$s+4}
  $src=New-Object System.Drawing.Rectangle ($col*($cw+$g)),($sp[1]*($cw+$g)),$cw,$cw
  $dst=New-Object System.Drawing.Rectangle ($x0+$dx),($y0+$lab),$s,$s
  $gr.DrawImage($img[$sp[0]],$dst,$src,[System.Drawing.GraphicsUnit]::Pixel) }
}
$bmp.Save($out,[System.Drawing.Imaging.ImageFormat]::Png); "$W x $H"
