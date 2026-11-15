# K1383 s1 (k1383_phone.ps1, from K1369's k1369s4_phone.ps1): the gf reveal's cost on the Pixel in ONE blocking call.
# The read-only check (waits up to -WaitReady min for the phone to be ready; never wakes, unlocks, rotates or touches
# it), the phone lock, then the perf lock (both waited for inside this call, up to -MaxWaitMin), the K156 pass started
# with -Base (hostA) and -Head (hostB), k1383_motion.mjs on the cells (a cell's 4th field `h` runs on the head build),
# then the pass's cleanup and both locks' release whatever happened.
#   pwsh -NoProfile -File .claude/probes/K1383/k1383_phone.ps1 -Head <commit> -Label p1 [-Base 23db0dcb] [-Reps 2]
#     [-Cells "def:today:intro-d:h,def:gfg:intro-d:h,def:gfg:intro-i:h,def:gfg:intro-d,def:gfg:intro-i"]
# Output: .claude/probes/K1383/out/motion_<label>.json (untracked) and the console lines.
param([Parameter(Mandatory = $true)][string]$Head, [Parameter(Mandatory = $true)][string]$Label,
  [string]$Base = "23db0dcb", [int]$Reps = 2,
  [string]$Cells = "def:today:intro-d:h,def:gfg:intro-d:h,def:gfg:intro-i:h,def:gfg:intro-d,def:gfg:intro-i",
  [int]$WaitReady = 30, [int]$MaxWaitMin = 20)
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$lockDir = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\agents"   # the main checkout's lock scripts (run, never written)
$owner = "K1383 s1 agent (claude session 01SUPGULDxvE5gKXozfaFaFG)"
$what = "K1383 s1 Pixel: the gf reveal's cost"
$perf = Join-Path $env:TEMP "claude-perf.lock"
$out = Join-Path $PSScriptRoot "out\pass"
$pass = Join-Path $repo "scripts\phone_pass.ps1"
function Say($m) { Write-Host "$(Get-Date -Format HH:mm:ss) $m" }
& pwsh -NoProfile -File $pass -Phase check -AllowChrome -WaitReady $WaitReady
if ($LASTEXITCODE -ne 0) { Say "phone not ready (check exit $LASTEXITCODE); no run"; exit 3 }
& pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_take.ps1") -Owner $owner -What $what -MaxWaitMin $MaxWaitMin
if ($LASTEXITCODE -ne 0) { Say "no phone lock; no run"; exit 4 }
$havePerf = $false
try {
  $tw = Get-Date
  while (Test-Path $perf) {
    $held = (Get-Content $perf -ErrorAction SilentlyContinue | Select-Object -First 1)
    $age = ((Get-Date) - (Get-Item $perf).LastWriteTime).TotalMinutes
    if ($age -gt 30) { Say "perf lock stale ($([int]$age) min): $held"; break }
    if (((Get-Date) - $tw).TotalMinutes -gt $MaxWaitMin) { Say "perf lock held past $MaxWaitMin min: $held; no run"; exit 5 }
    Start-Sleep -Seconds 15
  }
  Set-Content -Path $perf -Value "$owner, $(Get-Date -Format s), $what" -Encoding ascii
  $havePerf = $true
  Say "perf lock taken"
  & pwsh -NoProfile -File $pass -Phase start -Base $Base -Head $Head -Out $out -AllowChrome -PortRange "5491-5499" -Reps 1 -WaitReady $WaitReady
  if ($LASTEXITCODE -ne 0) { Say "pass start failed (exit $LASTEXITCODE); see $out\logs" }
  else {
    & node (Join-Path $PSScriptRoot "k1383_motion.mjs") (Join-Path $out "config.json") $Label $Cells $Reps
    Say "motion exit $LASTEXITCODE"
  }
} finally {
  & pwsh -NoProfile -File $pass -Phase cleanup -Out $out
  if ($havePerf -and (Test-Path $perf) -and ((Get-Content $perf -ErrorAction SilentlyContinue | Select-Object -First 1) -like "$owner*")) { Remove-Item -LiteralPath $perf -Force; Say "perf lock released" }
  & pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_release.ps1") -Owner $owner
}
