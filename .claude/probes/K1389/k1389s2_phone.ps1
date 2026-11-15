# K1389 s2 (k1389s2_phone.ps1, from K1369's k1369s4_phone.ps1): the look's cost on the Pixel, base against head, in ONE
# blocking call: the read-only check (never wakes, unlocks, rotates or touches the phone), the phone lock (waits inside
# this call), then per sha: the K156 pass started A/A on that build (copied from -From<sha> when given), k1369s4_motion.mjs
# on the cells, the pass's cleanup; the lock's release whatever happened.
#   pwsh -NoProfile -File .claude/probes/K1389/k1389s2_phone.ps1 -Shas 2b1cffe1,377ccdd0 -Label s2p [-Reps 1]
#     [-Cells "def:gfg:intro-d,def:gfg:drag"] [-Builds "<sha>=<dir with index.html>;..."]
# Output: .claude/probes/K1369/out/motion_<label>_<sha>.json (untracked) and the console lines.
param([string[]]$Shas = @("2b1cffe1", "377ccdd0"), [Parameter(Mandatory = $true)][string]$Label, [int]$Reps = 1,
  [string]$Cells = "def:gfg:intro-d,def:gfg:drag", [string]$Builds = "", [int]$WaitReady = 30, [int]$MaxWaitMin = 25)
$Shas = @($Shas | ForEach-Object { $_ -split "," } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
$lockDir = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\agents"   # the main checkout's lock scripts (run, never written)
$owner = "K1389 s2 agent (claude session 01SUPGULDxvE5gKXozfaFaFG)"
$k69 = Join-Path $repo ".claude\probes\K1369"
$out = Join-Path $PSScriptRoot "out\pass"
$pass = Join-Path $repo "scripts\phone_pass.ps1"
$src = @{}; foreach ($kv in ($Builds -split ";" | Where-Object { $_ })) { $p = $kv -split "=", 2; $src[$p[0]] = $p[1] }
function Say($m) { Write-Host "$(Get-Date -Format HH:mm:ss) $m" }
& pwsh -NoProfile -File $pass -Phase check -AllowChrome -WaitReady $WaitReady
if ($LASTEXITCODE -ne 0) { Say "phone not ready (check exit $LASTEXITCODE); no run"; exit 3 }
& pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_take.ps1") -Owner $owner -What "K1389 s2 Pixel look cost (rp=gf, base $($Shas[0]) vs head)" -MaxWaitMin $MaxWaitMin
if ($LASTEXITCODE -ne 0) { Say "no phone lock; no run"; exit 4 }
try {
  foreach ($sha in $Shas) {
    $dst = Join-Path $out "builds\$sha"
    if ($src[$sha] -and -not (Test-Path (Join-Path $dst "index.html"))) {
      New-Item $dst -ItemType Directory -Force | Out-Null; Copy-Item (Join-Path $src[$sha] "*") $dst -Recurse -Force
    }
    Say "pass start $sha"
    & pwsh -NoProfile -File $pass -Phase start -Base $sha -Head $sha -Out $out -AllowChrome -PortRange "5481-5489" -Reps 1 -WaitReady $WaitReady
    if ($LASTEXITCODE -ne 0) { Say "pass start failed for $sha (exit $LASTEXITCODE); see $out\logs" }
    else {
      & node (Join-Path $k69 "k1369s4_motion.mjs") (Join-Path $out "config.json") "${Label}_$sha" $Cells $Reps
      Say "motion $sha exit $LASTEXITCODE"
    }
    & pwsh -NoProfile -File $pass -Phase cleanup -Out $out
  }
} finally {
  & pwsh -NoProfile -File $pass -Phase cleanup -Out $out
  & pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_release.ps1") -Owner $owner
}
exit 0
