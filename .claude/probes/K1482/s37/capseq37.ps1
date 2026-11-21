# K1482 s37: s36's capseq36.ps1 writing under ../out/s37 through cap37.ps1 (profiles k1482s37-<tag>).
# Each -Pairs entry is port=tag (tag = the profile and the output folder); every maze of -Mazes is shot on every
# pair, in maze order (maze 1 on each pair, then maze 2, ...), so the builds' loads of one maze sit next to each
# other in one session. The first load on a new tag is a warm run.
#   pwsh capseq37.ps1 -Pairs "6301=m","6302=c","6301=m2","6302=c2" -Mazes A_3 [-Scene] [-Fill] [-Off] [-Sub raw]
#   outputs ../out/s37/<Sub>/<tag>/<maze>[_off]/{gf.png, gf_b2.png, sites_gf.json, scene_gf.json (-Scene), gf_fill.png (-Fill)}
# Run it through scripts/perf_lock.ps1. Hashes and queries are run 27L's; &bgs=0 added (a still background).
# cap34.mjs appends &snd=none, &phw=0 and &rp=gf to every link, and shoots only after gf's first composite.
param([string[]]$Pairs, [string[]]$Mazes, [switch]$Scene, [switch]$Fill, [switch]$Off, [string]$Sub = "raw", [int]$Limit = 300)
$Pairs = @($Pairs | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$Mazes = @($Mazes | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$M = @{
  'A_3' = @('fff8c9e5', '3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1')
  'A_4' = @('17be5630', '4.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_5' = @('c79a38dc', '5.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_6' = @('0effcae3', '6.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_7' = @('b185ec76', '7.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_8' = @('c193f2c9', '8.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_9' = @('056f646d', '9.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_a' = @('11744900', 'a.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_b' = @('98ae3432', 'b.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_c' = @('076a7008', 'c.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_d' = @('190b62ed', 'd.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1')
  'D_1' = @('0f28ceb4', '1&xp=off&am=instant&gfh=1&tlk=border'); 'D_2' = @('820b0b4c', '2&xp=off&am=instant&gfh=1&tlk=border'); 'D_3' = @('f9d72040', '3&xp=off&am=instant&gfh=1&tlk=border'); 'D_4' = @('730413eb', '4&xp=off&am=instant&gfh=1&tlk=border'); 'D_5' = @('4886df51', '5&xp=off&am=instant&gfh=1&tlk=border'); 'D_6' = @('754983e6', '6&xp=off&am=instant&gfh=1&tlk=border'); 'D_7' = @('983ff750', '7&xp=off&am=instant&gfh=1&tlk=border'); 'D_8' = @('f8f3b24c', '8&xp=off&am=instant&gfh=1&tlk=border'); 'D_9' = @('6c9228b5', '9&xp=off&am=instant&gfh=1&tlk=border'); 'D_a' = @('dbd0530d', 'a&xp=off&am=instant&gfh=1&tlk=border')
}
$here = $PSScriptRoot; $raw = Join-Path $here "../out/s37/$Sub"
$warmed = @{}
foreach ($mz in $Mazes) {
  $hash, $q = $M[$mz]; $q = "$q&bgs=0"
  foreach ($pp in $Pairs) {
    $port, $tag = $pp.Split("=")
    $envs = "GF=1,B2=1,HASH=$hash" + $(if ($Scene) { ",SCENE=1" } else { "" }) + $(if ($Fill) { ",FILL=1" } else { "" })
    $out = Join-Path $raw "$tag/$mz"
    "== $tag $mz $((Get-Date).ToString('HH:mm:ss'))"
    $isWarm = $warmed[$tag] -or (Test-Path (Join-Path $env:TEMP "k1482s37-$tag/.warm$port"))
    if ($isWarm) { & (Join-Path $here cap37.ps1) -Port $port -Out $out -Tag $tag -Query $q -Env $envs -NoWarm -ShotLimit $Limit | Select-Object -Last 2 }
    else { & (Join-Path $here cap37.ps1) -Port $port -Out $out -Tag $tag -Query $q -Env $envs -Limit $Limit -ShotLimit $Limit | Select-Object -Last 3; $warmed[$tag] = $true; New-Item -ItemType File -Force (Join-Path $env:TEMP "k1482s37-$tag/.warm$port") | Out-Null }
    if ($Off) {
      "== $tag $mz off $((Get-Date).ToString('HH:mm:ss'))"
      & (Join-Path $here cap37.ps1) -Port $port -Out (Join-Path $raw "$tag/${mz}_off") -Tag $tag -Query "$q&gfk=0" -Env $envs -NoWarm -ShotLimit $Limit | Select-Object -Last 2
    }
  }
}
"CAPDONE $((Get-Date).ToString('HH:mm:ss'))"
exit 0
