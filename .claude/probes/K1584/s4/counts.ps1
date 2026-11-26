# K1584 s4: gapcheck (s4's per-border decode) on every maze's stage-1 capture with this worktree's src.
#   pwsh counts.ps1     (writes cnt/<maze>_s4.json)
$env:GF_KRETRY = "1"
New-Item -ItemType Directory (Join-Path $PSScriptRoot 'cnt') -Force | Out-Null
$ms = (Get-ChildItem (Join-Path $PSScriptRoot '..\s1\out\after') -Directory).Name
$ms | ForEach-Object -ThrottleLimit 4 -Parallel {
  $here = $using:PSScriptRoot; $env:GF_KRETRY = "1"
  $d = Join-Path $here "..\s1\out\after\$_"
  npx tsx (Join-Path $here 'gapcheck.ts') $d (Join-Path $here "cnt\$($_)_s4.json") | Out-Null
  "$_ $(Get-Date -Format HH:mm:ss)"
}
