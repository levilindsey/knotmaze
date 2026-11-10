$repo = "C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\agent-a6c9382c6e31ac415"
Set-Location $repo
$links = @("b&gs=24&wd=1&mf=0", "b&gs=24&wd=0.6&brd=0.6", "b&gs=24&wd=1&brd=1&ded=1&del=40&jsp=.5")
foreach ($sha in $args) {
  $urls = @()
  foreach ($l in $links) { $u = "http://127.0.0.1:5700/$sha/?$l&am=instant&snd=none"; $urls += $u; $urls += "$u&rp=sdf" }
  & .\.claude\probes\K8\sdf_gaps\locked.ps1 -What "K8 sdf cost: bench_frame $sha" -NodeArgs (@("scripts/bench_frame.mjs") + $urls + @("--sec","4","--rest-ms","30000","--out",".claude/probes/K8/sdf_cost/out/m_$sha.json")) | Out-Null
  "DONE $sha $(Get-Date -Format T)"
}
