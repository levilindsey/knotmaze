# K1482 s16: after run4 (waits for its ALLDONE), candidate f3 on the start build (5931): f2's 1 px inward shift of the
# flagged ramp, carried in scJ.x alone (margin -pxw/uLkG), so lkCut's code and the unflagged call stay as they are
$here = $PSScriptRoot; $out = Join-Path $here ../out/s16/raw
$t0 = Get-Date
while (-not (Select-String -Path "$env:TEMP\k1482s16-run4.log" -Pattern 'ALLDONE' -Quiet) -and ((Get-Date) - $t0).TotalMinutes -lt 15) { [Threading.Thread]::Sleep(5000) }
$env:FILL = '1'
$env:PATCH = Join-Path $here patch_f3.json
& (Join-Path $here cap16.ps1) 5931 (Join-Path $out f3) f3 -NoWarm
$env:PATCH = $null; $env:FILL = $null
'ALLDONE'
