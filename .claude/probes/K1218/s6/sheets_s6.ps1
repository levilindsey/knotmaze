# K1218 S6: the stage's sheets. One per spot: rows 7474d09b / master / branch
# at the pulse moments t3-t6, then an at-rest row (master, branch), zoom 4.
#   & .\sheets_s6.ps1 [-Branch out/c] [-Spots "cross:80","x4:101@60,0",...]
param([string]$Branch = "out/c", [string[]]$Spots = @("cross:80", "x4:80", "cross:155", "cross:33", "loop:123", "x4:101@60,0", "cross:65", "loop:64", "loop:106", "cross:115", "loop:113"), [int]$Size = 72, [int]$Zoom = 4)
$here = $PSScriptRoot -replace '\\', '/'
$r7474 = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1211/out6/r7474"
$master = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1218/s4/out/b2"
$br = "$here/$Branch"
New-Item -ItemType Directory (Join-Path $PSScriptRoot "out/sheets") -Force | Out-Null
$t = "L0_t3.png,L0_t4.png,L0_t5.png,L0_t6.png"
foreach ($sp in $Spots) {
  $stand, $ji = $sp.Split(":", 2)
  $name = "${stand}_" + ($ji -replace '[@,]', '_')
  $out = "$here/out/sheets/$name.png"
  node "$here/../s4/sheets_s4.mjs" $out $Size $Zoom "$br/$stand/meta.json" $ji "$r7474/$stand|$t" "$master/$stand|$t" "$br/$stand|$t" "$master/$stand|np.png,$br/$stand/np.png" 2>&1 | Select-Object -Last 1
}
