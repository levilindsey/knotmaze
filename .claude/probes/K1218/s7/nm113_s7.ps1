# K1218 S7: loop ji 113 without markers (S5 judged its section edge on
# no-marker shots: on the marked sheets the head marker covers the centre).
# Shots, one per build, under the perf lock (master's copy on 5983, this
# branch on 5982):
#   & .\locked_s7.ps1 -What "nomark loop 113 master" -Host5 http://127.0.0.1:5983 -NodeArgs @("../s5/live_s5.mjs","loop","out/nomark_l113_m","../s5/nomark_s5.mjs","1826,144","72","6","l113")
#   & .\locked_s7.ps1 -What "nomark loop 113 branch" -Host5 http://127.0.0.1:5982 -NodeArgs @("../s5/live_s5.mjs","loop","out/nomark_l113_b","../s5/nomark_s5.mjs","1826,144","72","6","l113")
# Then this script copies each build's full frames beside its loop meta.json
# (out/nm113/<m|b>/) and draws two sheets: rows master / branch at t0-t3 and
# t4-t7 plus np and the marked t0 (loop_113_nomark.png, zoom 4), and the band
# above the centre where master's staircase sits (loop_113_nomark_top.png,
# 113@0,-30, zoom 6).
param([string]$Mine = "out/nomark_l113_b", [string]$Master = "out/nomark_l113_m")
$here = $PSScriptRoot
$src = @{
  m = @((Join-Path $here $Master), "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K1218/s4/out/b2/loop/meta.json")
  b = @((Join-Path $here $Mine), (Join-Path $here "out/b2/loop/meta.json"))
}
foreach ($k in "m", "b") {
  $d = Join-Path $here "out/nm113/$k"
  New-Item -ItemType Directory $d -Force | Out-Null
  Get-ChildItem $src[$k][0] -Filter "l113_*.png" | Where-Object { $_.Name -ne "l113_sheet.png" } | ForEach-Object { Copy-Item $_.FullName (Join-Path $d $_.Name) -Force }
  Copy-Item $src[$k][1] (Join-Path $d "meta.json") -Force
}
$nm = ("$here/out/nm113" -replace '\\', '/')
$sh = ("$here/out/sheets" -replace '\\', '/')
New-Item -ItemType Directory (Join-Path $here "out/sheets") -Force | Out-Null
$a = "l113_t0.png,l113_t1.png,l113_t2.png,l113_t3.png"; $c = "l113_t4.png,l113_t5.png,l113_t6.png,l113_t7.png"
node "$here/../s4/sheets_s4.mjs" "$sh/loop_113_nomark.png" 72 4 "$nm/b/meta.json" "113" "$nm/m|$a" "$nm/b|$a" "$nm/m|$c" "$nm/b|$c" "$nm/m|l113_np.png,$nm/b/l113_np.png,$nm/m/l113_t0_marks.png,$nm/b/l113_t0_marks.png" 2>&1 | Select-Object -Last 1
node "$here/../s4/sheets_s4.mjs" "$sh/loop_113_nomark_top.png" 48 6 "$nm/b/meta.json" "113@0,-30" "$nm/m|l113_t0.png,l113_t3.png,l113_t4.png,l113_t5.png" "$nm/b|l113_t0.png,l113_t3.png,l113_t4.png,l113_t5.png" "$nm/m|l113_t6.png,l113_t7.png,l113_np.png" "$nm/b|l113_t6.png,l113_t7.png,l113_np.png" 2>&1 | Select-Object -Last 1
