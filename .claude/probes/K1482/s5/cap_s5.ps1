# K1482 s5: capture link A on a preview (warm, then the frozen state), tables + scene + sites.  pwsh cap_s5.ps1 <port> <outDir> <profileTag> [extra env pairs k=v ...]
param([int]$Port, [string]$Out, [string]$Tag, [string]$Query = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1", [string[]]$Env = @())
$here = $PSScriptRoot
$t0 = Get-Date
while ((((Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB) -lt 3 -or ((Get-PSDrive C).Free / 1GB) -lt 8) -and ((Get-Date) - $t0).TotalMinutes -lt 15) { [Threading.Thread]::Sleep(20000) }
$prof = Join-Path $env:TEMP "k1482s5-$Tag"
foreach ($kv in $Env) { $k, $v = $kv.Split("=", 2); Set-Item "Env:$k" $v }
$env:WARM = "1"; node (Join-Path (Split-Path $here) cap.mjs) "http://localhost:$Port" $Out $prof $Query
$env:WARM = $null; node (Join-Path (Split-Path $here) cap.mjs) "http://localhost:$Port" $Out $prof $Query
foreach ($kv in $Env) { Set-Item "Env:$($kv.Split('=')[0])" $null }

