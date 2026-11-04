# K1040 S3f4 (K1097): what bounds the label pass's drawing. Copied from
# s3f3_gate.ps1. The desktop part is S3f4's step 3: the split page
# (timeMany: ftentv beside ftentvsetup, fempty and ffloor and the six
# S3f4 variants ftentvone, ftentvhalf, ftentvclip, ftentvflat,
# ftentvnw1c, ftentvvid) on all 12 scenes, run twice (tags s3f4d1,
# s3f4d2), each s3.mjs run through run_locked.ps1 (the perf lock);
# then out/split_s3f4_desktop.md (split.mjs, set s3f4: per scene and
# run, every column with the two runs' difference beside it). The
# desktop ranks nothing for the Pixel: it proves the variants time.
# The phone part is one batch through phone_batch.ps1 (the phone and
# perf locks, K1142's ready check, 15-minute lock waits), stopping at
# the first non-zero exit: the split page twice (labels s3f4a, s3f4b,
# the same variants), then s3f3new and s3ffloorall, so the gate's
# numbers share the phone's state. Then the tables:
# out/split_s3f4.md (split.mjs s3f4a, set s3f4, second run s3f4b) and
# out/phone_table_s3f4.md (phone_table.ps1 -Upload, written by
# phone_batch.ps1 as phone_table_<Name>.md).
# THE GATE'S COST per scene is phone_table_s3f4.md's last column,
# "s3f3new - s3ffloorall + upload", against 2 ms on every scene
# (K1097's gate; S3f4 adopts no lever and moves no default pixel, so
# the Pixel batch only re-times today's pass and fills the split).
# -DryRun touches no phone and takes no lock. -SkipDesktop / -SkipPhone
# run one half.
# Usage: & .claude\probes\K1040\s3\s3f4_gate.ps1 [-DryRun] [-SkipDesktop] [-SkipPhone] [-PhoneRuns n]
param([int]$MaxWaitMin = 15, [switch]$DryRun, [switch]$SkipDesktop, [switch]$SkipPhone, [int]$PhoneRuns = 0)
$s3 = $PSScriptRoot
$worktree = (Resolve-Path (Join-Path $s3 '..\..\..\..')).Path
$outDir = Join-Path $s3 'out'
function Say([string]$m) { "$(Get-Date -Format HH:mm:ss) $m" }

$variants = 'ftentv,ftentvsetup,fempty,ffloor,ftentvone,ftentvhalf,ftentvclip,ftentvflat,ftentvnw1c,ftentvvid'
$desktop = @(
  @('s3f4d1', @('many', '--variants', $variants, '--tag', 's3f4d1')),
  @('s3f4d2', @('many', '--variants', $variants, '--tag', 's3f4d2'))
)
# The gate's runs beside the two split pages.
$phone = @(
  "--fit 411x753 --label s3f4a --variants $variants",
  "--fit 411x753 --label s3f4b --variants $variants",
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
    if ($DryRun) { Say "  would run: run_locked.ps1 -RunArgs $($a -join ' ')"; continue }
    & (Join-Path $s3 'run_locked.ps1') -RunArgs $a -MaxWaitMin $MaxWaitMin 2>&1 | Select-String -Pattern 'errors|lock' | ForEach-Object { Say "  $_" }
    if ($LASTEXITCODE -ne 0) { Say "STOP: desktop run $($t[0]) exit $LASTEXITCODE"; exit 11 }
  }
  if ($DryRun) { Say "  would run: node split.mjs s3f4d1 out/split_s3f4_desktop.md s3f4 s3f4d2" }
  else {
    & node (Join-Path $s3 'split.mjs') s3f4d1 (Join-Path $outDir 'split_s3f4_desktop.md') s3f4 s3f4d2 | Select-Object -First 3 | ForEach-Object { Say "  $_" }
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
    Say '  would run after the batch: node split.mjs s3f4a out/split_s3f4.md s3f4 s3f4b'
  } else {
    & (Join-Path $s3 'phone_batch.ps1') -Name s3f4 -MaxWaitMin $MaxWaitMin -Runs $phone -Tables $tables
    $code = $LASTEXITCODE
    if ($code -ne 0) { Say "phone batch exit $code"; exit $code }
    & node (Join-Path $s3 'split.mjs') s3f4a (Join-Path $outDir 'split_s3f4.md') s3f4 s3f4b | Select-Object -First 3
  }
}
exit 0
