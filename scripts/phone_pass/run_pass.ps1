# run_pass.ps1: one measured pass by hand: builds into the pass folder, `phone_pass.ps1 -Phase start`, then scan.mjs (the frozen
# render-sync cells; its PLAN / RUNS / ONLY / ITER / DIR / SHOT env vars pass through). bisect2.mjs does the same per pass on its own;
# use this for a one-off pass (a scan step, a spot check). It does NOT clean up the pass it starts: call it again with
# -Cleanup <that pass> or run `phone_pass.ps1 -Phase cleanup -Out <round>\<pass>`.
#
# Call (from anywhere; the phone must be awake and unlocked, the idle wait and the phone lock are the caller's):
#   pwsh -NoProfile -File scripts/phone_pass/run_pass.ps1 -Round <round dir> -Name <pass> -Base <sha8> -Head <sha8> [-Cleanup <earlier pass>]
#   -Round    the round folder (untracked, .claude/probes/rounds/<name>; round.mjs): its pool\<sha8> holds the builds
#             (a missing one is built by build_pool.ps1 first) and the pass gets the folder <Round>\<Name>
#   -Base / -Head   the two builds, 8-character shas (the pool's folder names); base and head are the labels scan.mjs plans use
#   -Cleanup  a pass folder of this round to clean up first (phone_pass.ps1 -Phase cleanup)
# The start runs through Start-Process with its output in files (<Round>\<Name>\logs\start.txt, start.err) and this script polls
# logs\run.log for "phone pass (start) exit 0": a piped or captured `-Phase start` hangs its caller, because the servers and the
# watchdog it leaves running inherit the pipe. So does a caller of THIS script (tested 2026-10-27c): a call whose output goes through
# a pipe or a `*>` redirect returns only when its pass is cleaned up (one returned the second the next call's -Cleanup ran). Make it
# the last command of a background shell with no redirect (its output lands in that task's own output file) and poll for the
# "scan <Name> exit" line.
# Exit: 0 the scan ran clean, 2 the start failed, -1 the phone's watchdog stopped the scan (a trip: <Round>\<Name>\state\watchdog.trip,
# and that pass's cleanup then exits 2; a trip ends the window), else scan.mjs's exit code.
# Example, an ABBA on one link:  $env:PLAN='[["base","dense"],["head","dense"],["head","dense"],["base","dense"]]'
param(
  [Parameter(Mandatory)][string]$Round,
  [Parameter(Mandatory)][string]$Name,
  [Parameter(Mandatory)][string]$Base,
  [Parameter(Mandatory)][string]$Head,
  [string]$Cleanup = ""
)
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$r = (Resolve-Path $Round).Path
$phonePass = Join-Path $repo "scripts\phone_pass.ps1"
if ($Cleanup) {
  New-Item -ItemType Directory -Force "$r\$Cleanup\logs" | Out-Null
  & pwsh -NoProfile -File $phonePass -Phase cleanup -Out "$r\$Cleanup" *> "$r\$Cleanup\logs\cleanup.txt"
  "cleanup $Cleanup exit=$LASTEXITCODE " + (Get-Date -Format HH:mm:ss)
}
New-Item -ItemType Directory -Force "$r\$Name\logs" | Out-Null
# builds: from the pool (built there first when absent), copied into the pass folder
foreach ($s in @($Base, $Head)) {
  if (-not (Test-Path "$r\pool\$s\index.html")) {
    & pwsh -NoProfile -File (Join-Path $PSScriptRoot "build_pool.ps1") -Round $r -Refs $s | Out-Null
  }
  $dst = "$r\$Name\builds\$s"
  if (-not (Test-Path "$dst\index.html")) {
    if (-not (Test-Path "$r\pool\$s\index.html")) { "no build for $s in $r\pool"; exit 2 }
    New-Item -ItemType Directory -Force "$r\$Name\builds" | Out-Null
    Copy-Item -Recurse -Force "$r\pool\$s" $dst
  }
}
Start-Process -FilePath pwsh -ArgumentList @('-NoProfile', '-File', $phonePass, '-Phase', 'start', '-Base', $Base, '-Head', $Head, '-Out', "$r\$Name", '-Reps', '1') -RedirectStandardOutput "$r\$Name\logs\start.txt" -RedirectStandardError "$r\$Name\logs\start.err" -WindowStyle Hidden | Out-Null
$deadline = (Get-Date).AddSeconds(100); $ok = $false
while ((Get-Date) -lt $deadline) {
  if (Test-Path "$r\$Name\logs\run.log") {
    $t = Get-Content "$r\$Name\logs\run.log" -Raw
    if ($t -match 'phone pass \(start\) exit 0') { $ok = $true; break }
    if ($t -match 'phone pass \(start\) exit [1-9]') { break }
  }
  Start-Sleep -Milliseconds 700
}
"start $Name ok=$ok " + (Get-Date -Format HH:mm:ss)
if (-not $ok) { Get-Content "$r\$Name\logs\start.txt" -ErrorAction SilentlyContinue | Select-Object -Last 15; exit 2 }
if (-not $env:DIR) { $env:DIR = 'scan' }
& node (Join-Path $PSScriptRoot "scan.mjs") "$r\$Name\config.json" 2>&1 | Select-Object -Last 30
$code = $LASTEXITCODE
"scan $Name exit=$code " + (Get-Date -Format HH:mm:ss)
exit $code