# K992 stage 3: the census of c21w (c21's tracked feet on K1000's continuous
# caps with the solved part walk), each run under the perf lock (locked21.ps1).
#   pwsh .claude/probes/S3a/census21.ps1 [-Only c21w,c21wz,m21,m21z]
# m21/m21z: master's oracle (oracle_m14.ts) on this tree, to check that
# pops16/before16 still stands for master after the rebase onto 6b5c082a.
param([string]$Only = "c21w,c21wz")
$wt = "C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k992-corners"
Set-Location $wt
New-Item -ItemType Directory -Force .claude\probes\S3a\pops21 | Out-Null
$runs = @{
  c21w = "--oracle .claude/probes/S3a/oracle_c21w.ts --tag c21w";
  c21wz = "--oracle .claude/probes/S3a/oracle_c21w.ts --tag c21wz --windows";
  m21 = "--oracle .claude/probes/S3a/oracle_m14.ts --tag m21";
  m21z = "--oracle .claude/probes/S3a/oracle_m14.ts --tag m21z --windows";
  c21w2 = "--oracle .claude/probes/S3a/oracle_c21w2.ts --tag c21w2";
  c21w2z = "--oracle .claude/probes/S3a/oracle_c21w2.ts --tag c21w2z --windows";
}
foreach ($tag in $Only.Split(",")) {
  $cmd = "node node_modules\vite-node\vite-node.mjs scripts\label_pops.ts def_drag,def_flow,muse_drag,muse_flow $($runs[$tag]) --out .claude/probes/S3a/pops21 --port 5392 *> .claude\probes\S3a\pops21\$tag.log"
  pwsh -NoProfile -File .claude\probes\S3a\locked21.ps1 -What "K992 s3 census $tag" -Cmd $cmd
  Write-Output "$tag done $(Get-Date -Format HH:mm:ss)"
}