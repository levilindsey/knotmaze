param([string]$Root, [string]$Tag, [string]$Out)
$names = "muse_hash","g41_def_tw42","g41_ring_tw64","user_tw42.lightpaper","def","fat","g41_def_tw64","g41_user_tw42","muse_default_tw","ring","g41_ring_tw42","g41_user_tw64"
$scn = "C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-ac9acd27cfb1cf144\.claude\probes\K1247\out\s27\drag"
Set-Location $Root
foreach ($n in $names) {
  $res = node scripts/run_node.mjs .claude/probes/K1247/k1247s19_twin.ts "$scn\$n" "$Out\gpu_${Tag}_$n.json" --cpu=3 --gpu=0 2>&1 | Select-String "over 1/4|records \(twin\)|GPU frame"
  foreach ($r in $res) { Add-Content -Path "$Out\drift_$Tag.txt" -Value ("$n | " + $r.Line) }
}
Add-Content -Path "$Out\drift_$Tag.txt" -Value "DONE $(Get-Date -Format HH:mm:ss)"
