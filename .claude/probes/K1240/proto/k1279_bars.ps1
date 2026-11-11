# K1279: the brief's bars, master (f0c1111c snapshots) and mine, logged to out/k1279/bars/<tag>/.
# Usage (from the worktree root): pwsh .claude/probes/K1240/proto/k1279_bars.ps1 [-Tag mine] [-SkipMaster]
param([string]$Tag = "mine", [switch]$SkipMaster)
$ErrorActionPreference = "Continue"
$root = (Get-Location).Path
$proto = ".claude/probes/K1240/proto"
$log = Join-Path $root ".claude/probes/K1240/out/k1279/bars/$Tag"
New-Item -ItemType Directory -Force $log | Out-Null
function Run([string]$name, [string[]]$a) {
  $t0 = Get-Date
  & node scripts/run_node.mjs @a *> (Join-Path $log "$name.txt")
  "$name exit $LASTEXITCODE in $([int]((Get-Date) - $t0).TotalSeconds) s" | Tee-Object -Append (Join-Path $log "_runs.txt")
}
if (-not $SkipMaster) { Run "dump_master" @("$proto/k1279_dump_base.ts", "k1279_dmaster") }
Run "dump_mine" @("$proto/k1247c_dump.ts", "k1279_d$Tag")
Run "s14_census" @("$proto/k1247s14_census.ts", "k1279_dmaster", "k1279_d$Tag")
Run "s5_cmp" @("$proto/k1247s5_cmp.ts", "--tag=k1279$Tag")
foreach ($c in @("", "10", "18")) {
  $sfx = if ($c) { "_cyc$c" } else { "_still" }
  $ca = if ($c) { @("--cyc=$c") } else { @() }
  Run "union_mine$sfx" (@("$proto/k1247s9_union.ts", "--d=0.001,0.01") + $ca)
  if (-not $SkipMaster) { Run "union_master$sfx" (@("$proto/k1279_union_base.ts", "--d=0.001,0.01") + $ca) }
}
"done" | Tee-Object -Append (Join-Path $log "_runs.txt")
