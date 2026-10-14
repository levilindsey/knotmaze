# phone_pass: the one retry after a watchdog trip (K156; K81's retry_quiet.ps1).
# The rule: stop, wait 15 minutes without touches, retry once. This script
#   1. needs <Out>\state\watchdog.trip (a tripped pass) and no <Out>\tripped\
#      folder (the retry is used only once: a second trip is for a person);
#   2. moves the tripped run's results into <Out>\tripped\ (bench.jsonl,
#      looks_report.json, summary.md; copies the watchdog's log, getevent.out
#      and the trip verdict) and deletes the trip file;
#   3. waits until the touchscreen has been quiet for -QuietMin minutes (a
#      touch restarts the wait; gives up after -GiveUpMin);
#   4. needs the phone STILL awake and unlocked: it never wakes it (no key
#      events) and never unlocks it, it stops and reports (exit 3);
#   5. reruns `phone_pass.ps1 -Phase all` on the same -Out with the parameters
#      stored in <Out>\config.json.
# Run it in the background: it can take -GiveUpMin + the pass's own time.
# Exit codes: 0 the rerun finished clean, 1 no trip to retry or bad config,
# 3 phone not awake/unlocked, 4 already retried once, 5 no touchscreen found,
# 2 gave up waiting; else the rerun's own code (2 = tripped again).
# Usage: pwsh -NoProfile -File retry_quiet.ps1 -Out <pass folder> [-QuietMin 15] [-GiveUpMin 90]
param(
  [Parameter(Mandatory)][string]$Out,
  [int]$QuietMin = 15,
  [int]$GiveUpMin = 90
)
$ErrorActionPreference = "Stop"
$Out = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Out)
$cfgFile = Join-Path $Out "config.json"
if (-not (Test-Path $cfgFile)) { Write-Host "retry: no config.json in $Out"; exit 1 }
$cfg = Get-Content $cfgFile -Raw | ConvertFrom-Json
$adb = $cfg.adb
$dev = $cfg.serial
$pass = Join-Path (Split-Path $PSScriptRoot -Parent) "phone_pass.ps1"
$state = Join-Path $Out "state"
$aside = Join-Path $Out "tripped"
New-Item (Join-Path $Out "logs") -ItemType Directory -Force | Out-Null
function Say($m) {
  $line = "{0} {1}" -f (Get-Date -Format "HH:mm:ss"), $m
  Write-Host $line
  Add-Content -Path (Join-Path $Out "logs\run.log") -Value $line
}

if ($cfg.dry) { Say "retry: a dry pass has no watchdog; nothing to retry"; exit 1 }
if (-not (Test-Path (Join-Path $state "watchdog.trip"))) { Say "retry: no state\watchdog.trip in $Out; nothing to retry"; exit 1 }
if (Test-Path $aside) { Say "retry: $aside exists, so the one retry was used; a person decides now"; exit 4 }

New-Item $aside -ItemType Directory | Out-Null
foreach ($f in "bench.jsonl", "looks_report.json", "summary.md") {
  $p = Join-Path $Out $f
  if (Test-Path $p) { Move-Item $p (Join-Path $aside $f) -Force }
}
foreach ($f in "state\watchdog.log", "state\getevent.out", "state\watchdog.trip") {
  $p = Join-Path $Out $f
  if (Test-Path $p) { Copy-Item $p (Join-Path $aside (Split-Path $f -Leaf)) -Force }
}
Say "retry: tripped run set aside in $aside ($((Get-Content (Join-Path $aside 'watchdog.trip') -Raw).Trim()))"
Remove-Item (Join-Path $state "watchdog.trip") -Force

# The touchscreen, from `getevent -p` (the first device whose name has "touch").
$touch = $null
$cur = $null
foreach ($l in (& $adb -s $dev shell "getevent -p" 2>&1)) {
  if ($l -match '^add device \d+: (/dev/input/event\d+)') { $cur = $Matches[1] }
  elseif ($cur -and $l -match 'name:\s+"([^"]+)"') {
    if (-not $touch -and $Matches[1] -match 'touch') { $touch = $cur }
    $cur = $null
  }
}
if (-not $touch) { Say "retry: no touchscreen device found in getevent -p; not retrying"; exit 5 }

$giveUp = (Get-Date).AddMinutes($GiveUpMin)
$quiet = $false
Say "retry: waiting for $QuietMin min without a touch on $touch (gives up at $($giveUp.ToString('HH:mm')))"
while ($true) {
  $secs = [int]($giveUp - (Get-Date)).TotalSeconds
  if ($secs -lt $QuietMin * 60) { break }
  $res = & $adb -s $dev shell "timeout $($QuietMin * 60) getevent -l -c 1 $touch; echo EXIT=`$?" 2>&1 | Out-String
  if ($res -match 'EXIT=124') { $quiet = $true; break }
  if ($res -match 'EV_') { Say "retry: a touch; the $QuietMin min wait restarts"; continue }
  Say "retry: getevent ended without a touch: $(($res -replace '\s+', ' ').Trim())"
  Start-Sleep -Seconds 60
}
if (-not $quiet) { Say "retry: no $QuietMin quiet minutes before $($giveUp.ToString('HH:mm')); not retrying"; exit 2 }

# Never wake it and never unlock it: an asleep or locked phone is a person's call.
$o = & $adb -s $dev shell "dumpsys power | grep -E 'mWakefulness='; dumpsys window | grep -E 'isKeyguardShowing'" 2>&1 | Out-String
if ($o -notmatch 'mWakefulness=Awake' -or $o -match 'isKeyguardShowing=true') {
  Say "retry: the phone is asleep or locked after the quiet wait; not retrying (it is never woken or unlocked by the pass)"
  exit 3
}
Say "retry: $QuietMin quiet minutes and the phone is awake; running the pass again (the one retry)"
$argv = @("-NoProfile", "-File", $pass, "-Phase", "all", "-Base", $cfg.refA, "-Head", $cfg.refB, "-Out", $Out,
  "-Reps", [string]$cfg.reps, "-Moves", (@($cfg.moves) -join ","), "-LoadSeconds", [string]$cfg.loadSeconds)
if ($cfg.portRange) { $argv += @("-PortRange", $cfg.portRange) }
if ($cfg.looks) { $argv += @("-Looks", $cfg.looks) }
if ($cfg.noise) { $argv += @("-Noise", $cfg.noise) }
if ($cfg.serial) { $argv += @("-Serial", $cfg.serial) }
& pwsh @argv
$code = $LASTEXITCODE
Say "retry: phone_pass.ps1 exit $code"
exit $code
