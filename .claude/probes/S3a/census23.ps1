# K992 stage 4: the census of c23w (c21w with S the certified running minimum
# at fixed nodes), each run under the perf lock (locked23.ps1).
#   pwsh .claude/probes/S3a/census23.ps1 [-Only c23w,c23wz]
# m21/m21z: master's oracle (oracle_m14.ts) on this tree, to check that
# pops16/before16 still stands for master after the rebase onto 6b5c082a.
param([string]$Only = "c23w,c23wz")
$wt = "C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k992-corners"
Set-Location $wt
New-Item -ItemType Directory -Force .claude\probes\S3a\pops23 | Out-Null
$runs = @{
  c21w = "--oracle .claude/probes/S3a/oracle_c21w.ts --tag c21w";
  c21wz = "--oracle .claude/probes/S3a/oracle_c21w.ts --tag c21wz --windows";
  m21 = "--oracle .claude/probes/S3a/oracle_m14.ts --tag m21";
  m21z = "--oracle .claude/probes/S3a/oracle_m14.ts --tag m21z --windows";
  c23w = "--oracle .claude/probes/S3a/oracle_c23w.ts --tag c23w";
  c23wz = "--oracle .claude/probes/S3a/oracle_c23w.ts --tag c23wz --windows";
  c21w2 = "--oracle .claude/probes/S3a/oracle_c21w2.ts --tag c21w2";
  c21w2z = "--oracle .claude/probes/S3a/oracle_c21w2.ts --tag c21w2z --windows";
}
foreach ($tag in $Only.Split(",")) {
  $cmd = "node node_modules\vite-node\vite-node.mjs scripts\label_pops.ts def_drag,def_flow,muse_drag,muse_flow $($runs[$tag]) --out .claude/probes/S3a/pops23 --port 5392 *> .claude\probes\S3a\pops23\$tag.log"
  pwsh -NoProfile -File .claude\probes\S3a\locked23.ps1 -What "K992 s4 census $tag" -Cmd $cmd
  Write-Output "$tag done $(Get-Date -Format HH:mm:ss)"
}