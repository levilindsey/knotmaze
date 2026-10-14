# The round phone pass (K156): ONE scripted pass on the phone per merge round,
# instead of a phone gate per feature. It builds the round's base and head
# once each, serves them on two ports, tunnels those ports to the phone's
# Chrome, and measures both builds interleaved in ONE tab of its own:
#   frames   the frame bench (scripts/phone_pass/bench.mjs): fps, p95, the
#            longest frame, render ms and sleep state at rest in knot mode and
#            in fabric mode at 0, 7 and 13 moves, plus K147's load scenario
#            (a fresh navigation: time to first frame, frames over 50 ms, time
#            to first sleep) on a default link and on its slow case (gs=18)
#   looks    a JSON list of looks (-Looks), shot on both builds, side-by-side
#            sheets (looks.mjs, sheet.mjs)
#   summary  <Out>\summary.md: a table per scenario (base, head, delta, the
#            A/A noise floor), the looks' statuses, sheet paths, the verdict
#
#   pwsh -NoProfile -File scripts/phone_pass.ps1 -Base <ref> [-Head master] [-Looks <json>] [-Reps 3]
#   pwsh -NoProfile -File scripts/phone_pass.ps1 -Base master -Head master -Reps 1   # an A/A pass
#   pwsh -NoProfile -File scripts/phone_pass.ps1 -Phase check                         # read-only: is the phone ready?
#   pwsh -NoProfile -File scripts/phone_pass.ps1 -Phase cleanup -Out <dir>            # undo a pass that was cut short
#
# Run `all` in the background (about 10-15 min with the default 3 reps); it
# logs to <Out>\logs\run.log and ends with the exit code below.
#
# Phases (-Phase, default all):
#   all      start, frames, looks, then cleanup and summary EVEN AFTER a trip or
#            a failed start
#   start    1 the phone must be awake and unlocked (else it stops at once: the
#            pass never wakes or unlocks it); 2 build each distinct ref ONCE
#            into <Out>\builds\<sha> through preview.ps1 -Root -BuildOnly (an
#            A/A pass builds once and serves that build on both ports) and
#            check the sha is in the bundle; 3 serve both builds with
#            `vite preview` on two free ports; 4 reverse-tunnel those two
#            ports; 5 open ONE Chrome tab and find it; 6 arm the watchdog
#   frames   bench.mjs: <Out>\bench.jsonl (an older one is renamed aside).
#            $env:SCENARIOS = 'fabric,knot,load' limits the bench (default all)
#   looks    looks.mjs on -Looks (skipped with a log line when there is no
#            -Looks file, or looks.mjs does not exist yet)
#   cleanup  clear the pass origins' storage, close the pass's own tab by id,
#            remove ONLY the pass's tunnels (and the 9222 forward if the pass
#            added it), stop the watchdog and the servers
#   summary  summary.mjs (skipped with a log line while it does not exist)
#   check    read-only: find the phone, print awake / locked / top app and the
#            tunnels already there; exit 0 when it is ready, 3 when not
#
# Parameters:
#   -Base <ref>       the round's base (required for start and all)
#   -Head <ref>       the round's head (default master)
#   -Looks <json>     the looks file (see looks.mjs)
#   -Reps 3           bench repetitions, both builds interleaved in each rep
#   -Moves 0,7,13     fabric move counts to sample. ?b.J is solved on its 14th move, and
#                     since K155 and K140 a finish shows stars and throws confetti,
#                     which a frame cell must not time: stop short of it (check each
#                     row's `made`; the summary flags a cell sampled at the finish)
#   -LoadSeconds 30   length of K147's load scenario (K147 builds first slept at
#                     about 17.5 s on the phone, so 15 s censored first-sleep)
#   -Out <dir>        default <repo>\.claude\probes\rounds\<yyyy-MM-dd>-<head sha>
#                     (untracked). Later phases without -Out use that default,
#                     else the newest folder under rounds\ that has a config.json
#   -WaitReady <min>  (check, start, all) K171 (b): wait for the phone instead of
#                     stopping at once. Every 3 minutes it runs the read-only check
#                     (dumpsys reads only: it never wakes, unlocks or touches the
#                     phone) and goes on after TWO ready checks in a row (a phone
#                     that stays awake and unlocked for 3 quiet minutes was set
#                     down, not picked up). Exit 3 at the deadline. Default 0 = no
#                     wait (a phone that is not ready stops the pass at once)
#   -Serial <serial>  the phone; default: a host:port (Tailscale) device, else the
#                     USB one, else `adb connect` to the 'pixel-11' Tailscale peer
#   -Noise <json>     the A/A noise floor summary.mjs reads (default
#                     scripts/phone_pass/noise.json)
#   -PortRange 5480-5489   ports for the servers (and -Dry's Chrome)
#   -Dry             a HARNESS check on the desktop: no phone, no adb, no
#                     watchdog; a desktop Chrome (its profile inside -Out, deleted
#                     at cleanup) with the phone's viewport emulated. Proves
#                     plumbing, never a measurement
#
# Files in <Out>: config.json (every node script takes it as argv[2]; the
# watchdog kills only node processes carrying that path), builds\, logs\
# (run.log, bench.out.txt, server_<port>.log ...), state\ (watchdog.trip exists
# only after a trip and holds the verdict; watchdog.log, getevent.out,
# expect.txt), bench.jsonl, looks_report.json, summary.md.
#
# Safety, as in K81's kit: the phone must be awake and unlocked at the start;
# the pass never unlocks it and never sends it a key event. It never touches
# Levi's tabs (K123): it opens one tab of its own and closes only that one,
# while Chrome is still in front. Other owners' tunnels and the 9222 forward
# stay untouched. The watchdog (state\watchdog.trip) stops the pass on a touch,
# any key (power included), a lock or another app in front; after a trip the
# one retry is scripts/phone_pass/retry_quiet.ps1 (15 quiet minutes first). No
# perf lock: the phone's timings don't depend on the desktop's load.
#
# Exit code: 0 clean, 1 failed, 2 the watchdog tripped, 3 the phone was not
# ready (asleep, locked, gone).
param(
  [ValidateSet("all", "start", "frames", "looks", "cleanup", "summary", "check")][string]$Phase = "all",
  [string]$Base = "",
  [string]$Head = "master",
  [string]$Looks = "",
  [int]$Reps = 3,
  [string]$Out = "",
  [string]$Moves = "0,7,13",
  [int]$LoadSeconds = 30,
  [int]$WaitReady = 0,
  [string]$Serial = "",
  [string]$Noise = "",
  [string]$PortRange = "5480-5489",
  [switch]$Dry
)
$ErrorActionPreference = "Stop"
$bound = $PSBoundParameters
$repo = Split-Path $PSScriptRoot -Parent
$passDir = Join-Path $PSScriptRoot "phone_pass"
$node = (Get-Command node -ErrorAction Stop).Source
$tailscaleHost = "pixel-11"

# ---------------------------------------------------------------- helpers
function Full([string]$p) { $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($p) }
# One argument for Start-Process -ArgumentList (it joins them with spaces).
function Q([string]$s) { if ($s -match '[\s"]') { '"' + $s.Replace('"', '\"') + '"' } else { $s } }
function Say([string]$m) {
  $line = "{0} {1}" -f (Get-Date -Format "HH:mm:ss"), $m
  Write-Host $line
  if ($script:Out -and (Test-Path (Join-Path $script:Out "logs"))) { Add-Content -Path (Join-Path $script:Out "logs\run.log") -Value $line }
}
function Short-Sha([string]$ref) {
  $o = & git -C $repo rev-parse --short "$ref^{commit}" 2>&1
  if ($LASTEXITCODE -ne 0) { throw "cannot resolve '$ref' to a commit in $repo : $(($o | Out-String).Trim())" }
  return ($o | Out-String).Trim()
}

function Find-Adb {
  # The running adb server's own binary first: a client of another version
  # would restart the server and drop everybody's connections and tunnels.
  $run = Get-Process -Name adb -ErrorAction SilentlyContinue | Where-Object { $_.Path } | Select-Object -First 1
  if ($run -and (Test-Path $run.Path)) { return $run.Path }
  if ($env:ADB -and (Test-Path $env:ADB)) { return $env:ADB }
  $onPath = Get-Command adb -ErrorAction SilentlyContinue
  if ($onPath) { return $onPath.Source }
  $cands = @("$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe") + @(Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Google.PlatformTools_*\platform-tools\adb.exe" -ErrorAction SilentlyContinue | ForEach-Object FullName)
  foreach ($c in $cands) { if (Test-Path $c) { return $c } }
  throw "adb not found (install Android platform-tools or the Android SDK)."
}
function Find-TailscaleIp {
  $ts = Get-Command tailscale -ErrorAction SilentlyContinue
  if (-not $ts) { return $null }
  try { $status = (& $ts.Source status --json) -join "`n" | ConvertFrom-Json } catch { return $null }
  # The DNS label `tailscale status` prints ("pixel-11"); HostName is "Pixel 11".
  foreach ($peer in $status.Peer.PSObject.Properties.Value) {
    if (($peer.DNSName -split '\.')[0] -eq $tailscaleHost -or $peer.HostName -eq $tailscaleHost) {
      return @($peer.TailscaleIPs | Where-Object { $_ -match '^\d+\.' })[0]
    }
  }
  return $null
}
function Get-Devices([string]$adb) {
  @(& $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" } | ForEach-Object { ($_ -split "\t")[0] })
}
function Find-Serial([string]$adb, [string]$want) {
  $devs = Get-Devices $adb
  if ($want) {
    if ($devs -notcontains $want) { throw "PHONE NOT READY: device $want is not connected (adb devices: $($devs -join ', '))" }
    return $want
  }
  $tcp = $devs | Where-Object { $_ -match ":" } | Select-Object -First 1
  if ($tcp) { return $tcp }
  $usb = $devs | Where-Object { $_ -notmatch ":" } | Select-Object -First 1
  if ($usb) { return $usb }
  $ip = Find-TailscaleIp
  if ($ip) {
    $null = & $adb connect "${ip}:5555" 2>&1
    if ((Get-Devices $adb) -contains "${ip}:5555") { return "${ip}:5555" }
  }
  throw "PHONE NOT READY: no phone in adb devices (plug it in, or run scripts/phone.ps1 -Wireless once)."
}
function Phone-State([string]$adb, [string]$ser) {
  $o = & $adb -s $ser shell "dumpsys power | grep -E 'mWakefulness='; dumpsys window | grep -E 'isKeyguardShowing'; dumpsys activity activities | grep -m1 topResumedActivity; dumpsys window displays | grep -m1 -oE 'cur=[0-9]+x[0-9]+'" 2>&1 | Out-String
  [pscustomobject]@{
    # The display as the phone sits (2424x1080 = landscape): a docked phone is in landscape, and the pass's viewport and noise floor follow it.
    Display = $(if ($o -match "cur=(\d+)x(\d+)") { "{0}x{1} {2}" -f $Matches[1], $Matches[2], $(if ([int]$Matches[1] -gt [int]$Matches[2]) { "landscape" } else { "portrait" }) } else { "?" })
    Reached = ($o -match "mWakefulness=")
    Awake = ($o -match "mWakefulness=Awake")
    Locked = ($o -match "isKeyguardShowing=true")
    Top = $(if ($o -match "topResumedActivity=ActivityRecord\{\S+ \S+ ([\w\.]+)/") { $Matches[1] } else { "?" })
  }
}
# Throws "PHONE NOT READY: ..." at once (never waits, never wakes, never unlocks).
function Assert-PhoneReady([string]$adb, [string]$ser) {
  $s = Phone-State $adb $ser
  Say "phone ${ser}: reached=$($s.Reached) awake=$($s.Awake) locked=$($s.Locked) top=$($s.Top) display=$($s.Display)"
  if (-not $s.Reached) { throw "PHONE NOT READY: $ser gave no state (offline?)." }
  if (-not $s.Awake -or $s.Locked) { throw "PHONE NOT READY: the phone is asleep or locked; a person must wake and unlock it first (the pass never does)." }
}

# K171 (b): the read-only wait. Every 3 minutes, up to -WaitReady minutes, the
# same check as -Phase check (dumpsys reads: no wake, no unlock, no touch). It
# returns after TWO ready checks in a row, and throws "PHONE NOT READY" (exit
# 3) at the deadline. retry_quiet.ps1 reaches it through `-Phase check -WaitReady`.
function Wait-PhoneReady {
  if ($Out) { New-Item $logsDir -ItemType Directory -Force | Out-Null }
  $deadline = (Get-Date).AddMinutes($WaitReady)
  Say "waiting up to $WaitReady min for the phone (read-only check every 3 min; two ready checks in a row start the pass; deadline $($deadline.ToString('HH:mm')))"
  $ready = 0
  while ($true) {
    $note = ""
    try {
      $adb = Find-Adb
      $ser = Find-Serial $adb $Serial
      $s = Phone-State $adb $ser
      $ok = ($s.Reached -and $s.Awake -and -not $s.Locked)
      $note = "$ser awake=$($s.Awake) locked=$($s.Locked) top=$($s.Top)"
    } catch { $ok = $false; $note = $_.Exception.Message }
    $ready = if ($ok) { $ready + 1 } else { 0 }
    Say "wait: $(if ($ok) { "ready ($ready of 2)" } else { 'not ready' }): $note"
    if ($ready -ge 2) { Say "wait: two ready checks in a row; the phone was set down, not picked up. Going on."; return }
    $left = [int]($deadline - (Get-Date)).TotalSeconds
    if ($left -le 0) { break }
    Start-Sleep -Seconds ([Math]::Min(180, $left))
  }
  throw "PHONE NOT READY: no two ready checks in a row within $WaitReady min (never woken or unlocked by the pass)."
}

function Get-FreePorts([int]$n) {
  if ($PortRange -match '^(\d+)-(\d+)$') { $lo = [int]$Matches[1]; $hi = [int]$Matches[2] }
  else { throw "-PortRange must look like 5480-5489" }
  # TimeWait leftovers of an earlier pass (the server side of closed connections, up to 2 min) do not block a listener.
  $busy = @(Get-NetTCPConnection -ErrorAction SilentlyContinue | Where-Object { $_.LocalPort -ge $lo -and $_.LocalPort -le $hi -and $_.State -ne "TimeWait" } | ForEach-Object LocalPort | Sort-Object -Unique)
  $free = @($lo..$hi | Where-Object { $busy -notcontains $_ })
  if ($free.Count -lt $n) { throw "need $n free ports in $PortRange, found $($free.Count) (busy: $($busy -join ', '))" }
  return @($free | Select-Object -First $n)
}

# ----------------------------------------------------- out folder and state
$roundsRoot = Join-Path $repo ".claude\probes\rounds"
if ($Phase -ne "check") {
  if ($Out) { $Out = Full $Out }
  else {
    $default = Join-Path $roundsRoot ("{0}-{1}" -f (Get-Date -Format "yyyy-MM-dd"), (Short-Sha $Head))
    if ($Phase -in "all", "start" -or (Test-Path (Join-Path $default "config.json"))) { $Out = $default }
    else {
      $latest = Get-ChildItem $roundsRoot -Directory -ErrorAction SilentlyContinue | Where-Object { Test-Path (Join-Path $_.FullName "config.json") } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
      $Out = if ($latest) { $latest.FullName } else { $default }
    }
  }
}
$cfgFile = if ($Out) { Join-Path $Out "config.json" } else { "" }
$stateDir = if ($Out) { Join-Path $Out "state" } else { "" }
$logsDir = if ($Out) { Join-Path $Out "logs" } else { "" }
function Load-Cfg { if ($Out -and (Test-Path $cfgFile)) { Get-Content $cfgFile -Raw | ConvertFrom-Json -AsHashtable } else { $null } }
function Save-Cfg($c) { [IO.File]::WriteAllText($cfgFile, ($c | ConvertTo-Json -Depth 6), [Text.UTF8Encoding]::new($false)) }
function Tripped { if (-not $stateDir) { return $null }; $f = Join-Path $stateDir "watchdog.trip"; if (Test-Path $f) { (Get-Content $f -Raw).Trim() } else { $null } }
function Apply-Params($c) {
  if ($bound.ContainsKey("Reps")) { $c.reps = $Reps }
  if ($bound.ContainsKey("Moves")) { $c.moves = @(Parse-Moves) }
  if ($bound.ContainsKey("LoadSeconds")) { $c.loadSeconds = $LoadSeconds }
  if ($bound.ContainsKey("Looks")) { $c.looks = Resolve-Looks }
  if ($bound.ContainsKey("Noise")) { $c.noise = Full $Noise }
}
function Parse-Moves { @($Moves -split '[,\s]+' | Where-Object { $_ -ne "" } | ForEach-Object { [int]$_ }) }
function Resolve-Looks {
  if (-not $Looks) { return "" }
  $hit = @($Looks, (Join-Path $repo $Looks)) | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
  if (-not $hit) { throw "-Looks file not found: $Looks" }
  $full = (Resolve-Path -LiteralPath $hit).Path
  try { $null = Get-Content -LiteralPath $full -Raw | ConvertFrom-Json } catch { throw "-Looks is not valid JSON ($full): $($_.Exception.Message)" }
  return $full
}

# ------------------------------------------------------ process helpers
# Stops a process only if its command line still carries this pass's folder
# (a recorded pid may have been reused by something else).
function Stop-Mine([int]$procId, [string]$what) {
  if ($procId -le 0) { return }
  $w = Get-CimInstance Win32_Process -Filter "ProcessId=$procId" -ErrorAction SilentlyContinue
  if (-not $w) { Say "${what} pid ${procId}: already gone"; return }
  if (-not $w.CommandLine -or $w.CommandLine.IndexOf($Out, [StringComparison]::OrdinalIgnoreCase) -lt 0) {
    Say "${what} pid ${procId}: not ours any more ($($w.Name)); left alone"
    return
  }
  Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
  Say "${what} pid ${procId}: stopped"
}
# Runs scripts/phone_pass/<script> <config.json> with a timeout; stderr is
# appended to the log. Returns the exit code (124 = timed out and killed).
function Run-Node([string]$script, [string]$logName, [int]$timeoutS) {
  $log = Join-Path $logsDir $logName
  $err = $log + ".err"
  $p = Start-Process $node -ArgumentList @((Q (Join-Path $passDir $script)), (Q $cfgFile)) -WorkingDirectory $repo -WindowStyle Hidden -PassThru `
    -RedirectStandardOutput $log -RedirectStandardError $err
  $null = $p.Handle
  Say "running $script (log logs\$logName)"
  if (-not $p.WaitForExit($timeoutS * 1000)) {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    Say "$script timed out after ${timeoutS}s; killed"
    $code = 124
  } else {
    $p.WaitForExit()
    $code = $p.ExitCode
  }
  if ((Test-Path $err) -and (Get-Item $err).Length -gt 0) { Add-Content $log "`n--- stderr ---"; Get-Content $err | Add-Content $log }
  Remove-Item $err -ErrorAction SilentlyContinue
  return $code
}

# ------------------------------------------------------------------ phases
function Do-Check {
  $adb = Find-Adb
  $ser = Find-Serial $adb $Serial
  Assert-PhoneReady $adb $ser
  Say "tunnels already there (left alone): $((& $adb -s $ser reverse --list) -join '; ')"
  Say "forwards: $((& $adb forward --list) -join '; ')"
  Say "phone is ready ($ser, adb $adb)"
}

function Do-Start {
  if (-not $Base) { throw "-Base <ref> is required for start and all" }
  New-Item $Out, $stateDir, $logsDir -ItemType Directory -Force | Out-Null
  $old = Load-Cfg
  if ($old -and (@($old.serverPids).Count -or $old.watchdogPid -or $old.chromePid -or $old.tabId -or @($old.tunnels).Count)) {
    Say "start: a previous run in this folder was not cleaned up; cleaning it first"
    Do-Cleanup
  }
  foreach ($f in "watchdog.trip", "watchdog.stop", "expect.txt") { Remove-Item (Join-Path $stateDir $f) -ErrorAction SilentlyContinue }
  Say "phone pass: base $Base, head $Head, reps $Reps$(if ($Dry) { ', DRY (desktop Chrome, no phone)' }), out $Out"

  # 1. the phone, before anything is started
  $adb = ""; $ser = ""
  if (-not $Dry) {
    $adb = Find-Adb
    $ser = Find-Serial $adb $Serial
    Assert-PhoneReady $adb $ser
    Say "others' tunnels (left alone): $((& $adb -s $ser reverse --list) -join '; ')"
  }

  # 2. refs and builds
  $refA = $Base; $refB = $Head
  $shaA = Short-Sha $refA; $shaB = Short-Sha $refB
  $aa = ($shaA -eq $shaB)
  $looksFull = Resolve-Looks
  $buildDir = @{}
  foreach ($sha in @(@($shaA, $shaB) | Select-Object -Unique)) {
    $ref = if ($sha -eq $shaA) { $refA } else { $refB }
    $dir = Join-Path $Out "builds\$sha"
    if (Test-Path (Join-Path $dir "index.html")) { Say "build $ref ($sha): already in $dir, reused" }
    else {
      Say "build $ref ($sha) -> $dir"
      & pwsh -NoProfile -File (Join-Path $PSScriptRoot "preview.ps1") -Ref $sha -Root (Join-Path $Out "builds") -BuildOnly *> (Join-Path $logsDir "build_$sha.log")
      if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $dir "index.html"))) { throw "build of $ref ($sha) failed; see logs\build_$sha.log" }
    }
    $hit = Get-ChildItem (Join-Path $dir "assets") -Filter *.js -Recurse -ErrorAction SilentlyContinue | Select-String -Pattern $sha -SimpleMatch -List | Select-Object -First 1
    if (-not $hit) { throw "build $ref ($sha): the sha is not in the bundle, so its stamp could not be checked" }
    $buildDir[$sha] = $dir
  }
  if ($aa) { Say "A/A pass: one build ($shaA) on both ports" }

  # 3. ports and servers
  $want = if ($Dry) { 3 } else { 2 }
  $ports = @(Get-FreePorts $want)
  $portA = $ports[0]; $portB = $ports[1]
  $cfg = [ordered]@{
    out = $Out; adb = $adb; serial = $ser; dry = [bool]$Dry
    cdp = $(if ($Dry) { "http://127.0.0.1:$($ports[2])" } else { "http://127.0.0.1:9222" })
    hostA = "http://localhost:$portA"; hostB = "http://localhost:$portB"; portA = $portA; portB = $portB
    refA = $refA; refB = $refB; shaA = $shaA; shaB = $shaB; aa = $aa
    buildA = $buildDir[$shaA]; buildB = $buildDir[$shaB]
    reps = $Reps; moves = @(Parse-Moves); loadSeconds = $LoadSeconds; looks = $looksFull
    noise = $(if ($Noise) { Full $Noise } else { Join-Path $passDir "noise.json" })
    portRange = $PortRange
    serverPids = @(); watchdogPid = 0; chromePid = 0; tabId = ""; tunnels = @(); forwardAdded = $false
  }
  Save-Cfg $cfg
  $vite = Join-Path $repo "node_modules\vite\bin\vite.js"
  foreach ($pair in @(@($portA, $cfg.buildA), @($portB, $cfg.buildB))) {
    $port = $pair[0]; $dir = $pair[1]
    $p = Start-Process $node -ArgumentList @((Q $vite), "preview", "--outDir", (Q $dir), "--port", "$port", "--strictPort", "--host", "127.0.0.1") `
      -WorkingDirectory $repo -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $logsDir "server_$port.log") -RedirectStandardError (Join-Path $logsDir "server_$port.err")
    $null = $p.Handle
    $cfg.serverPids = @($cfg.serverPids) + $p.Id
    Save-Cfg $cfg
    $up = $false
    for ($i = 0; $i -lt 60 -and -not $up; $i++) {
      Start-Sleep -Milliseconds 500
      if ($p.HasExited) { throw "preview server on $port exited ($($p.ExitCode)); see logs\server_$port.err" }
      try { $up = ((Invoke-WebRequest "http://127.0.0.1:$port/" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) } catch { }
    }
    if (-not $up) { throw "preview server on $port did not answer" }
    Say "server $port -> pid $($p.Id) ($dir)"
  }

  if ($Dry) {
    # A desktop Chrome with remote debugging; the pass's tab is opened by the node scripts.
    $chrome = @("C:\Program Files\Google\Chrome\Application\chrome.exe", "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe", "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe") | Where-Object { Test-Path $_ } | Select-Object -First 1
    if (-not $chrome) { throw "-Dry needs Chrome (chrome.exe)" }
    $cdpPort = $ports[2]
    $profileDir = Join-Path $Out "chrome-profile"
    $p = Start-Process $chrome -ArgumentList @("--remote-debugging-port=$cdpPort", (Q "--user-data-dir=$profileDir"), "--no-first-run", "--no-default-browser-check", "--mute-audio",
        "--window-position=2200,50", "--window-size=520,900",
        "--disable-features=CalculateNativeWinOcclusion", "--disable-backgrounding-occluded-windows", "--disable-renderer-backgrounding", "about:blank") -PassThru
    $cfg.chromePid = $p.Id
    Save-Cfg $cfg
    $up = $false
    for ($i = 0; $i -lt 60 -and -not $up; $i++) {
      Start-Sleep -Milliseconds 500
      try { $up = ((Invoke-WebRequest "$($cfg.cdp)/json/version" -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) } catch { }
    }
    if (-not $up) { throw "the dry Chrome did not open its debugging port $cdpPort" }
    Say "dry Chrome pid $($p.Id), DevTools at $($cfg.cdp), profile $profileDir"
    return
  }

  # 4. tunnels: only the pass's two ports; the 9222 forward only if it is missing
  Assert-PhoneReady $adb $ser
  foreach ($port in $portA, $portB) {
    & $adb -s $ser reverse "tcp:$port" "tcp:$port" | Out-Null
    $cfg.tunnels = @($cfg.tunnels) + $port
    Save-Cfg $cfg   # recorded at once, so cleanup removes it even if a later step fails
  }
  $fwd = @(& $adb forward --list)
  $mine9222 = @($fwd | Where-Object { $_ -match "^$([regex]::Escape($ser))\s+tcp:9222\s+localabstract:chrome_devtools_remote" })
  $other9222 = @($fwd | Where-Object { $_ -match "\stcp:9222\s" -and $_ -notmatch "^$([regex]::Escape($ser))\s" })
  if ($other9222.Count) { Save-Cfg $cfg; throw "tcp:9222 is forwarded to another device ($($other9222 -join '; ')); not touching it" }
  if (-not $mine9222.Count) {
    & $adb -s $ser forward --no-rebind tcp:9222 localabstract:chrome_devtools_remote | Out-Null
    $cfg.forwardAdded = $true
    Say "added the 9222 forward"
  } else { Say "the 9222 forward was already there; reused" }
  Save-Cfg $cfg
  Say "tunnels now: $((& $adb -s $ser reverse --list) -join '; ')"

  # 5. ONE tab of the pass's own (Chrome comes to the front; DevTools answers only then)
  Set-Content (Join-Path $stateDir "expect.txt") "com.android.chrome" -NoNewline
  & $adb -s $ser shell am start -a android.intent.action.VIEW -d "'http://localhost:$portB/?b.J&am=instant&snd=none'" com.android.chrome | Out-Null
  $tab = $null
  for ($i = 0; $i -lt 20 -and -not $tab; $i++) {
    Start-Sleep -Seconds 2
    try {
      $list = (Invoke-WebRequest "http://127.0.0.1:9222/json/list" -UseBasicParsing -TimeoutSec 8).Content | ConvertFrom-Json
      $tab = @($list | Where-Object { $_.type -eq "page" -and ($_.url.StartsWith($cfg.hostA + "/") -or $_.url.StartsWith($cfg.hostB + "/")) }) | Select-Object -First 1
    } catch { }
  }
  if (-not $tab) { throw "no pass tab on $($cfg.hostA) / $($cfg.hostB) after 40 s (is Chrome in front? is the 9222 forward up?)" }
  $cfg.tabId = $tab.id
  Save-Cfg $cfg
  Say "pass tab $($tab.id) $($tab.url)"

  # 6. the watchdog
  $wd = Start-Process pwsh -ArgumentList @("-NoProfile", "-File", (Q (Join-Path $passDir "watchdog.ps1")), "-Out", (Q $Out)) -WindowStyle Hidden -PassThru
  $cfg.watchdogPid = $wd.Id
  Save-Cfg $cfg
  Start-Sleep -Seconds 6
  if ($wd.HasExited) { throw "the watchdog exited at start (see state\watchdog.log); no safety, so the pass stops" }
  if (Tripped) { throw "watchdog tripped at start: $(Tripped)" }
  Say "watchdog armed (pid $($wd.Id))"
}

function Do-Frames {
  $c = Load-Cfg
  if (-not $c) { throw "no config.json in $Out; run -Phase start first" }
  if (Tripped) { Say "frames: skipped, the watchdog tripped: $(Tripped)"; return }
  if (-not $c.dry) {
    $alive = $c.watchdogPid -and (Get-Process -Id $c.watchdogPid -ErrorAction SilentlyContinue)
    if (-not $alive) { throw "the watchdog is not running; refusing to measure on the phone without it" }
  }
  Apply-Params $c
  Save-Cfg $c
  $bench = Join-Path $Out "bench.jsonl"
  if (Test-Path $bench) { Move-Item $bench (Join-Path $Out ("bench.{0}.jsonl" -f (Get-Date -Format "yyyyMMdd-HHmmss"))) }
  $code = Run-Node "bench.mjs" "bench.out.txt" 7200
  Say "bench.mjs exit $code$(if (Tripped) { ' (tripped: ' + (Tripped) + ')' })"
  if ($code -ne 0 -and -not (Tripped)) { throw "bench.mjs failed ($code); see logs\bench.out.txt" }
}

function Do-Looks {
  $c = Load-Cfg
  if (-not $c) { throw "no config.json in $Out; run -Phase start first" }
  if (Tripped) { Say "looks: skipped, the watchdog tripped: $(Tripped)"; return }
  if (-not (Test-Path (Join-Path $passDir "looks.mjs"))) { Say "looks: scripts/phone_pass/looks.mjs does not exist yet; skipped"; return }
  Apply-Params $c
  Save-Cfg $c
  if (-not $c.looks) { Say "looks: no -Looks file; skipped"; return }
  $code = Run-Node "looks.mjs" "looks.out.txt" 5400
  Say "looks.mjs exit $code$(if (Tripped) { ' (tripped: ' + (Tripped) + ')' })"
  if ($code -ne 0 -and -not (Tripped)) { throw "looks.mjs failed ($code); see logs\looks.out.txt" }
}

function Do-Summary {
  $c = Load-Cfg
  if (-not $c) { Say "summary: no config.json in $Out; nothing to summarize"; return }
  if (-not (Test-Path (Join-Path $passDir "summary.mjs"))) { Say "summary: scripts/phone_pass/summary.mjs does not exist yet; skipped"; return }
  Apply-Params $c
  Save-Cfg $c
  $code = Run-Node "summary.mjs" "summary.out.txt" 300
  Say "summary.mjs exit $code$(if (Test-Path (Join-Path $Out 'summary.md')) { '; ' + (Join-Path $Out 'summary.md') })"
}

function Do-Cleanup {
  $c = Load-Cfg
  if (-not $c) { Say "cleanup: no config.json in $Out; nothing to clean"; return }
  Say "cleanup"
  $adb = $c.adb; $ser = $c.serial
  # 1. the pass origins' storage; the tab parks on about:blank
  $canClean = if ($c.dry) { [int]$c.chromePid -gt 0 } else { [bool]$c.tabId }
  if ($canClean -and (Test-Path (Join-Path $passDir "cleanup.mjs"))) {
    try { Say "cleanup.mjs exit $(Run-Node 'cleanup.mjs' 'cleanup.out.txt' 90)" } catch { Say "cleanup.mjs: $($_.Exception.Message)" }
  }
  # 2. the pass's own tab, by id, while Chrome is still in front
  if (-not $c.dry -and $c.tabId) {
    try { Say "close tab $($c.tabId): $((Invoke-WebRequest "http://127.0.0.1:9222/json/close/$($c.tabId)" -UseBasicParsing -TimeoutSec 15).Content)" } catch { Say "close tab failed: $($_.Exception.Message)" }
  }
  # 3. only the pass's tunnels, and the 9222 forward only if the pass added it
  if (-not $c.dry -and $adb -and $ser) {
    foreach ($port in @($c.tunnels)) { & $adb -s $ser reverse --remove "tcp:$port" 2>&1 | Out-Null }
    if ($c.forwardAdded) { & $adb -s $ser forward --remove tcp:9222 2>&1 | Out-Null; Say "removed the 9222 forward the pass added" }
  }
  # 4. the watchdog (its stop file; its getevent child dies with it)
  if ($c.watchdogPid) {
    New-Item (Join-Path $stateDir "watchdog.stop") -ItemType File -Force | Out-Null
    $wp = Get-Process -Id $c.watchdogPid -ErrorAction SilentlyContinue
    if ($wp) { $null = $wp.WaitForExit(15000) }
    Stop-Mine ([int]$c.watchdogPid) "watchdog"
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$([int]$c.watchdogPid)" -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  }
  # 5. the servers
  foreach ($sp in @($c.serverPids)) { Stop-Mine ([int]$sp) "server" }
  # 6. the dry Chrome and its profile
  $profileDir = Join-Path $Out "chrome-profile"
  Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -and $_.CommandLine.IndexOf($profileDir, [StringComparison]::OrdinalIgnoreCase) -ge 0 } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if (Test-Path $profileDir) {
    for ($i = 0; $i -lt 10 -and (Test-Path $profileDir); $i++) {
      Remove-Item $profileDir -Recurse -Force -ErrorAction SilentlyContinue
      if (Test-Path $profileDir) { Start-Sleep -Milliseconds 500 }
    }
    Say "dry Chrome profile $(if (Test-Path $profileDir) { 'NOT fully removed' } else { 'removed' })"
  }
  $c.serverPids = @(); $c.watchdogPid = 0; $c.chromePid = 0; $c.tabId = ""; $c.tunnels = @(); $c.forwardAdded = $false
  Save-Cfg $c
  if (-not $c.dry -and $adb -and $ser) {
    Say "tunnels now (the others' stay): $((& $adb -s $ser reverse --list) -join '; ')"
    Say "forwards now: $((& $adb forward --list) -join '; ')"
  }
  # anything of the pass still alive (this process and its parents excluded)
  $mine = @{}; $cur = $PID
  while ($cur) { $mine[[int]$cur] = $true; $w = Get-CimInstance Win32_Process -Filter "ProcessId=$cur" -ErrorAction SilentlyContinue; $cur = if ($w) { $w.ParentProcessId } else { 0 }; if ($mine.ContainsKey([int]$cur)) { break } }
  $left = @(Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { -not $mine.ContainsKey([int]$_.ProcessId) -and $_.CommandLine -and $_.CommandLine.IndexOf($Out, [StringComparison]::OrdinalIgnoreCase) -ge 0 })
  Say "left running that carries this pass's folder: $(if ($left.Count) { ($left | ForEach-Object { "$($_.Name) $($_.ProcessId)" }) -join ', ' } else { 'nothing' })"
}

# --------------------------------------------------------------- dispatch
$problem = $null
try {
  if ($WaitReady -gt 0 -and -not $Dry -and $Phase -in "check", "start", "all") { Wait-PhoneReady }
  if ($Phase -eq "check") { Do-Check }
  elseif ($Phase -eq "start") { Do-Start }
  elseif ($Phase -eq "frames") { Do-Frames }
  elseif ($Phase -eq "looks") { Do-Looks }
  elseif ($Phase -eq "summary") { Do-Summary }
  elseif ($Phase -eq "cleanup") { Do-Cleanup }
  else {
    try { Do-Start; Do-Frames; Do-Looks } catch { $problem = $_; Say "FAILED: $($_.Exception.Message)" }
    try { Do-Cleanup } catch { Say "cleanup problem: $($_.Exception.Message)" }
    try { Do-Summary } catch { Say "summary problem: $($_.Exception.Message)" }
  }
} catch {
  $problem = $_
  Say "FAILED in $Phase : $($_.Exception.Message)"
}
$exitCode = 0
if ($Out -and (Tripped)) { $exitCode = 2 }
elseif ($problem) { $exitCode = if ($problem.Exception.Message -like "PHONE NOT READY*") { 3 } else { 1 } }
Say "phone pass ($Phase) exit $exitCode$(if ($Out -and $Phase -in 'all', 'summary') { '; out ' + $Out })"
exit $exitCode
