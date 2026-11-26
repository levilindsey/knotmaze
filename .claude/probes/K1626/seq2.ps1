# K1626 s2: one perf-lock sequence: high-zoom gf eye shots of Levi's link on master (5655), stage 1 (5656) and
# stage 2 (5657), then the width-jump re-sleep (tw 0.75 -> 0.5, stage 1's case) and the step-cost A/B against master.
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1626 s2" -What "eye shots + bench" -Cmd "& '.claude/probes/K1626/seq2.ps1'"
$ErrorActionPreference = 'Continue'
$wt = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$pr = $PSScriptRoot
$o = Join-Path $pr 'out'
Set-Location $wt
$env:W = '412'; $env:H = '924'; $env:DSF = '2'; $env:SCALE = '90'; $env:CLIP = '360'
foreach ($p in @(@{n='master';port=5655},@{n='s1';port=5656},@{n='s2';port=5657})) {
  node "$pr\cap3.mjs" "http://localhost:$($p.port)" "$o\cap3_$($p.n)" "$o\profile2" *> "$o\cap3_$($p.n).log"
  Get-Content "$o\cap3_$($p.n).log" -Tail 1
}
node scripts/run_node.mjs .claude/probes/K1626/widthjump.ts 0.75 0.5 "$pr\pv\master" "$pr\pv\s1" . *> "$o\widthjump2.txt"
Get-Content "$o\widthjump2.txt" | Select-String 'tw '
node scripts/run_node.mjs .claude/probes/K1626/bench.ts "$pr\pv\master" $wt 4 60 *> "$o\bench2.txt"
Get-Content "$o\bench2.txt" | Select-String 'SUMMARY|round'
