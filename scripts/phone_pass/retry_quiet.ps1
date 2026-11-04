# phone_pass: the one retry after a watchdog trip (K156; K81's retry_quiet.ps1).
# The rule: stop, wait 15 minutes without touches, retry once. This script
#   1. needs <Out>\state\watchdog.trip (a tripped pass) and no <Out>\tripped\
#      folder (the retry is used only once: a second trip is for a person);
#   2. moves the tripped run's results into <Out>\tripped\ (bench.jsonl,
#      looks_report.json, summary.md; copies the watchdog's log, getevent.out
#      and the trip verdict) and deletes the trip file;
#   3. waits, read-only, until the phone is READY and quiet (K1142: ONE call to
#      the kit's shared check, phone_ready.mjs): screen on, unlocked, the
#      launcher in front (-AllowChrome: Chrome too) and no touch on the
#      touchscreen or a button for -QuietMin minutes. A touch restarts the
#      wait. It never wakes or unlocks the phone (no key events): an asleep or
#      locked one waits for a person. Gives up after -GiveUpMin + -WaitReadyMin
#      (exit 2 if it was touched, 3 if the state never came right);
#   4. reruns `phone_pass.ps1 -Phase all` on the same -Out with the parameters
#      stored in <Out>\config.json.
# Run it in the background: it can take -GiveUpMin + the pass's own time.
# Exit codes: 0 the rerun finished clean, 1 no trip to retry or bad config,
# 3 phone not ready (asleep, locked, an app in front, gone), 4 already retried
# once, 5 no touchscreen found, 2 gave up waiting (touched); else the rerun's own
# code (2 = tripped again).
# Usage: pwsh -NoProfile -File retry_quiet.ps1 -Out <pass folder> [-QuietMin 15] [-GiveUpMin 90] [-WaitReadyMin 240] [-AllowChrome] [-NoRun]
param(
  [Parameter(Mandatory)][string]$Out,
  [int]$QuietMin = 15,
  [int]$GiveUpMin = 90,
  [int]$WaitReadyMin = 240,   # K171 (b): extra minutes on top of -GiveUpMin for a phone that is asleep, locked or not on the home screen
  [switch]$AllowChrome,       # K1142: Chrome in front counts as ready (a docked phone that stays awake after the cleanup leaves it there)
  [switch]$NoRun   # a harness check: do everything but the rerun, which is only printed
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

# K1142: ONE call to the kit's shared check does the three jobs three loops did here
# (find the touchscreen, wait for -QuietMin quiet minutes, wait for an asleep or locked
# phone): ready = screen on, unlocked, the launcher in front (Chrome too with
# -AllowChrome) and no touch on the touchscreen or a button for -QuietMin minutes.
# Read-only; it never wakes or unlocks the phone.
$node = (Get-Command node -ErrorAction Stop).Source
$readyArgs = @((Join-Path $PSScriptRoot "phone_ready.mjs"), "--adb", $adb, "--serial", $dev, "--quiet-s", ($QuietMin * 60), "--timeout-min", ($GiveUpMin + $WaitReadyMin), "--progress")
if ($AllowChrome) { $readyArgs += "--allow-chrome" }
Say "retry: waiting for the phone: launcher in front and $QuietMin min without a touch (gives up at $((Get-Date).AddMinutes($GiveUpMin + $WaitReadyMin).ToString('HH:mm')))"
& $node @readyArgs 2>&1 | ForEach-Object { Say "retry: $_" }
$rc = $LASTEXITCODE
if ($rc -ne 0) {
  Say "retry: not retrying ($(switch ($rc) { 4 { 'it was touched' } 5 { 'no touchscreen found' } default { 'the phone was not ready' } }); it is never woken or unlocked by the pass)"
  exit $(switch ($rc) { 4 { 2 } 5 { 5 } default { 3 } })
}Say "retry: $QuietMin quiet minutes and the phone is ready; running the pass again (the one retry)"
$argv = @("-NoProfile", "-File", $pass, "-Phase", "all", "-Base", $cfg.refA, "-Head", $cfg.refB, "-Out", $Out,
  "-Reps", [string]$cfg.reps, "-Moves", (@($cfg.moves) -join ","), "-LoadSeconds", [string]$cfg.loadSeconds)
if ($cfg.portRange) { $argv += @("-PortRange", $cfg.portRange) }
if ($cfg.looks) { $argv += @("-Looks", $cfg.looks) }
if ($cfg.noise) { $argv += @("-Noise", $cfg.noise) }
if ($cfg.viewport) { $argv += @("-Viewport", $cfg.viewport) }
if ($cfg.serial) { $argv += @("-Serial", $cfg.serial) }
$argv += @("-QuietS", "30")   # the check above just watched $QuietMin quiet minutes; the pass's own is a short last look
if ($AllowChrome) { $argv += "-AllowChrome" }
if ($NoRun) { Say "retry: -NoRun, so the rerun is only printed: pwsh $($argv -join ' ')"; exit 0 }
& pwsh @argv
$code = $LASTEXITCODE
Say "retry: phone_pass.ps1 exit $code"
exit $code
