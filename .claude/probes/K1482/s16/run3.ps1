# K1482 s16: after the timing run (waits for EXIT in its log), candidates f1 (flagged ramp 0.5 px in) and f2 (1 px in) on the start build (5931)
$here = $PSScriptRoot; $out = Join-Path $here ../out/s16/raw
$t0 = Get-Date
while (-not (Select-String -Path "$env:TEMP\k1482s16-tms.log" -Pattern '^EXIT' -Quiet) -and ((Get-Date) - $t0).TotalMinutes -lt 20) { [Threading.Thread]::Sleep(5000) }
$env:FILL = '1'
foreach ($v in 'f1', 'f2') {
  $env:PATCH = Join-Path $here "patch_$v.json"
  & (Join-Path $here cap16.ps1) 5931 (Join-Path $out $v) $v
}
$env:PATCH = $null; $env:FILL = $null
'ALLDONE'
