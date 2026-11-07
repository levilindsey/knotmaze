# K1220 S5: whole-frame diffs of master against mine at rest (absdiff.mjs),
# every text stand (with mine's meta: changed px within 3 fh of a text fork,
# and beyond every one) and the maze's x4, cross and loop stands (no text
# forks: every changed px is "beyond"). Writes out/diff/<stand>.png.
# The radius is 5 fh: a record's field reaches max(1.25 cr fh, 2 fh) + 0.25
# world along each arm (joinery.ts fieldReach), about 4.7 fh on the text
# stands (fh 0.26 world), so its blend changes pixels past 3 fh.
#   & .claude/probes/K1220/s3/absdiff_all.ps1 [-RadiusFh 5]
param([double]$RadiusFh = 5)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
New-Item -ItemType Directory "out/diff" -Force | Out-Null
foreach ($st in @("a_xh3", "a_xh2", "ai_xh3", "ai_xh2", "i_xh3", "i_xh2", "ia_xh3", "ia_xh2", "aa_xh3", "aa_xh2", "ii_xh3", "ii_xh2", "maze_x4", "maze_cross", "maze_loop")) {
  $pa = "out/shots/master/$st/rest.png"; $pb = "out/shots/mine/$st/rest.png"
  if (-not ((Test-Path $pa) -and (Test-Path $pb))) { "skip ${st}: missing shots"; continue }
  $res = node absdiff.mjs $pa $pb "out/diff/$st.png" 4 "out/shots/mine/$st/meta.json" $RadiusFh
  "${st}: $($res -join ' | ')"
}
