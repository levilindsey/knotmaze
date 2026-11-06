# K1218 S7: cross ji 155 without markers, rows master / S6's branch / this
# branch at t2-t5, then an at-rest row (np), zoom 4. The no-marker shots
# (../s5/nomark_s5.mjs: full frames c155_t<k>.png, c155_np.png) hold no
# meta.json, so each build's frames are copied into out/nm155/<m|s6|b>/ beside
# that build's cross meta.json (the same link and moves, phw=0: one layout).
#   & .\nm155_s7.ps1 [-Mine out/nomark_b2] [-MineMeta out/b2/cross/meta.json] [-Spot "155@-28,-2"] [-Tag ""]
param([string]$Mine = "out/nomark_b2", [string]$MineMeta = "out/b2/cross/meta.json", [string]$Spot = "155@-28,-2", [int]$Size = 72, [int]$Zoom = 4, [string]$Tag = "")
$here = $PSScriptRoot
$src = @{
  m  = @("$here/out/nomark_m", "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1218/s4/out/b2/cross/meta.json")
  s6 = @("C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-ae639b326ea18b921/.claude/probes/K1218/s6/out/nomark_c", "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-ae639b326ea18b921/.claude/probes/K1218/s6/out/c/cross/meta.json")
  b  = @((Join-Path $here $Mine), (Join-Path $here $MineMeta))
}
$names = "c155_t2.png", "c155_t3.png", "c155_t4.png", "c155_t5.png", "c155_np.png"
foreach ($k in "m", "s6", "b") {
  $d = Join-Path $here "out/nm155/$k"
  New-Item -ItemType Directory $d -Force | Out-Null
  foreach ($n in $names) { Copy-Item (Join-Path $src[$k][0] $n) (Join-Path $d $n) -Force }
  Copy-Item $src[$k][1] (Join-Path $d "meta.json") -Force
}
$nm = ("$here/out/nm155" -replace '\\', '/')
$t = "c155_t2.png,c155_t3.png,c155_t4.png,c155_t5.png"
New-Item -ItemType Directory (Join-Path $here "out/sheets") -Force | Out-Null
$out = "$($here -replace '\\', '/')/out/sheets/cross_155_nomark$Tag.png"
node "$here/../s4/sheets_s4.mjs" $out $Size $Zoom "$nm/b/meta.json" $Spot "$nm/m|$t" "$nm/s6|$t" "$nm/b|$t" "$nm/m|c155_np.png,$nm/s6/c155_np.png,$nm/b/c155_np.png" 2>&1 | Select-Object -Last 1
