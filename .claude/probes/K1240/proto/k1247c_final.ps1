# K1247 (Claude's re-run of the Done checks on a run's final commit): every
# non-timing check, logs in out/k1247c_final/. Run from anywhere:
#   & .claude/probes/K1240/proto/k1247c_final.ps1 [-Base <Muse's out/k1247/base dir>]
param([string]$Base = "../../worktrees/muse-k1240-s1/.claude/probes/K1240/out/k1247/base")   # relative to .claude/probes/K1240/
$ErrorActionPreference = "Continue"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../../../..")).Path
$proto = ".claude/probes/K1240/proto"
$log = Join-Path $root ".claude/probes/K1240/out/k1247c_final"
New-Item -ItemType Directory $log -Force | Out-Null
Set-Location $root
function Run([string]$name, [string[]]$cmd) {
  $t = Get-Date
  & node @cmd *> (Join-Path $log "$name.txt")
  "$name exit $LASTEXITCODE $([int]((Get-Date) - $t).TotalSeconds)s" | Tee-Object -FilePath (Join-Path $log "index.txt") -Append
}
"start $(Get-Date -Format s) $(git rev-parse --short HEAD)" | Out-File (Join-Path $log "index.txt") -Encoding ascii
Run "verify" @("scripts/run_node.mjs", "$proto/k1247c_verify.ts")
Run "faces" @("scripts/run_node.mjs", "$proto/k1247c_faces.ts")
Run "coldwarm" @("scripts/run_node.mjs", "$proto/k1247c_coldwarm.ts")
Run "cmp_cold" @("scripts/run_node.mjs", "$proto/k1247_cmp.ts")
Run "cmp_warm" @("scripts/run_node.mjs", "$proto/k1247_cmp.ts", "--warm")
Run "cmp_move" @("scripts/run_node.mjs", "$proto/k1247_cmp.ts", "--move")
Run "structure" @("scripts/run_node.mjs", "$proto/k1247_structure.ts")
Run "pieces" @("scripts/run_node.mjs", "$proto/k1247_pieces.ts")
Run "move_def" @("scripts/run_node.mjs", "$proto/k1247_move.ts", "def")
Run "outline_test" @("scripts/run_node.mjs", "$proto/outline.test.ts")
Run "rows_still" @("scripts/run_node.mjs", "$proto/k1247_exact.ts", "--out=cfinal")
Run "rows_0.1" @("scripts/run_node.mjs", "$proto/k1247_exact.ts", "--out=cfinal", "--move=0.1")
Run "rows_0.5" @("scripts/run_node.mjs", "$proto/k1247_exact.ts", "--out=cfinal", "--move=0.5")
# cmp_consistent.mjs reads its paths relative to .claude/probes/K1240/ (it exits 0 on failures: read the log's last line).
$fin = "out/k1247/cfinal"
Run "cmprows_still" @("$proto/cmp_consistent.mjs", "0", "$Base/", "$fin/")
Run "cmprows_0.1" @("$proto/cmp_consistent.mjs", "0.1", "$Base/move0.1c_", "$fin/move0.1c_")
Run "cmprows_0.5" @("$proto/cmp_consistent.mjs", "0.5", "$Base/move0.5c_", "$fin/move0.5c_")
"end $(Get-Date -Format s)" | Out-File (Join-Path $log "index.txt") -Append -Encoding ascii
