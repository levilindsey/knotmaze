# K1626 s2: the eye shots again (cap3.mjs after the clip fix: whole-viewport shots, cropped offline), master (5655),
# stage 1 (5656), stage 2 (5657), into out\cap5_<build>. Run under the perf lock:
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1626 s2" -What "eye shots" -Cmd "& '.claude/probes/K1626/seq3.ps1'"
$ErrorActionPreference = 'Continue'
$wt = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$pr = $PSScriptRoot
$o = Join-Path $pr 'out'
Set-Location $wt
$env:W = '412'; $env:H = '924'; $env:DSF = '2'; $env:SCALE = '90'; $env:CLIP = '360'
foreach ($p in @(@{n='master';port=5655},@{n='s1';port=5656},@{n='s2';port=5657})) {
  node "$pr\cap3.mjs" "http://localhost:$($p.port)" "$o\cap5_$($p.n)" "$o\profile2" *> "$o\cap5_$($p.n).log"
  Get-Content "$o\cap5_$($p.n).log" -Tail 1
}
