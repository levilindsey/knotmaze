# K1040 S3g (K1097): the label pass's structural levers, timed on the Pixel.
# Copied from s3f5_gate.ps1. The levers (page.ts, beside ftentv):
#   ftentvnops  no ps table: the span record recomputed in the vertex
#               shaders from uSpan (one fewer texture, the pts-sized
#               upload beside pts gone; label_b_pass.ts probeNoPs)
#   ftentvclrd  the clears as one fullscreen draw: L and D invalidated
#               at the bind, a triangle writes word 0 at depth 1
#   ftentvd16   depth a DEPTH_COMPONENT16 renderbuffer
# Each kept lever's readback must equal ftentv's at 0 px on the 12
# scenes (s3.mjs check, out/check_*_summary via the check runs) before
# it is timed. The desktop part: the split page (timeMany: ftentv
# beside ftentvsetup, fempty and ffloor and the three levers) on all
# 12 scenes, run twice (tags s3gd1, s3gd2) through run_locked_s3g.ps1
# (lock owner K1040-S3g); then out/split_s3g_desktop.md (split.mjs,
# set s3g: S3f4's columns, one difference column per lever, a gate
# column per pass). The desktop ranks nothing for the Pixel.
# The phone part is one batch through phone_batch_s3g.ps1 (run_phone_
# s3g.ps1: the phone and perf locks, owner K1040-S3g, K1142's ready
# check), stopping at the first non-zero exit: the split page twice
# (labels s3ga, s3gb, the same variants), then s3f3new (today's pass,
# --b2b --mode tentv --lean --state host) and s3ffloorall, so the
# gate's numbers share the phone's state. Then the tables:
# out/split_s3g.md (split.mjs s3ga, set s3g, second run s3gb) and
# out/phone_table_s3g.md (phone_table.ps1 -Upload, written by
# phone_batch_s3g.ps1 as phone_table_<Name>.md).
# THE GATE'S COST per scene is a pass's sync p50 - the floor's p50 +
# its upload p50 (split_s3g.md's gate columns; phone_table_s3g.md's
# last column for today's pass), against 2 ms on every scene (K1097).
# A lever becomes the pass's default when it lowers the gate number
# on at least 10 of 12 scenes by more than the batch's run-to-run
# difference (the split's d columns); the rest are removed.
# -DryRun touches no phone and takes no lock. -SkipDesktop / -SkipPhone
# run one half.
# Usage: & .claude\probes\K1040\s3\s3g_gate.ps1 [-DryRun] [-SkipDesktop] [-SkipPhone] [-PhoneRuns n]
param([int]$MaxWaitMin = 15, [switch]$DryRun, [switch]$SkipDesktop, [switch]$SkipPhone, [int]$PhoneRuns = 0)
$s3 = $PSScriptRoot
$worktree = (Resolve-Path (Join-Path $s3 '..\..\..\..')).Path
$outDir = Join-Path $s3 'out'
function Say([string]$m) { "$(Get-Date -Format HH:mm:ss) $m" }

$variants = 'ftentv,ftentvsetup,fempty,ffloor,ftentvnops,ftentvclrd,ftentvd16'
$desktop = @(
  @('s3gd1', @('many', '--variants', $variants, '--tag', 's3gd1')),
  @('s3gd2', @('many', '--variants', $variants, '--tag', 's3gd2'))
)
$phone = @(
  "--fit 411x753 --label s3ga --variants $variants",
  "--fit 411x753 --label s3gb --variants $variants",
  '--fit 411x753 --label s3f3new --b2b --mode tentv --lean --state host',
  '--fit 411x753 --label s3ffloorall --b2b --floor'
)
$tables = @(
  's3f3new s3ffloorall -Floor s3ffloorall -Upload'
)
if ($PhoneRuns -gt 0) {
  $phone = @($phone | Select-Object -First $PhoneRuns)
  $have = @($phone | ForEach-Object { if ($_ -match '--label (\S+)') { $Matches[1] } })
  $tables = @($tables | Where-Object { @($_ -split '\s+' | Where-Object { $_ -and $_ -notmatch '^-' } | Where-Object { $have -notcontains $_ }).Count -eq 0 })
}

if (-not $SkipDesktop) {
  Say "desktop$(if ($DryRun) { ' (dry run: printed, not run)' })"
  foreach ($t in $desktop) {
    $a = $t[1]
    if ($DryRun) { Say "  would run: run_locked_s3g.ps1 -RunArgs $($a -join ' ')"; continue }
    & (Join-Path $s3 'run_locked_s3g.ps1') -RunArgs $a -MaxWaitMin $MaxWaitMin 2>&1 | Select-String -Pattern 'errors|lock' | ForEach-Object { Say "  $_" }
    if ($LASTEXITCODE -ne 0) { Say "STOP: desktop run $($t[0]) exit $LASTEXITCODE"; exit 11 }
  }
  if ($DryRun) { Say "  would run: node split.mjs s3gd1 out/split_s3g_desktop.md s3g s3gd2" }
  else {
    & node (Join-Path $s3 'split.mjs') s3gd1 (Join-Path $outDir 'split_s3g_desktop.md') s3g s3gd2 | Select-Object -First 3 | ForEach-Object { Say "  $_" }
  }
}

if (-not $SkipPhone) {
  if ($DryRun) {
    Say 'phone (dry run: phone_time.mjs --dry, no adb, no lock)'
    Push-Location $worktree
    try {
      foreach ($r in $phone) {
        $runArgs = @($r -split '\s+' | Where-Object { $_ })
        $global:LASTEXITCODE = 0
        $o = @(& node (Join-Path $s3 'phone_time.mjs') @runArgs --dry 2>&1)
        $o | Where-Object { "$_" -notmatch 'inlineDynamicImports' } | Select-Object -Last 2 | ForEach-Object { Say "  $_" }
        if ($LASTEXITCODE -ne 0) { Say "STOP: phone_time --dry exit $LASTEXITCODE"; exit 11 }
      }
    } finally { Pop-Location }
    Say 'tables (from the files in out/)'
    foreach ($line in $tables) {
      $targs = @($line -split '\s+' | Where-Object { $_ })
      $pos = @(); $fl = ''; $upl = $false
      for ($i = 0; $i -lt $targs.Count; $i++) { if ($targs[$i] -eq '-Floor') { $fl = $targs[++$i] } elseif ($targs[$i] -eq '-Upload') { $upl = $true } else { $pos += $targs[$i] } }
      & (Join-Path $s3 'phone_table.ps1') @pos -Floor $fl -Upload:$upl | Select-Object -First 3
    }
    Say '  would run after the batch: node split.mjs s3ga out/split_s3g.md s3g s3gb'
  } else {
    & (Join-Path $s3 'phone_batch_s3g.ps1') -Name s3g -MaxWaitMin $MaxWaitMin -Runs $phone -Tables $tables
    $code = $LASTEXITCODE
    if ($code -ne 0) { Say "phone batch exit $code"; exit $code }
    & node (Join-Path $s3 'split.mjs') s3ga (Join-Path $outDir 'split_s3g.md') s3g s3gb | Select-Object -First 3
  }
}
exit 0
