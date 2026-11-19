# K1482 s16: after run1 (waits for its ALLDONE), the debug terms (patch_dbg16) and candidate z0 on the start build (5931)
$here = $PSScriptRoot; $out = Join-Path $here ../out/s16/raw
$t0 = Get-Date
while (-not (Select-String -Path "$env:TEMP\k1482s16-run1.log" -Pattern 'ALLDONE' -Quiet) -and ((Get-Date) - $t0).TotalMinutes -lt 20) { [Threading.Thread]::Sleep(5000) }
$env:FILL = '1'
$env:PATCH = Join-Path $here patch_dbg16.json
& (Join-Path $here cap16.ps1) 5931 (Join-Path $out dbg) dbg
$env:PATCH = Join-Path $here patch_z0.json
& (Join-Path $here cap16.ps1) 5931 (Join-Path $out z0) z0
$env:PATCH = $null; $env:FILL = $null
'ALLDONE'
