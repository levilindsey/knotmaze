# K1387 s1 (k1387_phone.ps1): k1369s4_phone.ps1 with -Base / -Head (two builds, both copied from -Builds), this stage's
# lock owner, the perf lock held around the motion run, and k1387_motion.mjs (a setting suffixed @b loads the head build).
#   pwsh -NoProfile -File .claude/probes/K1387/k1387_phone.ps1 -Base <sha> -Head <sha> -Label p1 -Builds <dir> -Cells def:gfg:intro-d,def:gfg@b:intro-d,...
# K1369 s4 (k1369s4_phone.ps1): k1369s3_phone.ps1 with this stage's lock owner, running k1369s4_motion.mjs (its settings
# gfd1 / gfd2 / gfg / gfc).
# K1369 s3 (k1369s3_phone.ps1): k1369s2_phone.ps1 with only the phone lock's owner and What changed, so the lock names
# this stage. Lean is gf's default from 895619f3, so gfl is gf as shipped (depth 1); gf2l is depth 2.
# K1369 s2 (k1369s2_phone.ps1, from s1's k1369_phone.ps1; runs k1369s2_motion.mjs, default cells today/gf/gf2 x intro-i,
# intro-d, drag, run ABBA with -Reps 2; set K1369_COOL / K1369_COOLMAX for equal rests).
# K1369 s1: the motion table on the Pixel in ONE blocking call (from k1362c1_phone.ps1): the read-only check (waits up to
# -WaitReady min for the phone to be ready; never wakes, unlocks, rotates or touches it), the phone lock (waits inside
# this call), the K156 pass started A/A on one build (built once into out/pass/builds/<sha>, or copied from -Builds),
# k1369_motion.mjs on the cells, then the pass's cleanup and the lock's release whatever happened.
#   pwsh -NoProfile -File .claude/probes/K1369/k1369_phone.ps1 -Sha <commit> -Label t1 [-Reps 1] [-WaitReady 30]
#     [-Cells "def:today:intro-i,def:gf:intro-i,..."]   (link:setting:scenario; see k1369_motion.mjs's header)
# Output: .claude/probes/K1369/out/motion_<label>.json (untracked) and the console lines.
param([Parameter(Mandatory = $true)][string]$Base, [Parameter(Mandatory = $true)][string]$Head, [Parameter(Mandatory = $true)][string]$Label, [int]$Reps = 2,
  [string]$Cells = "def:today:intro-i,def:gf:intro-i,def:gf2:intro-i,def:today:intro-d,def:gf:intro-d,def:gf2:intro-d,def:today:drag,def:gf:drag,def:gf2:drag",
  [string]$Builds = "", [int]$WaitReady = 30, [int]$MaxWaitMin = 20)
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$lockDir = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\agents"   # the main checkout's lock scripts (run, never written)
$owner = "K1387 s2 agent (claude session 01SUPGULDxvE5gKXozfaFaFG)"
$out = Join-Path $PSScriptRoot "out\pass"
$pass = Join-Path $repo "scripts\phone_pass.ps1"
function Say($m) { Write-Host "$(Get-Date -Format HH:mm:ss) $m" }
& pwsh -NoProfile -File $pass -Phase check -AllowChrome -WaitReady $WaitReady
if ($LASTEXITCODE -ne 0) { Say "phone not ready (check exit $LASTEXITCODE); no run"; exit 3 }
& pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_take.ps1") -Owner $owner -What "K1387 s2 Pixel ABBA (base vs branch, rp=gf, intro-d + drag)" -MaxWaitMin $MaxWaitMin
if ($LASTEXITCODE -ne 0) { Say "no phone lock; no run"; exit 4 }
try {
  foreach ($sha in @($Base, $Head)) {   # s2: both builds (the s1 line copied an undefined $Sha)
    $dst = Join-Path $out "builds\$sha"
    if ($Builds -and -not (Test-Path (Join-Path $dst "index.html"))) { New-Item $dst -ItemType Directory -Force | Out-Null; Copy-Item (Join-Path $Builds "$sha\*") $dst -Recurse -Force }
  }
  & pwsh -NoProfile -File $pass -Phase start -Base $Base -Head $Head -Out $out -AllowChrome -PortRange "5481-5489" -Reps 1 -WaitReady $WaitReady
  if ($LASTEXITCODE -ne 0) { Say "pass start failed (exit $LASTEXITCODE); see $out\logs" }
  else {
    $perf = Join-Path $env:TEMP "claude-perf.lock"; $tw = Get-Date
    while ((Test-Path $perf) -and ((Get-Date) - $tw).TotalMinutes -lt $MaxWaitMin) { Start-Sleep 15 }
    Set-Content $perf "$owner, $(Get-Date -Format s), K1387 s2 Pixel ABBA motion run" -Encoding ASCII
    try { & node (Join-Path $PSScriptRoot "k1387_motion.mjs") (Join-Path $out "config.json") $Label $Cells $Reps } finally { if ((Get-Content $perf -TotalCount 1) -like "$owner*") { [IO.File]::Delete($perf) } }
    Say "motion exit $LASTEXITCODE"
  }
} finally {
  & pwsh -NoProfile -File $pass -Phase cleanup -Out $out
  & pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_release.ps1") -Owner $owner
}
