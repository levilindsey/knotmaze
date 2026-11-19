# K1482 s8: capture link A on a preview (memory/disk wait, warm, then the frozen state at HASH).
#   pwsh cap8.ps1 <port> <outDir> <profileTag> [-Env k=v,...] [-NoWarm]
param([int]$Port, [string]$Out, [string]$Tag, [string]$Query = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1", [string[]]$Env = @(), [switch]$NoWarm)
$cap = Join-Path (Split-Path $PSScriptRoot) cap.mjs
$t0 = Get-Date
while ((((Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB) -lt 3 -or ((Get-PSDrive C).Free / 1GB) -lt 8) -and ((Get-Date) - $t0).TotalMinutes -lt 15) { [Threading.Thread]::Sleep(20000) }
$prof = Join-Path $env:TEMP "k1482s8-$Tag"
if (-not $env:HASH) { $env:HASH = "fff8c9e5" }
$Env = @($Env | ForEach-Object { $_ -split "," } | Where-Object { $_ })  # pwsh -File passes "a=1,b=2" as one string
foreach ($kv in $Env) { $k, $v = $kv.Split("=", 2); Set-Item "Env:$k" $v }
if (-not $NoWarm) { $env:WARM = "1"; node $cap "http://localhost:$Port" $Out $prof $Query }
$env:WARM = $null; node $cap "http://localhost:$Port" $Out $prof $Query
foreach ($kv in $Env) { Set-Item "Env:$($kv.Split('=')[0])" $null }
