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
param([Parameter(Mandatory = $true)][string]$Sha, [Parameter(Mandatory = $true)][string]$Label, [int]$Reps = 2,
  [string]$Cells = "def:today:intro-i,def:gf:intro-i,def:gf2:intro-i,def:today:intro-d,def:gf:intro-d,def:gf2:intro-d,def:today:drag,def:gf:drag,def:gf2:drag",
  [string]$Builds = "", [int]$WaitReady = 30, [int]$MaxWaitMin = 20)
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$lockDir = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\agents"   # the main checkout's lock scripts (run, never written)
$owner = "K1369 s3 agent (claude session 01SUPGULDxvE5gKXozfaFaFG)"
$out = Join-Path $PSScriptRoot "out\pass"
$pass = Join-Path $repo "scripts\phone_pass.ps1"
function Say($m) { Write-Host "$(Get-Date -Format HH:mm:ss) $m" }
& pwsh -NoProfile -File $pass -Phase check -AllowChrome -WaitReady $WaitReady
if ($LASTEXITCODE -ne 0) { Say "phone not ready (check exit $LASTEXITCODE); no run"; exit 3 }
& pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_take.ps1") -Owner $owner -What "K1369 s3 Pixel table (today / gf2l / gfl, intro + drag)" -MaxWaitMin $MaxWaitMin
if ($LASTEXITCODE -ne 0) { Say "no phone lock; no run"; exit 4 }
try {
  $dst = Join-Path $out "builds\$Sha"
  if ($Builds -and -not (Test-Path (Join-Path $dst "index.html"))) { New-Item $dst -ItemType Directory -Force | Out-Null; Copy-Item (Join-Path $Builds "$Sha\*") $dst -Recurse -Force }
  & pwsh -NoProfile -File $pass -Phase start -Base $Sha -Head $Sha -Out $out -AllowChrome -PortRange "5481-5489" -Reps 1 -WaitReady $WaitReady
  if ($LASTEXITCODE -ne 0) { Say "pass start failed (exit $LASTEXITCODE); see $out\logs" }
  else {
    & node (Join-Path $PSScriptRoot "k1369s2_motion.mjs") (Join-Path $out "config.json") $Label $Cells $Reps
    Say "motion exit $LASTEXITCODE"
  }
} finally {
  & pwsh -NoProfile -File $pass -Phase cleanup -Out $out
  & pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_release.ps1") -Owner $owner
}
