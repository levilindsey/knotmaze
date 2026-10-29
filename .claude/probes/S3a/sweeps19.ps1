# K1000 s1: stage 1's 20 sweep sites plus the traced site H5 (muse_drag t4 j100/2),
# under the old and the continuous caps (Node only: no lock, no timings), then the unit sweeps (A, B, A').
#   pwsh .claude/probes/S3a/sweeps19.ps1 [-Oracles m14,m19] [-Out .claude/probes/S3a/pops19/sweeps_m19.txt]
param([string]$Oracles = "m14,m19", [string]$Out = ".claude/probes/S3a/pops19/sweeps_m19.txt")
$wt = "C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k992-corners"
Set-Location $wt
$sites = @(
  "def_drag 0 j175/1 12", "def_flow 0 j43/1 16", "def_flow 8 j43/1 16", "muse_flow 0 j116/2 16",
  "muse_flow 34 j12/0 16", "muse_flow 11 j112/1 16", "muse_drag 30 j105/0 16", "def_flow 26 j172/1 16",
  "def_drag 12 j172/1 16", "def_drag 13 j172/1 16", "def_drag 22 j172/1 16", "def_drag 23 j172/1 16",
  "def_drag 31 j38/0 16", "def_drag 15 j49/2 16", "def_drag 2 j45/1 16",
  "muse_drag 21 j139/2 16", "muse_drag 0 j139/2 16", "muse_drag 13 j139/2 16", "muse_drag 25 j105/1 16",
  "def_flow 21 j56/1 16", "muse_drag 4 j100/2 32"
)
"K1000 sweeps ($Oracles), $(Get-Date -Format s)" | Out-File -Encoding utf8 $Out
foreach ($s in $sites) {
  $p = $s.Split(" ")
  $res = & node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\sweep16.ts $p[0] $p[1] $p[2] --k $p[3] --oracles $Oracles 2>&1 | Select-Object -Last 7
  $res | Out-File -Encoding utf8 -Append $Out
}
& node node_modules\vite-node\vite-node.mjs .claude\probes\S3a\unit16.ts --oracles $Oracles --n 120 2>&1 | Out-File -Encoding utf8 -Append $Out
"done $(Get-Date -Format s)" | Out-File -Encoding utf8 -Append $Out


