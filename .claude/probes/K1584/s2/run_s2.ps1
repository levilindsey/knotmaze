# K1584 s2: the three gap variants of A_3 for Levi's pick, from a build of stage 1 (b4c48f3a9) plus the PROBE-ONLY
# query overrides k84j (1 = no joint flags) and k84g (world units added to the gap margin); fl is the link's own fade.
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1584 s2" -What "A_3 variants" -Cmd "& '.claude\probes\K1584\s2\run_s2.ps1' -Port 5586"
# The overrides are two temporary lines in gf_look.ts (variants.patch), never committed to src/.
param([int]$Port = 5586)
$cap = Join-Path $PSScriptRoot "..\s1\cap.ps1"; $o = Join-Path $PSScriptRoot "out"
& $cap -Port $Port -Tag v2 -Mazes A_3 -PinFrom before -OutRoot $o -Extra "&k84j=1"
& $cap -Port $Port -Tag v3 -Mazes A_3 -PinFrom before -OutRoot $o -Extra "&k84j=1&k84g=0.07"
& $cap -Port $Port -Tag v4 -Mazes A_3 -PinFrom before -OutRoot $o -Extra "&k84j=1&k84g=0.18&fl=0.3"
exit 0
