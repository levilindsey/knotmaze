# K1584 s5: s4's gapcheck (per-border decode) on every maze's stage-1 capture with this worktree's src.
#   pwsh counts.ps1 [-Suffix s5]   (writes cnt/<maze>_<Suffix>.json; env GF_S4ROOM=1 gives stage 4's rule)
param([string]$Suffix = "s5")
$env:GF_KRETRY = "1"
New-Item -ItemType Directory (Join-Path $PSScriptRoot 'cnt') -Force | Out-Null
$ms = (Get-ChildItem (Join-Path $PSScriptRoot '..\s1\out\after') -Directory).Name
$ms | ForEach-Object -ThrottleLimit 4 -Parallel {
  $here = $using:PSScriptRoot; $env:GF_KRETRY = "1"; $sfx = $using:Suffix
  $d = Join-Path $here "..\s1\out\after\$_"
  npx tsx (Join-Path $here '..\s4\gapcheck.ts') $d (Join-Path $here "cnt\$($_)_$sfx.json") | Out-Null
  "$_ $(Get-Date -Format HH:mm:ss)"
}
