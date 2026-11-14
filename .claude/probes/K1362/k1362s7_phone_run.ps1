# K1362 s7: the split's Pixel numbers in ONE blocking call (from k1362c1_phone.ps1): rebuild out/s7/site, wait for the
# phone to be ready (read-only check; the pass never wakes, unlocks or touches it), take the phone lock, start the K156
# pass on an existing app build (its start waits up to -WaitMin for the phone to be ready and quiet) (only its k1362s7/ folder is used), run k1362s7_gpuclk.mjs on each cfg in turn, then
# clean up and release the lock whatever happened.
#   pwsh -NoProfile -File .claude/probes/K1362/k1362s7_phone_run.ps1 [-Cfgs phone2,dpr15] [-WaitMin 25]
param([string[]]$Cfgs = @("phone2", "dpr15"), [int]$WaitMin = 25, [string]$Sha = "c73c7745")
$ErrorActionPreference = "Continue"
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location $repo
$lockDir = Join-Path $repo ".claude\probes\agents"
$owner = "K1362 s7 phone run (claude session 01SUPGULDxvE5gKXozfaFaFG)"
$out = Join-Path $PSScriptRoot "out\s7\pass"
$pass = Join-Path $repo "scripts\phone_pass.ps1"
$site = Join-Path $PSScriptRoot "out\s7\site"
function Say($m) { Write-Host "$(Get-Date -Format HH:mm:ss) $m" }
Say "build out/s7/site"
& node (Join-Path $PSScriptRoot "k1362s7_run.mjs") build
if ($LASTEXITCODE -ne 0) { Say "build failed (exit $LASTEXITCODE)"; exit 5 }
& pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_take.ps1") -Owner $owner -What "K1362 s7 split forms on the Pixel" -MaxWaitMin 10
if ($LASTEXITCODE -ne 0) { Say "no phone lock; no run"; exit 4 }
try {
  $dst = Join-Path $out "builds\$Sha"
  if (-not (Test-Path (Join-Path $dst "index.html"))) {
    New-Item $dst -ItemType Directory -Force | Out-Null
    $src = Join-Path $PSScriptRoot "out\s6\pass\builds\$Sha"
    Get-ChildItem $src | Where-Object { $_.Name -ne "k1362s6" } | Copy-Item -Destination $dst -Recurse -Force
  }
  Copy-Item $site (Join-Path $dst "k1362s7") -Recurse -Force
  & pwsh -NoProfile -File $pass -Phase start -Base $Sha -Head $Sha -Out $out -AllowChrome -WaitReady $WaitMin -PortRange "5493-5499" -Reps 1
  if ($LASTEXITCODE -ne 0) { Say "pass start failed (exit $LASTEXITCODE); see $out\logs" }
  else {
    Copy-Item (Join-Path $site "*") (Join-Path $dst "k1362s7") -Recurse -Force
    foreach ($c in $Cfgs) {
      Say "gpuclk $c"
      & node (Join-Path $PSScriptRoot "k1362s7_gpuclk.mjs") (Join-Path $out "config.json") $c (Join-Path $PSScriptRoot "k1362s7_cfg_$c.json")
      Say "gpuclk $c exit $LASTEXITCODE"
    }
  }
} finally {
  & pwsh -NoProfile -File $pass -Phase cleanup -Out $out
  & pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_release.ps1") -Owner $owner
  Say "done"
}
