# K1584 s7: export stage 6's src (eecd677e2, the brief on stage 6) into out/v_s6/ (untracked) for tabdiff.ts and the
# mirrors (env GF_SRC6 / GF_SRC).   pwsh mkver.ps1
$ErrorActionPreference = 'Stop'
$wt = Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')
$out = Join-Path $PSScriptRoot 'out'
New-Item -ItemType Directory $out -Force | Out-Null
$d = Join-Path $out 'v_s6'
if (Test-Path (Join-Path $d 'src')) { Write-Output 'v_s6 exists'; return }
New-Item -ItemType Directory $d -Force | Out-Null
$tarF = Join-Path $out 'v_s6.tar'
git -C $wt archive --format=tar -o $tarF eecd677e2 src
tar -x -f $tarF -C $d
[System.IO.File]::Delete($tarF)
Write-Output "v_s6 -> $d"
