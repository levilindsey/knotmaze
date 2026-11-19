# K1482 s9: hold.mjs (K1450) on link A, warm: one short warming run in the profile, then the 60-frame run.
#   pwsh hold9.ps1 -Port <p> -Out <dir>     (profile $env:TEMP\k1482s9-hold, deleted by the caller)
param([int]$Port, [string]$Out)
$t0 = Get-Date; while ((((Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB) -lt 3 -or ((Get-PSDrive C).Free / 1GB) -lt 8) -and ((Get-Date) - $t0).TotalMinutes -lt 15) { [Threading.Thread]::Sleep(20000) }
$url = "http://localhost:$Port/?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1"
$prof = Join-Path $env:TEMP "k1482s9-hold"; $hold = Join-Path $PSScriptRoot "..\..\K1450\hold.mjs"
node $hold $url (Join-Path $Out "warm") $prof 8 250 5000
Write-Host "warm exit $LASTEXITCODE"
node $hold $url (Join-Path $Out "run") $prof 60 250 5000
Write-Host "run exit $LASTEXITCODE"
exit $LASTEXITCODE
