# K1314 s1: the 12-scene census at --ppu=160 --min=40 in three parallel groups, then merged.
#   pwsh .claude/probes/K1314/k1314_run.ps1 [-Tag s1]
# Form B tiles are cached in out/fb/, so a rerun after an outline change costs the outline raster only.
param([string]$Tag = 's1')
$root = Resolve-Path "$PSScriptRoot/../../.."; Set-Location $root
$groups = @('muse_hash,g41_def_tw42,g41_ring_tw64,user_tw42.lightpaper', 'def,fat,g41_def_tw64,g41_user_tw42', 'muse_default_tw,ring,g41_ring_tw42,g41_user_tw64')
$jobs = for ($i = 0; $i -lt 3; $i++) { $g = $groups[$i]; Start-Job -ScriptBlock { param($r, $t, $g) Set-Location $r; node scripts/run_node.mjs .claude/probes/K1314/k1314_census.ts $t --scene=$g --ppu=160 --min=40 2>&1 } -ArgumentList $root, "${Tag}_$i", $g }
$jobs | Wait-Job | Receive-Job | Select-String -Pattern 'px at|Error' | ForEach-Object { $_.Line }
node scripts/run_node.mjs .claude/probes/K1314/k1314_census.ts $Tag --merge="${Tag}_0,${Tag}_1,${Tag}_2" --ppu=160 --min=40
