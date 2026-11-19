# K1482 s16: the null control n0 on the start build (5931): patch_g0 plus scJ written as vec2(0.0 * uLkG, 0.3 * sc.y),
# the same values as sc * vec2(0.0, 0.3) (sc.x >= 0, so both are +0), different code. If its fill matches f3's and
# not start's, the fill's 1-level differences are the compile's, not a term that reads the flag
$here = $PSScriptRoot; $out = Join-Path $here ../out/s16/raw
$env:FILL = '1'
$env:PATCH = Join-Path $here patch_n0.json
& (Join-Path $here cap16.ps1) 5931 (Join-Path $out n0) n0 -NoWarm
$env:PATCH = $null; $env:FILL = $null
'ALLDONE'
