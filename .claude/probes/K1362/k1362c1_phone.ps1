# K1362 c1: ONE short phone run, in one blocking call: the read-only check, the phone lock (waits inside this call),
# the K156 pass started on master (A) and the c1 branch (B) with the builds already made for the desktop runs reused,
# k1362c1_drag.mjs (both builds, rp=gf and today's look, ABAB), then the pass's cleanup and the lock's release
# whatever happened. Never wakes, unlocks, rotates or touches the phone: the pass's own tab, CDP touch only.
#   pwsh -NoProfile -File .claude/probes/K1362/k1362c1_phone.ps1 -Base 13c997b5 -Head d3712a82 [-Reps 2]
param([Parameter(Mandatory = $true)][string]$Base, [Parameter(Mandatory = $true)][string]$Head, [int]$Reps = 2,
  [string]$Builds = (Join-Path $env:TEMP "k1362c1"), [int]$MaxWaitMin = 20)
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$lockDir = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\agents"   # the main checkout's lock scripts (run, never written)
$owner = "K1362 c1 agent (claude session 01SUPGULDxvE5gKXozfaFaFG)"
$out = Join-Path $PSScriptRoot "out_c1\phone"
$pass = Join-Path $repo "scripts\phone_pass.ps1"
& pwsh -NoProfile -File $pass -Phase check -AllowChrome
if ($LASTEXITCODE -ne 0) { Write-Host "phone not ready (check exit $LASTEXITCODE); no run"; exit 3 }
& pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_take.ps1") -Owner $owner -What "K1362 c1 drag, master vs branch, one short run" -MaxWaitMin $MaxWaitMin
if ($LASTEXITCODE -ne 0) { Write-Host "no phone lock; no run"; exit 4 }
try {
  foreach ($sha in $Base, $Head) {
    $dst = Join-Path $out "builds\$sha"
    if (-not (Test-Path (Join-Path $dst "index.html"))) { New-Item $dst -ItemType Directory -Force | Out-Null; Copy-Item (Join-Path $Builds "$sha\*") $dst -Recurse -Force }
  }
  & pwsh -NoProfile -File $pass -Phase start -Base $Base -Head $Head -Out $out -AllowChrome -PortRange "5493-5499" -Reps 1
  if ($LASTEXITCODE -ne 0) { Write-Host "pass start failed (exit $LASTEXITCODE); see $out\logs" }
  else {
    & node (Join-Path $PSScriptRoot "k1362c1_drag.mjs") (Join-Path $out "config.json") "c1" $Reps
    Write-Host "drag exit $LASTEXITCODE"
  }
} finally {
  & pwsh -NoProfile -File $pass -Phase cleanup -Out $out
  & pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_release.ps1") -Owner $owner
}
