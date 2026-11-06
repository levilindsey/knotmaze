# K1211 S1: every offline analysis of one shot set (no GPU, no lock needed).
#   & .claude/probes/K1211/run_analyze.ps1 [-Tag b607] [-Master eb476] [-Steps near,checks,grad,sheets,gold,wide,zero]
param(
  [string]$Tag = "b607",
  [string]$Master = "eb476",
  [string[]]$Steps = @("near", "checks", "grad", "sheets", "gold", "wide"),
  [hashtable]$Focus = @{ cross = 33; x4 = 149 }
)
$here = $PSScriptRoot
Push-Location $here
try {
  $sheets = Join-Path $here "out/sheets"
  New-Item -ItemType Directory $sheets -Force | Out-Null
  $stands = @("cross", "x4", "loop")
  # The records nearest each stand's focus point (CSS px); the loop's focus is the nearest.
  foreach ($s in $stands) {
    $meta = Join-Path $here "out/$Tag/$s/meta.json"
    if (-not (Test-Path $meta)) { "no $meta"; continue }
    $near = node -e "const m=require(process.argv[1]);const r=m.recs.map(q=>({ji:q.ji,d:Math.hypot(q.sx-m.fpt.x,q.sy-m.fpt.y),n:q.arms.length,routes:q.routes.length})).sort((a,b)=>a.d-b.d).slice(0,4);console.log(JSON.stringify(r))" $meta
    if ("near" -in $Steps) { "$s nearest to focus: $near" }
    if (-not $Focus.ContainsKey($s)) { $Focus[$s] = (($near | ConvertFrom-Json)[0]).ji }
  }
  foreach ($s in $stands) {
    $dir = "out/$Tag/$s"
    if (-not (Test-Path "$dir/meta.json")) { continue }
    if ("checks" -in $Steps) { "=== checks $s"; node analyze.mjs checks $dir }
    if ("grad" -in $Steps) { "=== grad $s ji $($Focus[$s])"; node analyze.mjs grad $dir $sheets $Focus[$s] }
    if ("sheets" -in $Steps) { "=== sheets $s ji $($Focus[$s])"; node analyze.mjs sheets $dir $sheets $Focus[$s] }
    if ("gold" -in $Steps) { "=== gold $s"; node analyze.mjs gold $dir $sheets }
    if ("wide" -in $Steps) { "=== wide $s"; node analyze.mjs wide $dir $sheets }
    if ("zero" -in $Steps) { "=== zero $s ($Tag vs $Master)"; node analyze.mjs zero $dir "out/$Master/$s" }
  }
} finally { Pop-Location }
