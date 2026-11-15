param([string]$A,[string]$B,[int]$T=24,[int]$R=3)
Add-Type -AssemblyName System.Drawing
$ba=[System.Drawing.Bitmap]::new($A); $bb=[System.Drawing.Bitmap]::new($B)
function px($b){ $r=[System.Drawing.Rectangle]::new(0,0,$b.Width,$b.Height); $d=$b.LockBits($r,'ReadOnly','Format32bppArgb'); $a=[byte[]]::new($d.Stride*$b.Height); [Runtime.InteropServices.Marshal]::Copy($d.Scan0,$a,0,$a.Length); $b.UnlockBits($d); ,$a }
$x=px $ba; $y=px $bb; $w=$ba.Width; $h=$ba.Height
Add-Type -TypeDefinition @"
public static class Sh { public static int C(byte[] x, byte[] y, int w, int h, int dx, int dy, int t) { int n=0; for (int j=40;j<h-40;j++) for (int i=40;i<w-40;i++){ int p=(j*w+i)*4, q=((j+dy)*w+(i+dx))*4; int m=0; for(int c=0;c<3;c++){int d=x[p+c]-y[q+c]; if(d<0)d=-d; if(d>m)m=d;} if(m>t) n++; } return n; } }
"@
$best=@(); for($dy=-$R;$dy -le $R;$dy++){ for($dx=-$R;$dx -le $R;$dx++){ $best += [pscustomobject]@{dx=$dx;dy=$dy;n=[Sh]::C($x,$y,$w,$h,$dx,$dy,$T)} } }
$best | Sort-Object n | Select-Object -First 4 | ForEach-Object { "dx=$($_.dx) dy=$($_.dy) n=$($_.n)" }
