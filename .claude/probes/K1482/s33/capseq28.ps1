# K1482 s26: capture link A as it loads and with &gfk=0 on two previews (border B2, fill, scene), one Chrome at a time.
#   pwsh capseq26.ps1 -Pairs "6130=m","6131=c1"   (port=tag; outputs ../out/s33/raw/<tag>_on, <tag>_off)
param([string[]]$Pairs)
$Pairs = @($Pairs | ForEach-Object { $_ -split ',' } | Where-Object { $_ })  # K1482 s33: pwsh -File passes one string
$here = $PSScriptRoot; $raw = Join-Path $here ../out/s33/raw
$q = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&bgs=0"
foreach ($pp in $Pairs) {
  $port, $tag = $pp.Split("=")
  "== $tag on $((Get-Date).ToString('HH:mm:ss'))"; & (Join-Path $here cap28.ps1) -Port $port -Out (Join-Path $raw "${tag}_on") -Tag $tag -Query $q -Env "GF=1,B2=1,FILL=1,SCENE=1" -Cap cap28.mjs | Select-Object -Last 2
  "== $tag off $((Get-Date).ToString('HH:mm:ss'))"; & (Join-Path $here cap28.ps1) -Port $port -Out (Join-Path $raw "${tag}_off") -Tag $tag -Query "$q&gfk=0" -Env "GF=1,B2=1,FILL=1,SCENE=1" -Cap cap28.mjs -NoWarm | Select-Object -Last 2
}
"CAPDONE $((Get-Date).ToString('HH:mm:ss'))"
exit 0


