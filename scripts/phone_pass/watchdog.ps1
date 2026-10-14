# phone_pass watchdog (K156; K81's, which adapted K79 stage A's). Trips, and
# stops THIS pass's own node scripts (the ones started with <Out>\config.json
# as their argument; never the preview servers, never anything else), when the
# phone seems to be in use or gone:
#   - PHYSICAL INPUT: `adb shell getevent -lt` streams the kernel's input
#     events (the touchscreen, the power/volume keys). A person's touch or
#     button press prints event lines; our CDP traffic (and adb `input`)
#     injects above the kernel and prints none. (mLastUserActivityTime
#     cannot tell them apart: puppeteer.connect() alone moves it, measured
#     2026-10-13, so it is only logged.)
#   - adb gave no data 3 polls in a row          -> "disconnected"
#   - the screen is not awake / keyguard showing -> "screen off" / "locked"
#   - the top activity is not the expected package (state\expect.txt, default
#     com.android.chrome; "any" turns the check off)
# Tripping writes <Out>\state\watchdog.trip (its content is the verdict).
# Stop the watchdog by creating <Out>\state\watchdog.stop.
# Files, all in <Out>\state\: watchdog.log, watchdog.trip, watchdog.stop,
# expect.txt, getevent.out, getevent.err, watchdog.pid.
# Reads adb and serial from <Out>\config.json (phone_pass.ps1 writes it).
# Usage: pwsh -NoProfile -File watchdog.ps1 -Out <pass folder> [-Dev <serial>] [-PollS 2]
param(
  [Parameter(Mandatory)][string]$Out,
  [string]$Dev = "",
  [int]$PollS = 2
)
$cfgPath = Join-Path $Out "config.json"
$cfg = Get-Content $cfgPath -Raw | ConvertFrom-Json
$adb = $cfg.adb
if (-not $Dev) { $Dev = $cfg.serial }
$dir = Join-Path $Out "state"
New-Item $dir -ItemType Directory -Force | Out-Null
$log = Join-Path $dir "watchdog.log"
$tripFile = Join-Path $dir "watchdog.trip"
$stopFile = Join-Path $dir "watchdog.stop"
$expectFile = Join-Path $dir "expect.txt"
$evFile = Join-Path $dir "getevent.out"
Remove-Item $tripFile, $stopFile, $evFile -ErrorAction SilentlyContinue
Set-Content (Join-Path $dir "watchdog.pid") $PID

function Log([string]$m) { Add-Content -Path $log -Value ("{0} {1}" -f (Get-Date -Format "HH:mm:ss"), $m) }
function Trip([string]$why) {
  Log "TRIPPED: $why"
  Set-Content -Path $tripFile -Value ("{0} {1}" -f (Get-Date -Format "HH:mm:ss"), $why)
  Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($cfgPath, [StringComparison]::OrdinalIgnoreCase) -ge 0 } |
    ForEach-Object { Log "stopping node $($_.ProcessId)"; Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
}

# The touchscreen and the buttons only: the haptics device (cs40l26_input)
# prints EV_FF lines whenever anything vibrates, which is not a person.
$inputs = @()
$cur = $null
foreach ($l in (& $adb -s $Dev shell "getevent -p" 2>&1)) {
  if ($l -match '^add device \d+: (/dev/input/event\d+)') { $cur = $Matches[1] }
  elseif ($cur -and $l -match 'name:\s+"([^"]+)"') {
    if ($Matches[1] -match 'touch|gpio_keys|keys|power') { $inputs += $cur }
    $cur = $null
  }
}
if (-not $inputs) { $inputs = @("/dev/input/event2", "/dev/input/event0") }
# This getevent takes ONE optional device argument (two print its usage and
# exit), so it streams every device and the parser keeps the touchscreen and
# the buttons.
$ev = Start-Process -FilePath $adb -ArgumentList @("-s", $Dev, "shell", "getevent", "-lt") -NoNewWindow -PassThru `
  -RedirectStandardOutput $evFile -RedirectStandardError (Join-Path $dir "getevent.err")
Log "watchdog start dev=$Dev poll=${PollS}s getevent pid=$($ev.Id) watching=$($inputs -join ',')"
$pos = 0L
$fails = 0
$n = 0
try {
  while (-not (Test-Path $stopFile)) {
    # Physical input lines ("[  123.456789] /dev/input/event2: ...").
    $fs = $null
    try {
      $fs = [System.IO.File]::Open($evFile, 'Open', 'Read', 'ReadWrite')
      if ($fs.Length -gt $pos) {
        $null = $fs.Seek($pos, 'Begin')
        $sr = New-Object System.IO.StreamReader($fs)
        $text = $sr.ReadToEnd()
        $pos = $fs.Length
        $hit = ($text -split "`n") | Where-Object { $_ -match '^\[\s*[\d\.]+\]\s+(/dev/input/event\d+):' -and ($inputs -contains $Matches[1]) } | Select-Object -First 1
        if ($hit) { Trip "physical input on the phone: $($hit.Trim())"; break }
      }
    } catch { } finally { if ($fs) { $fs.Dispose() } }
    if ($ev.HasExited) { Trip "getevent ended (adb dropped?)"; break }

    $dump = (& $adb -s $Dev shell "dumpsys power | grep -E 'mWakefulness=|mLastUserActivityTime'; dumpsys window | grep -E 'isKeyguardShowing'; dumpsys activity activities | grep -m1 topResumedActivity" 2>&1 | Out-String)
    $awake = if ($dump -match 'mWakefulness=(\w+)') { $Matches[1] } else { $null }
    $act = if ($dump -match 'mLastUserActivityTime\(excludingAttention\)=(\d+)') { $Matches[1] } else { $null }
    $kg = if ($dump -match 'isKeyguardShowing=(\w+)') { $Matches[1] } else { $null }
    $top = if ($dump -match 'topResumedActivity=ActivityRecord\{\S+ \S+ ([\w\.]+)/') { $Matches[1] } else { '?' }
    if (-not $awake) {
      $fails++
      Log ("no data ({0})" -f $fails)
      if ($fails -ge 3) { Trip "disconnected (adb gave no data 3 polls in a row)"; break }
      Start-Sleep -Seconds $PollS
      continue
    }
    $fails = 0
    $expect = if (Test-Path $expectFile) { (Get-Content $expectFile -Raw).Trim() } else { "com.android.chrome" }
    $n++
    if ($n % 15 -eq 1) { Log "ok awake=$awake keyguard=$kg act=$act top=$top expect=$expect" }
    if ($awake -ne 'Awake') { Trip "screen not awake ($awake)"; break }
    if ($kg -eq 'true') { Trip "keyguard showing (phone locked)"; break }
    if ($expect -ne 'any' -and $top -ne $expect) { Trip "top activity is $top, expected $expect"; break }
    Start-Sleep -Seconds $PollS
  }
} finally {
  if (-not $ev.HasExited) { Stop-Process -Id $ev.Id -Force -ErrorAction SilentlyContinue }
  Log "watchdog end"
}
