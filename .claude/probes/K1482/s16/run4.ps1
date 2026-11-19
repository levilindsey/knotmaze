# K1482 s16: the start build (5931) again, unpatched, to test whether the fill differences of z0/f1/f2 are the batch, not the patch
$here = $PSScriptRoot; $out = Join-Path $here ../out/s16/raw
$env:FILL = '1'; $env:PATCH = $null
& (Join-Path $here cap16.ps1) 5931 (Join-Path $out start2) start -NoWarm
$env:FILL = $null
'ALLDONE'
