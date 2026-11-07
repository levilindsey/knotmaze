# K1220 S6: whole-frame diffs at rest, master vs mine, per stand, with
# per-fork attribution (diff_forks.mjs). Maze stands have no text forks:
# every changed px there is "beyond".
#   & .claude/probes/K1220/s3/diff_all.ps1 [-RadiusFh 5]
param([double]$RadiusFh = 5)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
New-Item -ItemType Directory "out/diff" -Force | Out-Null
foreach ($st in @("a_xh3", "a_xh2", "ai_xh3", "ai_xh2", "i_xh3", "i_xh2", "ia_xh3", "ia_xh2", "aa_xh3", "aa_xh2", "ii_xh3", "ii_xh2", "maze_x4", "maze_cross", "maze_loop")) {
  $pa = "out/shots/base/$st/rest.png"; $pb = "out/shots/mine/$st/rest.png"; $meta = "out/shots/mine/$st/meta.json"
  if (-not ((Test-Path $pa) -and (Test-Path $pb) -and (Test-Path $meta))) { "skip ${st}: missing shots/meta"; continue }
  node diff_forks.mjs $pa $pb $meta $RadiusFh
  node absdiff.mjs $pa $pb "out/diff/$st.png" 4 $meta $RadiusFh | Out-Null
}
