$ErrorActionPreference='Continue'
Set-Location 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-af888a799cf269dde\.claude\probes\K1472'
$o='out/s3/xpoff'; New-Item -ItemType Directory $o -Force | Out-Null
$env:FR='0.4,0.55,0.7'
$env:PROFILE="$env:TEMP\k1472s3-prof1"; node pinsheet.mjs http://localhost:5640 '3.FGH1HtvQeDjm6e4BII&xp=off' today "$o/levi_today" *> "$o/today.txt"
"done $(Get-Date -Format HH:mm:ss)"
