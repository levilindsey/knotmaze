# K1240 S3f (Claude): every node-side check in one run, compact summary.
#   pwsh .claude/probes/K1240/proto/s3f_claude_checks.ps1 -Tag <name> [-Skip move,sweep]
# Logs go to out/s3f/logs_<Tag>/. Run from the worktree root.
param([string]$Tag = "run", [string[]]$Skip = @())
$ErrorActionPreference = "Continue"
$root = (Resolve-Path "$PSScriptRoot/../../../..").Path
Set-Location $root
$p = ".claude/probes/K1240/proto"
$log = ".claude/probes/K1240/out/s3f/logs_$Tag"
New-Item -ItemType Directory $log -Force | Out-Null
function Run([string]$name, [string[]]$cmd) {
  $t0 = Get-Date
  & node @cmd *> "$log/$name.log"
  "{0,-14} exit {1} {2:n0}s" -f $name, $LASTEXITCODE, ((Get-Date) - $t0).TotalSeconds
}
Run "tests" @("scripts/run_node.mjs", "$p/outline.test.ts")
Select-String -Path "$log/tests.log" -Pattern "pass|fail|ok " | Select-Object -Last 3 | ForEach-Object { "  " + $_.Line.Trim() }
Run "structure" @("scripts/run_node.mjs", "$p/s3f_structure.ts")
Get-Content "$log/structure.log" | Select-Object -Last 2 | ForEach-Object { "  $_" }
Run "pieces" @("scripts/run_node.mjs", "$p/s3f_pieces.ts")
Get-Content "$log/pieces.log" | Select-Object -Last 16 | ForEach-Object { "  $_" }
if ($Skip -notcontains "rigid") {
  Run "move_rigid" @("scripts/run_node.mjs", "$p/s3f_move.ts")
  Get-Content "$log/move_rigid.log" | Select-Object -Last 3 | ForEach-Object { "  $_" }
}
Run "exact" @("scripts/run_node.mjs", "$p/s3f_exact.ts")
& node "$p/cmp_s3f.mjs" exact *> "$log/cmp_exact.log"
Get-Content "$log/cmp_exact.log" | Where-Object { $_ -match "FAIL|TOLERANCE" } | ForEach-Object { "  $_" }
if ($Skip -notcontains "move") {
  Run "exact_m01" @("scripts/run_node.mjs", "$p/s3f_exact.ts", "--move=0.1")
  & node "$p/cmp_s3f.mjs" move 0.1 *> "$log/cmp_move01.log"
  Get-Content "$log/cmp_move01.log" | Where-Object { $_ -match "FAIL|TOLERANCE" } | ForEach-Object { "  m0.1 $_" }
  Run "exact_m05" @("scripts/run_node.mjs", "$p/s3f_exact.ts", "--move=0.5", "def,ring,fat")
  & node "$p/cmp_s3f.mjs" move 0.5 *> "$log/cmp_move05.log"
  Get-Content "$log/cmp_move05.log" | Where-Object { $_ -match "FAIL|TOLERANCE" } | ForEach-Object { "  m0.5 $_" }
}
if ($Skip -notcontains "sweep") {
  Run "sweep" @("scripts/run_node.mjs", "$p/s3f_sweep.ts")
  Get-Content "$log/sweep.log" | Select-Object -Last 6 | ForEach-Object { "  $_" }
}
