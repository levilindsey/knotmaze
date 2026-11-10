# K1240 S3f (Claude): every node-side check in one run, compact summary.
#   pwsh .claude/probes/K1240/proto/s3f_claude_checks.ps1 -Tag <name> [-Skip move,sweep,rigid] [-Base]
# Logs go to out/s3f/logs_<Tag>/. Run from the worktree root.
# Round 4 (the coordinator's decisions 1 and 2 after Handoff 3): the moved rows run
# on the consistent S' (s3f_exact.ts's only S' now), and every row's baseline is
# S3d's code through the same harness (s3f_exact_s3dbase.ts): still rows against
# out/s3f/s3dfresh0c_, moved rows against s3dfresh0.1c_ / s3dfresh0.5c_.
# -Base re-makes those baselines first (needed once per form B change: K1257
# changed form B's corners), recreating the untracked outline_s3d.ts if missing.
param([string]$Tag = "run", [string[]]$Skip = @(), [switch]$Base)
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
function Cmp([string]$name, [string]$mult, [string]$aPre, [string]$bPre, [string]$label) {
  & node "$p/cmp_consistent.mjs" $mult $aPre $bPre *> "$log/$name.log"
  Get-Content "$log/$name.log" | Where-Object { $_ -match "FAIL|TOLERANCE|missing" } | ForEach-Object { "  $label $_" }
}
if ($Base) {
  if (-not (Test-Path "$p/outline_s3d.ts")) {
    & node -e "require('fs').writeFileSync('$p/outline_s3d.ts', require('child_process').execSync('git show 5290da82:$p/outline.ts'))"
  }
  Run "base_still" @("scripts/run_node.mjs", "$p/s3f_exact_s3dbase.ts", "--move=0", "--fresh")
  Run "base_m01" @("scripts/run_node.mjs", "$p/s3f_exact_s3dbase.ts", "--move=0.1", "--fresh")
  Run "base_m05" @("scripts/run_node.mjs", "$p/s3f_exact_s3dbase.ts", "--move=0.5", "--fresh", "def,ring,fat")
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
Cmp "cmp_exact" "0" "out/s3f/s3dfresh0c_" "out/s3f/" "still"
if ($Skip -notcontains "move") {
  Run "exact_m01" @("scripts/run_node.mjs", "$p/s3f_exact.ts", "--move=0.1")
  Cmp "cmp_move01" "0.1" "out/s3f/s3dfresh0.1c_" "out/s3f/move0.1c_" "m0.1"
  Run "exact_m05" @("scripts/run_node.mjs", "$p/s3f_exact.ts", "--move=0.5", "def,ring,fat")
  Cmp "cmp_move05" "0.5" "out/s3f/s3dfresh0.5c_" "out/s3f/move0.5c_" "m0.5"
}
if ($Skip -notcontains "sweep") {
  Run "sweep" @("scripts/run_node.mjs", "$p/s3f_sweep.ts")
  Get-Content "$log/sweep.log" | Select-Object -Last 6 | ForEach-Object { "  $_" }
}
