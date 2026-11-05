# K1139 S5 on the Pixel again, on a cool phone. S5's first pass (2026-11-05 00:52-01:07) ran at thermal
# status 1 and read render ms +1.00 at rest (fabric, 0 moves; noise +-0.70), past the 0.5 ms gate, while
# S3b's pass (cool start) and the fix's read at most +0.50. This waits, read-only, until the phone is cool
# (status 0, VIRTUAL-SKIN at most -MaxSkin), checks the phone is awake with Chrome in front and nobody
# touched it after -SinceClock (the last pass's cleanup), copies the two builds (a file copy: no git, no
# vite, as Muse runs) and reruns the s5 pass with -Reps (even = ABBA-balanced) into 2026-11-05-k1139s5b.
# Never wakes, unlocks or sends keys. Prints no serial, no address. -Once prints the state and exits.
# Ran 2026-11-05 01:07-01:41 (cool at 01:20, status 0, skin 31.0): the Result in out/s3b/pixel_batch_plan.md.
param([double]$MaxSkin = 31.0, [int]$MaxWaitMin = 120, [int]$Reps = 4, [string]$SinceClock = '01:07:30', [switch]$Once)
$k = 'C:\Users\lsl\Repositories\knotmaze'
$sp = Split-Path -Parent $PSCommandPath
$rounds = "$k\.claude\probes\rounds"
$src = "$rounds\2026-11-05-k1139s5"
$dst = "$rounds\2026-11-05-k1139s5b"
function Say([string]$m) { "$(Get-Date -Format HH:mm:ss) $m" }
$adb = "$(node "$k\scripts\phone_pass\phone_ready.mjs" --find-adb)".Trim()
if (-not $adb -or -not (Test-Path -LiteralPath $adb)) { Say 'no adb found'; exit 2 }
$devs = @(& $adb devices | Select-String -Pattern '\tdevice$' | ForEach-Object { ($_.Line -split "`t")[0] })
if ($devs.Count -ne 1) { Say "devices attached: $($devs.Count)"; exit 2 }
$ser = $devs[0]
function Thermal {
  $o = & $adb -s $ser shell dumpsys thermalservice
  $st = $o | Select-String -Pattern 'Thermal Status: (\d+)' | Select-Object -First 1
  # The HAL's current temperatures, the section phone_pass's lib.mjs reads.
  $t = @{}; $in = $false
  foreach ($l in $o) {
    if ($l -match 'Current temperatures from HAL') { $in = $true; continue }
    if ($in -and $l -match 'Current cooling') { break }
    if ($in -and $l -match 'mValue=([\d.]+), mType=-?\d+, mName=(VIRTUAL-SKIN|soc_therm|battery),') { $t[$Matches[2]] = [double]$Matches[1] }
  }
  $s = if ($st) { [int]$st.Matches[0].Groups[1].Value } else { -1 }
  [pscustomobject]@{ status = $s; skin = $t['VIRTUAL-SKIN']; soc = $t['soc_therm']; batt = $t['battery'] }
}
function ThLine($t) { "status $($t.status), VIRTUAL-SKIN $($t.skin), soc_therm $($t.soc), battery $($t.batt)" }
function Idle {
  $pw = & $adb -s $ser shell dumpsys power
  $wake = $pw | Select-String -Pattern 'mLastWakeTime=(\d+) \((\d+) ms ago\)' | Select-Object -First 1
  $act = $pw | Select-String -Pattern 'mLastUserActivityTime(?:\(excludingAttention\))?=(\d+)' | Select-Object -First 1
  $wf = $pw | Select-String -Pattern 'mWakefulness=(\w+)' | Select-Object -First 1
  if (-not $wake -or -not $act -or -not $wf) { return $null }
  $nowUp = [long]$wake.Matches[0].Groups[1].Value + [long]$wake.Matches[0].Groups[2].Value
  $idleS = [math]::Round(($nowUp - [long]$act.Matches[0].Groups[1].Value) / 1000)
  $top = & $adb -s $ser shell dumpsys activity activities | Select-String -Pattern 'mResumedActivity|topResumedActivity' | Select-Object -First 1
  $pkg = if ($top) { [regex]::Match($top.Line, '([a-z][\w.]+)/').Groups[1].Value } else { '' }
  [pscustomobject]@{ wake = $wf.Matches[0].Groups[1].Value; lastAct = (Get-Date).AddSeconds(-$idleS); front = $pkg }
}
function IdleLine($i) { "wakefulness $($i.wake), last user activity $($i.lastAct.ToString('HH:mm:ss')), in front $($i.front)" }
if ($Once) { Say (ThLine (Thermal)); Say (IdleLine (Idle)); exit 0 }
$since = [datetime]::ParseExact("$((Get-Date).ToString('yyyy-MM-dd')) $SinceClock", 'yyyy-MM-dd HH:mm:ss', $null)
$deadline = (Get-Date).AddMinutes($MaxWaitMin)
$n = 0
while ($true) {
  $t = Thermal
  if ($t.status -eq 0 -and $null -ne $t.skin -and $t.skin -le $MaxSkin) { Say "cool: $(ThLine $t)"; break }
  if ($n % 5 -eq 0) { Say "waiting: $(ThLine $t)" }
  if ((Get-Date) -gt $deadline) { Say "still warm after $MaxWaitMin min: $(ThLine $t); stopping"; exit 5 }
  $n++
  Start-Sleep -Seconds 60
}
$i = Idle
if (-not $i) { Say 'dumpsys power: fields not found; stopping'; exit 2 }
Say (IdleLine $i)
# Never wake or unlock: a sleeping screen or a touch since the cleanup ends it here, for Claude to decide.
if ($i.wake -ne 'Awake') { Say 'the screen is off: not waking it; stopping'; exit 6 }
if ($i.lastAct -gt $since) { Say "touched after $SinceClock (a person may be using it): stopping"; exit 7 }
if ($i.front -ne 'com.android.chrome') { Say "Chrome is not in front: stopping"; exit 8 }
New-Item -ItemType Directory -Path "$dst\builds" -Force | Out-Null
foreach ($sha in '36aed2d5', 'fbc1b212') {
  if (-not (Test-Path -LiteralPath "$dst\builds\$sha\index.html")) { Copy-Item -LiteralPath "$src\builds\$sha" -Destination "$dst\builds\$sha" -Recurse }
  if (-not (Test-Path -LiteralPath "$dst\builds\$sha\index.html")) { Say "copy of $sha failed; stopping"; exit 4 }
}
Say "builds copied; running the s5 pass, $Reps reps"
pwsh -NoProfile -File "$sp\pixel_passes.ps1" -Flip fbc1b212 -Only s5 -Reps $Reps -AllowChrome -Suffix b
$code = $LASTEXITCODE
Say "s5 rerun: exit $code (summary: $dst\summary.md)"
exit $code
