# K8 sdf cost: 4x crops of Handoff 1's spots (K8_sdf_gaps.md), from verify.ps1's
# shots. Each crop is three panels: the fix's default, the fix's rp=sdf, the
# base's rp=sdf (knot gs 24 and dense: same state, ss_ab's 1400x900 dsf 1;
# max fabric: diag_screenshot's 1600x900 dsf 1.5, not same state).
#   pwsh -File .claude/probes/K8/sdf_cost/crops.ps1 [-In <shots dir>] [-Out <crops dir>]
# (the phone stage: -In .claude/probes/K8/sdf_phone/out/ss_B -Out .../crops_B)
param([string]$In = ".claude/probes/K8/sdf_cost/out/ss", [string]$Out = ".claude/probes/K8/sdf_cost/out/crops")
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
Set-Location $repo
$o = $In
$c = $Out
New-Item -ItemType Directory $c -Force | Out-Null
$crop = ".claude/probes/K8/sdf_gaps/crop.mjs"
$jobs = @(
  @("knot24_center", 640, 400, "$o/fix_knot24_A.png", "$o/fix_knot24_B.png", "$o/xs_knot24_B.png"),
  @("knot24_border", 292, 40, "$o/fix_knot24_A.png", "$o/fix_knot24_B.png", "$o/xs_knot24_B.png"),
  @("dense_center", 640, 400, "$o/fix_dense_A.png", "$o/fix_dense_B.png", "$o/xs_dense_B.png"),
  @("maxfab_weave", 780, 960,"$o/maxfab_fix_base.png", "$o/maxfab_fix_sdf.png", "$o/maxfab_master_sdf.png"),
  @("maxfab_crumple", 700, 150, "$o/maxfab_fix_base.png", "$o/maxfab_fix_sdf.png", "$o/maxfab_master_sdf.png")
)
foreach ($j in $jobs) {
  "== $($j[0])"
  node $crop "$c/$($j[0]).png" $j[1] $j[2] 150 110 4 $j[3] $j[4] $j[5]
}
