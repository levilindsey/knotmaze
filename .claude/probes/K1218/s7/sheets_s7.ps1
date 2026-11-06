# K1218 S7: the stage's sheets (a copy of S6's sheets_s6.ps1). One per spot:
# rows master / S6's branch / this branch at the pulse moments t3-t6, then an
# at-rest row (master, S6, this branch), zoom 4.
#   & .\sheets_s7.ps1 [-Branch out/b] [-Spots "cross:80","x4:101@60,0",...] [-Tag ""]
param([string]$Branch = "out/b", [string[]]$Spots = @("cross:80", "x4:80", "cross:115", "loop:113", "cross:33", "cross:155"), [int]$Size = 72, [int]$Zoom = 4, [string]$Tag = "")
$here = $PSScriptRoot -replace '\\', '/'
$master = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1218/s4/out/b2"
$s6 = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-ae639b326ea18b921/.claude/probes/K1218/s6/out/c"
$br = "$here/$Branch"
New-Item -ItemType Directory (Join-Path $PSScriptRoot "out/sheets") -Force | Out-Null
$t = "L0_t3.png,L0_t4.png,L0_t5.png,L0_t6.png"
foreach ($sp in $Spots) {
  $stand, $ji = $sp.Split(":", 2)
  $name = "${stand}_" + ($ji -replace '[@,]', '_') + $Tag
  $out = "$here/out/sheets/$name.png"
  node "$here/../s4/sheets_s4.mjs" $out $Size $Zoom "$br/$stand/meta.json" $ji "$master/$stand|$t" "$s6/$stand|$t" "$br/$stand|$t" "$master/$stand|np.png,$s6/$stand/np.png,$br/$stand/np.png" 2>&1 | Select-Object -Last 1
}
