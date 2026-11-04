# K1040 S3f2 (K1097): the gate's batch, copied from s3f_gate.ps1. The
# desktop first (each s3.mjs run through run_locked.ps1: the perf lock),
# then the Pixel through phone_batch.ps1 (the phone and perf locks,
# K1142's ready check, 15-minute lock waits), stopping at the first
# non-zero exit.
#   Desktop: the census (verdict) of the new pass (s3f2new: state new,
#   lean tentv) and the control (s3f2ctl); then time (GPU timer + the
#   upload calls' main-thread time) for the new pass moving and at rest
#   (the S3f2 skip), S3e's pass at rest (the row diff, the before), and
#   today's tentv moving.
#   Pixel, in one batch beside S3f's runs so before and after share the
#   phone's state: s3fnew, s3f2new and s3ftentv (moving), s3ffloorall,
#   s3fnewrest and s3f2newrest (at rest, the skip), s3f2oldrest (S3e's
#   pass at rest, the row diff) and the s3f2 split page (the fixed part's
#   split and the rest upload, split.mjs s3f2).
# Then the tables: out/phone_table_s3f2.md (phone_table.ps1 -Upload),
# out/split_s3f2.md (split.mjs s3f2) and out/desktop_table_s3f2.md.
# THE GATE'S COST per scene is phone_table_s3f2.md's last column,
# "s3f2new - s3ffloorall + upload", against 2 ms on every scene.
# -DryRun touches no phone and takes no lock. -SkipDesktop / -SkipPhone
# run one half. -SkipVerdicts leaves out the desktop censuses.
# Usage: & .claude\probes\K1040\s3\s3f2_gate.ps1 [-DryRun] [-SkipDesktop] [-SkipPhone] [-SkipVerdicts] [-PhoneRuns n]
param([int]$MaxWaitMin = 15, [switch]$DryRun, [switch]$SkipDesktop, [switch]$SkipPhone, [switch]$SkipVerdicts, [int]$PhoneRuns = 0)
$s3 = $PSScriptRoot
$worktree = (Resolve-Path (Join-Path $s3 '..\..\..\..')).Path
$outDir = Join-Path $s3 'out'
function Say([string]$m) { "$(Get-Date -Format HH:mm:ss) $m" }

# The gate's runs first (the new pass, floorall), the split last.
$phone = @(
  '--fit 411x753 --label s3f2new --b2b --mode tentv --lean --state host',
  '--fit 411x753 --label s3ffloorall --b2b --floor',
  '--fit 411x753 --label s3fnew --b2b --mode tentv --lean --state host',
  '--fit 411x753 --label s3ftentv --b2b --mode tentv --lean',
  '--fit 411x753 --label s3f2newrest --b2b --mode tentv --lean --rest --state host',
  '--fit 411x753 --label s3fnewrest --b2b --mode tentv --lean --rest --state host',
  '--fit 411x753 --label s3f2oldrest --b2b --mode tentv --lean --rest',
  '--fit 411x753 --label s3f2 --variants ideal,ideal32f,ideal32fz,ideal32fk,ideal32fd,ideal32fr,leanempty,leanemptyns,leanemptynoupns,fempty,femptynoup,femptynouph0,femptyb,femptynoupnc,femptynoupst,ftentvsetup,leantentv,ftentv,ftentvrest,leantentvrest,floor,ffloor'
)
$tables = @(
  's3f2new s3fnew s3ftentv s3ffloorall -Floor s3ffloorall -Upload',
  's3f2newrest s3fnewrest s3f2oldrest s3ffloorall -Floor s3ffloorall -Upload'
)
$verdicts = @(
  @('s3f2new', @('--mode', 'tentv', '--lean', '1', '--state', 'new')),
  @('s3f2ctl', @('--state', 'new'))
)
$times = @(
  @('s3f2newtime', @('--mode', 'tentv', '--lean', '1', '--state', 'host')),
  @('s3f2newresttime', @('--mode', 'tentv', '--lean', '1', '--state', 'host', '--rest', '1')),
  @('s3f2oldresttime', @('--mode', 'tentv', '--lean', '1', '--rest', '1')),
  @('s3ftentvtime', @('--mode', 'tentv', '--lean', '1'))
)
if ($PhoneRuns -gt 0) {
  $phone = @($phone | Select-Object -First $PhoneRuns)
  $have = @($phone | ForEach-Object { if ($_ -match '--label (\S+)') { $Matches[1] } })
  $tables = @($tables | Where-Object { @($_ -split '\s+' | Where-Object { $_ -and $_ -notmatch '^-' } | Where-Object { $have -notcontains $_ }).Count -eq 0 })
}
if ($SkipVerdicts) { $verdicts = @() }

function DesktopTable {
  $scenes = 'muse_hash', 'muse_default_tw', 'def', 'fat', 'ring', 'user_tw42.lightpaper', 'g41_def_tw42', 'g41_def_tw64', 'g41_ring_tw42', 'g41_ring_tw64', 'g41_user_tw42', 'g41_user_tw64'
  $tags = $times | ForEach-Object { $_[0] }
  $lines = @('# s3f2 desktop: GPU timer p50 + the upload calls'' main-thread p50 (ms; 0.1 ms timer)', '',
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
  $lines | Out-File -Encoding utf8 (Join-Path $outDir 'desktop_table_s3f2.md')
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
    & (Join-Path $s3 'phone_batch.ps1') -Name s3f2 -MaxWaitMin $MaxWaitMin -Runs $phone -Tables $tables
    $code = $LASTEXITCODE
    if ($code -ne 0) { Say "phone batch exit $code"; exit $code }
  }
  if ($phone | Where-Object { $_ -match '--label s3f2 ' }) {
    & node (Join-Path $s3 'split.mjs') s3f2 (Join-Path $outDir 'split_s3f2.md') s3f2 | Select-Object -First 3
  }
}
exit 0
