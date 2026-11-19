# K1482 s18 Done checks (s17 run17.ps1 with s18 dirs); on a build (s16 run7.ps1 with s17 dirs and profiles): link A border + fill frames (cap17, FILL=1);
# unless -CapOnly, then hold.mjs 60/60, panelopen, dragcheck_b (border) and dragcheck (fill), one Chrome at a time, all
# in the build's profile.
#   pwsh run17.ps1 -Port 5971 -Tag tip      pwsh run17.ps1 -Port 5970 -Tag start -CapOnly
param([int]$Port = 5952, [string]$Tag = "tip", [switch]$CapOnly)
$here = $PSScriptRoot; $out = Join-Path $here ../out/s18/raw; $probes = Join-Path $here ../..
$base = "http://localhost:$Port"; $prof = Join-Path $env:TEMP "k1482s18-$Tag"
function Wait-Mem { $t0 = Get-Date; while ((((Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB) -lt 3 -or ((Get-PSDrive C).Free / 1GB) -lt 8) -and ((Get-Date) - $t0).TotalMinutes -lt 15) { [Threading.Thread]::Sleep(20000) } }
$env:FILL = '1'
& (Join-Path $here cap18.ps1) $Port (Join-Path $out $Tag) $Tag
$env:FILL = $null
if ($CapOnly) { 'ALLDONE'; return }
Wait-Mem
"== hold"; node (Join-Path $probes K1450/hold.mjs) "$base/?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&rp=gf" (Join-Path $out "hold_$Tag") $prof 60 2>&1 | Select-Object -Last 4; "hold exit $LASTEXITCODE"
Wait-Mem
"== panelopen"; node (Join-Path $here ../s15/panelopen.mjs) $base $prof 2>&1 | Select-Object -Last 2
Wait-Mem
New-Item -ItemType Directory (Join-Path $out "dcb_$Tag"), (Join-Path $out "dcf_$Tag") -Force | Out-Null
"== dragcheck_b"; $env:TLK = 'border'; node (Join-Path $probes K1492/dragcheck_b.mjs) $base (Join-Path $out "dcb_$Tag") $prof gfh 2>&1 | Select-Object -Last 6; "dcb exit $LASTEXITCODE"; $env:TLK = $null
Wait-Mem
"== dragcheck"; node (Join-Path $probes K1458/dragcheck.mjs) $base (Join-Path $out "dcf_$Tag") $prof gfh 2>&1 | Select-Object -Last 6; "dcf exit $LASTEXITCODE"
'ALLDONE'

