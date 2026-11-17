# K1407 c1: the CPU-mirror census (k1362s1_census.ts) on the 12 scenes in parallel groups, then merged.
# CPU only (no GPU, no timing): no perf lock. Run from the worktree:
#   pwsh -NoProfile -File .claude/probes/K1407/k1407c1_census.ps1 -Tag c1
param([string]$Tag = 'c1', [string[]]$Groups = @('muse_hash,g41_ring_tw64', 'g41_def_tw64,user_tw42.lightpaper', 'def,g41_user_tw42', 'muse_default_tw,ring', 'g41_def_tw42,g41_user_tw64', 'fat'))
$root = (Resolve-Path "$PSScriptRoot/../../..").Path
$jobs = for ($i = 0; $i -lt $Groups.Count; $i++) { Start-Job -ScriptBlock { param($r, $t, $g) Set-Location $r; node scripts/run_node.mjs .claude/probes/K1362/k1362s1_census.ts $t --scene=$g --ppu=160 --min=40 --nolock 2>&1 } -ArgumentList $root, "${Tag}_$i", $Groups[$i] }
$jobs | Wait-Job | Receive-Job | Select-String -Pattern 'Error|error' | ForEach-Object { $_.Line }
Set-Location $root
$tags = 0..($Groups.Count - 1) | ForEach-Object { "${Tag}_$_" }
node scripts/run_node.mjs .claude/probes/K1362/k1362s1_census.ts $Tag --merge=$($tags -join ',') --ppu=160 --min=40 --nolock
