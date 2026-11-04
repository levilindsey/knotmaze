# idle_wait.ps1: wait until the phone is READY (K1142): the screen on, unlocked, the LAUNCHER in front and no touch on the
# touchscreen or a button for -QuietMin minutes, at most -MaxMin minutes (ONE blocking command). It is a thin caller of the kit's
# shared check, phone_ready.mjs, which holds the decision, the input watch and the backoff (this script used to carry its own
# getevent loop, and watched the touchscreen only). Read-only: `dumpsys`, `getevent` and `adb devices`; nothing is sent to the
# phone, it is never woken or unlocked and nothing is launched, closed or brought forward. A touch restarts the wait; the first
# line it prints says when it gives up.
#
# Call (it blocks for minutes: run it in the background and read its output or -Log):
#   pwsh -NoProfile -File scripts/phone_pass/idle_wait.ps1 [-QuietMin 5] [-MaxMin 45] [-Serial <adb serial>] [-AllowChrome] [-Log <file>]
#   -Serial       the adb serial; by default the one device `adb devices` lists in state "device" (none or several: exit 6)
#   -AllowChrome  Chrome in front counts as ready (a page the kit left behind after a pass); by default only the launcher does
#   -Log          a file the progress lines are appended to as well as the console (default: console only)
# adb: phone_ready.mjs finds it ($env:ADB, a running adb server's exe, adb on PATH, the SDK, the winget Google.PlatformTools copy).
# Exit: 0 ready (quiet for -QuietMin), 2 touched: never quiet within -MaxMin, 3 the state never came right (screen off, locked,
# an app or Chrome in front), 5 no touchscreen, 6 no phone (none, or several without -Serial).
param(
  [string]$Serial = "",
  [int]$QuietMin = 5,
  [int]$MaxMin = 45,
  [string]$Log = "",
  [switch]$AllowChrome
)
function Say($m) { $l = "{0} {1}" -f (Get-Date -Format "HH:mm:ss"), $m; Write-Host $l; if ($Log) { Add-Content -Path $Log -Value $l } }
if ($Log) { New-Item -ItemType Directory -Force (Split-Path $Log -Parent) | Out-Null }
$node = (Get-Command node -ErrorAction Stop).Source
$a = @((Join-Path $PSScriptRoot "phone_ready.mjs"), "--quiet-s", ($QuietMin * 60), "--timeout-min", $MaxMin, "--progress")
if ($Serial) { $a += @("--serial", $Serial) }
if ($AllowChrome) { $a += "--allow-chrome" }
Say "idle: waiting for a ready phone and $QuietMin min without a touch; gives up at $((Get-Date).AddMinutes([Math]::Max($MaxMin, $QuietMin)).ToString('HH:mm:ss'))"
& $node @a 2>&1 | ForEach-Object { Say "$_" }
$rc = $LASTEXITCODE
exit $(switch ($rc) { 0 { 0 } 3 { 3 } 4 { 2 } 5 { 5 } default { 6 } })