# K1040 S3f step 4: the gate's batch, modeled on s3e_gate.ps1. The desktop
# first (each s3.mjs run through run_locked.ps1: the perf lock), then the
# Pixel through phone_batch.ps1 (the phone and perf locks, K1142's ready
# check, 15-minute lock waits), stopping at the first non-zero exit.
#   Desktop: the census (verdict) of the new pass (s3fnew: K1158, no state
#   queries), today's tentv (s3fq: S3e's query and restore) and the control
#   (s3fctl, s3fctllean: the capsule pass, live state); then time (the GPU
#   timer query, and the upload calls' main-thread time beside it) for the new
#   pass, today's tentv and the control fit, moving and at rest.
#   Pixel: the split on one page (s3f1: the new empty pass beside S3e's, the
#   ideal family, the new tentv's setup and drawing), then the new pass
#   (s3fnew, a Pixi host on the page's context), floorall, the host floor,
#   today's tentv, the control fit, and the new pass at rest.
# Then the tables: out/phone_table_s3f.md (phone_table.ps1 -Upload),
# out/split_s3f1.md (split.mjs s3f1) and out/desktop_table_s3f.md.
# THE GATE'S COST per scene is phone_table_s3f.md's last column,
# "s3fnew - s3ffloorall + upload": the Pixel's sync p50 minus floorall's p50,
# plus the upload calls' p50 (the sync does not see them). On the desktop it
# is desktop_table_s3f.md's "gpu + up" columns.
# -DryRun touches no phone and takes no lock: each phone run goes to
# phone_time.mjs --dry (bundles the page; no adb call), the desktop commands
# are printed, not run, and the tables are built from the files already in out/.
# -SkipDesktop / -SkipPhone run one half.
# Usage: & .claude\probes\K1040\s3\s3f_gate.ps1 [-DryRun] [-SkipDesktop] [-SkipPhone]
param([int]$MaxWaitMin = 15, [switch]$DryRun, [switch]$SkipDesktop, [switch]$SkipPhone)
$s3 = $PSScriptRoot
$worktree = (Resolve-Path (Join-Path $s3 '..\..\..\..')).Path
$outDir = Join-Path $s3 'out'
function Say([string]$m) { "$(Get-Date -Format HH:mm:ss) $m" }

$phone = @(
  '--fit 411x753 --label s3f1 --variants ideal,ideal32f,ideal32fz,ideal32fk,ideal32fd,ideal32fr,leanempty,leanemptyns,leanemptynoupns,fempty,femptynoup,femptynouph0,ftentvsetup,leantentv,ftentv,floor,ffloor',
  '--fit 411x753 --label s3fnew --b2b --mode tentv --lean --state host',
  '--fit 411x753 --label s3ffloorall --b2b --floor',
  '--fit 411x753 --label s3ffloorhost --b2b --floor --state host',
  '--fit 411x753 --label s3ftentv --b2b --mode tentv --lean',
  '--fit 411x753 --label s3ffit --b2b',
  '--fit 411x753 --label s3fnewrest --b2b --mode tentv --lean --rest --state host'
)
$tables = @(
  's3fnew s3ftentv s3fnewrest s3ffit s3ffloorall s3ffloorhost -Floor s3ffloorall -Upload',
  's3fnew s3ffloorhost -Floor s3ffloorhost -Upload',
  's3ftentv s3ffloorall -Floor s3ffloorall -Upload'
)
$verdicts = @(
  @('s3fnew', @('--mode', 'tentv', '--lean', '1', '--state', 'new')),
  @('s3fq', @('--mode', 'tentv', '--lean', '1')),
  @('s3fctl', @('--state', 'new')),
  @('s3fctllean', @('--lean', '1', '--state', 'new'))
)
$times = @(
  @('s3fnewtime', @('--mode', 'tentv', '--lean', '1', '--state', 'host')),
  @('s3fnewresttime', @('--mode', 'tentv', '--lean', '1', '--state', 'host', '--rest', '1')),
  @('s3ftentvtime', @('--mode', 'tentv', '--lean', '1')),
  @('s3ftentvresttime', @('--mode', 'tentv', '--lean', '1', '--rest', '1')),
  @('s3ffittime', @())
)

function DesktopTable {
  $scenes = 'muse_hash', 'muse_default_tw', 'def', 'fat', 'ring', 'user_tw42.lightpaper', 'g41_def_tw42', 'g41_def_tw64', 'g41_ring_tw42', 'g41_ring_tw64', 'g41_user_tw42', 'g41_user_tw64'
  $tags = $times | ForEach-Object { $_[0] }
  $lines = @('# s3f desktop: GPU timer p50 + the upload calls'' main-thread p50 (ms; 0.1 ms timer)', '',
    ('| scene | ' + (($tags | ForEach-Object { "$_ gpu / up / gpu + up" }) -join ' | ') + ' |'),
    ('|---|' + ('---|' * $tags.Count)))
  foreach ($sc in $scenes) {
    $cells = foreach ($tg in $tags) {
      $p = Join-Path $outDir "time_${tg}_$sc.json"
      if (Test-Path $p) {
        $j = Get-Content $p -Raw | ConvertFrom-Json
        $g = if ($null -ne $j.gpu.p50) { [double]$j.gpu.p50 } else { [double]::NaN }
        $u = if ($null -ne $j.upload.p50) { [double]$j.upload.p50 } else { 0.0 }
        '{0:N2} / {1:N2} / {2:N2}' -f $g, $u, ($g + $u)
      } else { '-' }
    }
    $lines += "| $sc | " + ($cells -join ' | ') + ' |'
  }
  $lines | Out-File -Encoding utf8 (Join-Path $outDir 'desktop_table_s3f.md')
  $lines
}

if (-not $SkipDesktop) {
  Say "desktop$(if ($DryRun) { ' (dry run: printed, not run)' })"
  foreach ($v in $verdicts) {
    $a = @('verdict') + $v[1] + @('--tag', $v[0])
    if ($DryRun) { Say "  would run: run_locked.ps1 -RunArgs $($a -join ' '); defects.ps1 $($v[0])"; continue }
    & (Join-Path $s3 'run_locked.ps1') -RunArgs $a -MaxWaitMin $MaxWaitMin 2>&1 | Select-String -Pattern 'errors|lock' | ForEach-Object { Say "  $_" }
    & (Join-Path $s3 'defects.ps1') $v[0] 2>&1 | Select-Object -First 1 | ForEach-Object { Say "  $_" }
  }
  foreach ($t in $times) {
    $a = @('time') + $t[1] + @('--tag', $t[0])
    if ($DryRun) { Say "  would run: run_locked.ps1 -RunArgs $($a -join ' ')"; continue }
    & (Join-Path $s3 'run_locked.ps1') -RunArgs $a -MaxWaitMin $MaxWaitMin 2>&1 | Select-String -Pattern 'errors|lock' | ForEach-Object { Say "  $_" }
  }
  DesktopTable
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
  } else {
    & (Join-Path $s3 'phone_batch.ps1') -Name s3f -MaxWaitMin $MaxWaitMin -Runs $phone -Tables $tables
    $code = $LASTEXITCODE
    if ($code -ne 0) { Say "phone batch exit $code"; exit $code }
  }
  & node (Join-Path $s3 'split.mjs') s3f1 (Join-Path $outDir 'split_s3f1.md') s3f1 | Select-Object -First 3
}
exit 0
