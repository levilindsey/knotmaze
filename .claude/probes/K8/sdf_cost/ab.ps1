# K8 sdf cost: before/after bench. For each of the three links, one perf-lock
# hold runs bench_frame over base and fix, default and rp=sdf, 2 rounds (the
# order reversed each round: ABBA). Builds are served by
# ../sdf_gaps/serve.mjs "$env:TEMP\k8cost" 5700.
#   pwsh -File .claude/probes/K8/sdf_cost/ab.ps1 <base sha> <fix sha> [tag]
param([string]$Base, [string]$Fix, [string]$Tag = "ab")
$repo = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..")
Set-Location $repo
$links = [ordered]@{
  knot24 = "b&gs=24&wd=1&mf=0"
  dense  = "b&gs=24&wd=0.6&brd=0.6"
  maxfab = "b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5"
}
foreach ($name in $links.Keys) {
  $urls = @()
  foreach ($sha in @($Base, $Fix)) {
    $u = "http://127.0.0.1:5700/$sha/?$($links[$name])&am=instant&snd=none"
    $urls += $u
    $urls += "$u&rp=sdf"
  }
  $out = ".claude/probes/K8/sdf_cost/out/${Tag}_${name}.json"
  & (Join-Path $PSScriptRoot "..\sdf_gaps\locked.ps1") -What "K8 sdf cost: bench_frame $name $Base vs $Fix" -NodeArgs (@("scripts/bench_frame.mjs") + $urls + @("--sec", "4", "--rounds", "2", "--rest-ms", "30000", "--out", $out)) | Out-Null
  "DONE $name $(Get-Date -Format T)"
}
