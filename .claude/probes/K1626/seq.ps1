# K1626 s1: one perf-lock sequence: gf captures of Levi's link, master (5655) and mine (5656), then the update-cost A/B.
$ErrorActionPreference = 'Continue'
$wt = 'C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k1626-s1'
$pr = "$wt\.claude\probes\K1626"
Set-Location $wt
$env:LINK = '?3.FCBQ1H6L4-6NPbeg8HHN09w'; $env:RENDERERS = 'gf'; $env:W = '412'; $env:H = '924'; $env:DSF = '4'
foreach ($p in @(@{n='master';port=5655},@{n='mine';port=5656})) {
  node "$pr\cap.mjs" "http://localhost:$($p.port)" "$pr\out\cap_$($p.n)" "$pr\out\profile" 2>&1
}
node scripts/run_node.mjs .claude/probes/K1626/bench.ts "$pr\pv\src-3bbca4fd6" $wt 4 60 2>&1 | Select-String 'SUMMARY|round'
