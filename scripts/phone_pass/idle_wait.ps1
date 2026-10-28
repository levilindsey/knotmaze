# idle_wait.ps1: wait until the phone's touchscreen has seen no touch for -QuietMin minutes, at most -MaxMin minutes (ONE blocking
# command). Read-only: `getevent` streams the kernel's input events, nothing is sent to the phone and it is never woken. A touch
# restarts the wait; the first line it prints says when it gives up.
#
# Call (it blocks for minutes: run it in the background and read its output or -Log):
#   pwsh -NoProfile -File scripts/phone_pass/idle_wait.ps1 [-QuietMin 5] [-MaxMin 45] [-Serial <adb serial>] [-Log <file>]
#   -Serial  the adb serial; by default the one device `adb devices` lists in state "device" (none or several: exit 6)
#   -Log     a file the progress lines are appended to as well as the console (default: console only)
# adb: $env:ADB, else a running adb server's exe, else adb on PATH, else the winget Google.PlatformTools copy under $env:LOCALAPPDATA.
# Exit: 0 quiet reached, 2 never quiet within -MaxMin, 5 no touchscreen, 6 no phone (none, or several without -Serial).
param(
  [string]$Serial = "",
  [int]$QuietMin = 5,
  [int]$MaxMin = 45,
  [string]$Log = ""
)
function Say($m) { $l = "{0} {1}" -f (Get-Date -Format "HH:mm:ss"), $m; Write-Host $l; if ($Log) { Add-Content -Path $Log -Value $l } }
function Find-Adb {
  if ($env:ADB -and (Test-Path $env:ADB)) { return $env:ADB }
  $p = (Get-Process -Name adb -ErrorAction SilentlyContinue | Where-Object { $_.Path } | Select-Object -First 1).Path
  if ($p) { return $p }
  $c = Get-Command adb -ErrorAction SilentlyContinue
  if ($c) { return $c.Source }
  if ($env:LOCALAPPDATA) {
    $w = Get-ChildItem (Join-Path $env:LOCALAPPDATA "Microsoft\WinGet\Packages") -Directory -Filter "Google.PlatformTools*" -ErrorAction SilentlyContinue |
      ForEach-Object { Join-Path $_.FullName "platform-tools\adb.exe" } | Where-Object { Test-Path $_ } | Select-Object -First 1
    if ($w) { return $w }
  }
  return $null
}
$adb = Find-Adb
if (-not $adb) { Say "idle: no adb found (set `$env:ADB)"; exit 6 }
if ($Log) { New-Item -ItemType Directory -Force (Split-Path $Log -Parent) | Out-Null }
if (-not $Serial) {
  $devs = @(& $adb devices 2>&1 | Where-Object { $_ -match '^\S+\s+device\s*$' } | ForEach-Object { ($_ -split '\s+')[0] })
  if ($devs.Count -ne 1) { Say "idle: $($devs.Count) adb devices in state 'device' (adb $adb); pass -Serial"; exit 6 }
  $Serial = $devs[0]
}
$touch = $null; $cur = $null
foreach ($l in (& $adb -s $Serial shell "getevent -p" 2>&1)) {
  if ($l -match '^add device \d+: (/dev/input/event\d+)') { $cur = $Matches[1] }
  elseif ($cur -and $l -match 'name:\s+"([^"]+)"') { if (-not $touch -and $Matches[1] -match 'touch') { $touch = $cur }; $cur = $null }
}
if (-not $touch) { Say "idle: no touchscreen device found (adb $adb, serial $Serial)"; exit 5 }
$start = Get-Date
$deadline = $start.AddMinutes($MaxMin)
Say "idle: waiting for $QuietMin min without a touch on $touch (serial $Serial); gives up at $($deadline.ToString('HH:mm:ss'))"
$touches = 0
while ($true) {
  $secs = [int]($deadline - (Get-Date)).TotalSeconds
  if ($secs -lt $QuietMin * 60) { Say "idle: no $QuietMin quiet minutes before $($deadline.ToString('HH:mm:ss')) ($touches touch detections); never idle"; exit 2 }
  $res = & $adb -s $Serial shell "timeout $($QuietMin * 60) getevent -l -c 1 $touch; echo EXIT=`$?" 2>&1 | Out-String
  if ($res -match 'EXIT=124') { Say "idle: $QuietMin quiet minutes on $touch; done (waited $([int]((Get-Date) - $start).TotalSeconds) s, $touches touch detections)"; exit 0 }
  if ($res -match 'EV_') { $touches++; Say "idle: a touch ($touches); the $QuietMin min wait restarts"; Start-Sleep -Seconds 1; continue }
  Say "idle: getevent ended without a touch: $(($res -replace '\s+', ' ').Trim())"
  if (((Get-Date) - $start).TotalMinutes -gt 3 -and $res -match 'no devices|not found') { exit 6 }
  Start-Sleep -Seconds 20
}