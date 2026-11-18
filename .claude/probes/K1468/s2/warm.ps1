# K1468 s2: warm one profile per build with the exact links it measures (watchdog off: the old builds' cold gf
# compile on the GPU main thread would otherwise trip it). Usage: warm.ps1 <port> <profileName>
param([int]$Port, [string]$Name)
. "$PSScriptRoot/common.ps1"
Wait-Mem; Test-Disk
$env:SEC = "2"; $env:REDRAW = "1"; $env:EXTRA = "--disable-gpu-watchdog"
node "$PSScriptRoot/../rest.mjs" "$env:TEMP\k1468s2-prof-$Name" "$env:TEMP\k1468s2-warm-$Name.json" 1 "http://localhost:$Port/$LinkA" "http://localhost:$Port/$LinkB"
$env:EXTRA = $null
