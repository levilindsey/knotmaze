# K1482 s34b: s33's capseq28.ps1 for s34b: capture link A as it loads and with &gfk=0 on previews (border B2, fill,
# scene, the cost line), one Chrome at a time; each tag gets a new (cold) profile, so its warm run is a cold first load.
#   pwsh capseq34.ps1 -Pairs "5460=m","5461=c","5460=m2","5461=c2"   (port=tag; outputs ../out/s34/raw/<tag>_on, <tag>_off)
param([string[]]$Pairs)
$Pairs = @($Pairs | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$here = $PSScriptRoot; $raw = Join-Path $here ../out/s34/raw
$q = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&bgs=0"
foreach ($pp in $Pairs) {
  $port, $tag = $pp.Split("=")
  "== $tag on $((Get-Date).ToString('HH:mm:ss'))"; & (Join-Path $here cap34.ps1) -Port $port -Out (Join-Path $raw "${tag}_on") -Tag $tag -Query $q -Env "GF=1,B2=1,FILL=1,SCENE=1" | Select-Object -Last 3
  "== $tag off $((Get-Date).ToString('HH:mm:ss'))"; & (Join-Path $here cap34.ps1) -Port $port -Out (Join-Path $raw "${tag}_off") -Tag $tag -Query "$q&gfk=0" -Env "GF=1,B2=1,FILL=1,SCENE=1" -NoWarm | Select-Object -Last 2
}
"CAPDONE $((Get-Date).ToString('HH:mm:ss'))"
exit 0
