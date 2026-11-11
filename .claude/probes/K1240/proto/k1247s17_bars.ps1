# K1247 s17: every bar of the s17 brief for one outline config, logged to
# out/s17/bars/<Tag>/ (the k1279 bars via k1279_bars.ps1, then k1279_motion
# still and cyc 10 / 18, k1277_census rest and motion def). Env switches pass
# through (-JA 0 is master's behaviour: no junction alignment).
# Usage (from the worktree root):
#   pwsh .claude/probes/K1240/proto/k1247s17_bars.ps1 -Tag s17ja [-JA 1] [-CB 0] [-XS 0]
param([string]$Tag = "s17", [string]$JA = "1", [string]$CB = "0", [string]$XS = "0")
$ErrorActionPreference = "Continue"
$env:K17_JA = $JA; $env:K16_CB = $CB; $env:K17_XS = $XS
$root = (Get-Location).Path
$proto = ".claude/probes/K1240/proto"
$log = Join-Path $root ".claude/probes/K1240/out/s17/bars/$Tag"
New-Item -ItemType Directory -Force $log | Out-Null
$runs = Join-Path $log "_runs.txt"
"K17_JA=$JA K16_CB=$CB K17_XS=$XS start $(Get-Date -Format HH:mm:ss)" | Out-File -Encoding utf8 $runs
& pwsh -NoProfile -File "$proto/k1279_bars.ps1" -Tag $Tag -SkipMaster *> (Join-Path $log "k1279_bars.txt")
"k1279_bars exit $LASTEXITCODE $(Get-Date -Format HH:mm:ss)" | Out-File -Append -Encoding utf8 $runs
function Run([string]$name, [string[]]$a) {
  $t0 = Get-Date
  & node scripts/run_node.mjs @a *> (Join-Path $log "$name.txt")
  "$name exit $LASTEXITCODE in $([int]((Get-Date) - $t0).TotalSeconds) s" | Out-File -Append -Encoding utf8 $runs
}
Run "motion_still" @("$proto/k1279_motion.ts", "--d=0.001,0.01", "--list")
Run "motion_cyc10" @("$proto/k1279_motion.ts", "--d=0.001,0.01", "--cyc=10", "--list")
Run "motion_cyc18" @("$proto/k1279_motion.ts", "--d=0.001,0.01", "--cyc=18", "--list")
Run "k1277_rest" @("$proto/k1277_census.ts", "rest")
Run "k1277_motion_def" @("$proto/k1277_census.ts", "motion", "def")
"done $(Get-Date -Format HH:mm:ss)" | Out-File -Append -Encoding utf8 $runs
