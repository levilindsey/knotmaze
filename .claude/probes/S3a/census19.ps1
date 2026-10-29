# K1000 stage 1: the census of the new caps (step 3), each run under the perf lock.
#   pwsh .claude/probes/S3a/census19.ps1 [-Only m19,m19z,c19f,c19fz,m19b,m19bz,c19fb,c19fbz]
param([string]$Only = "m19,m19z,c19f,c19fz")
$wt = "C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k992-corners"
Set-Location $wt
New-Item -ItemType Directory -Force .claude\probes\S3a\pops19 | Out-Null
$runs = @{
  m19 = "--oracle .claude/probes/S3a/oracle_m19.ts --tag m19";
  m19z = "--oracle .claude/probes/S3a/oracle_m19.ts --tag m19z --windows";
  c19f = "--oracle .claude/probes/S3a/oracle_c19f.ts --tag c19f";
  c19fz = "--oracle .claude/probes/S3a/oracle_c19f.ts --tag c19fz --windows";
  m19b = "--oracle .claude/probes/S3a/oracle_m19b.ts --tag m19b";
  m19bz = "--oracle .claude/probes/S3a/oracle_m19b.ts --tag m19bz --windows";
  c19fb = "--oracle .claude/probes/S3a/oracle_c19fb.ts --tag c19fb";
  c19fbz = "--oracle .claude/probes/S3a/oracle_c19fb.ts --tag c19fbz --windows";
}
foreach ($tag in $Only.Split(",")) {
  $cmd = "node node_modules\vite-node\vite-node.mjs scripts\label_pops.ts def_drag,def_flow,muse_drag,muse_flow $($runs[$tag]) --out .claude/probes/S3a/pops19 --port 5392 *> .claude\probes\S3a\pops19\$tag.log"
  pwsh -NoProfile -File .claude\probes\S3a\locked19.ps1 -What "K1000 census $tag" -Cmd $cmd
  Write-Output "$tag done $(Get-Date -Format HH:mm:ss)"
}