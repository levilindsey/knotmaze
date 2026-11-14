# K1362 s12 (from s11, s10, s9, s8): the corner-free cell A/B on the Pixel in ONE blocking call (from k1362c1_phone.ps1): rebuild out/s12/site, wait for the
# phone to be ready (read-only check; the pass never wakes, unlocks or touches it), take the phone lock, start the K156
# pass on an existing app build (its start waits up to -WaitMin for the phone to be ready and quiet) (only its k1362s12/ folder is used), run k1362s12_gpuclk.mjs on each cfg in turn, then
# clean up and release the lock whatever happened.
#   pwsh -NoProfile -File .claude/probes/K1362/k1362s12_phone_run.ps1 [-Cfgs p9a,p9b] [-WaitMin 25]
# The app build it serves is stage 7's (the MAIN checkout's untracked out/s7/pass/builds/<Sha>, copied, read only); the
# phone lock scripts are the main checkout's .claude/probes/agents (untracked; they write only $env:TEMP\claude-phone.lock).
param([string[]]$Cfgs = @("p9a"), [int]$WaitMin = 25, [string]$Sha = "c73c7745")
$ErrorActionPreference = "Continue"
# pwsh -File passes "-Cfgs p8a,p8b" as ONE string: split it (the first s8 run asked gpuclk for cfg "p8a,p8b")
$Cfgs = @($Cfgs | ForEach-Object { $_ -split "," } | ForEach-Object { $_.Trim() } | Where-Object { $_ })
$repo = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
Set-Location $repo
$main = "C:\Users\lsl\Repositories\knotmaze"
$lockDir = Join-Path $main ".claude\probes\agents"
$owner = "K1362 s12 phone run (claude session 01SUPGULDxvE5gKXozfaFaFG)"
$out = Join-Path $PSScriptRoot "out\s12\pass"
$pass = Join-Path $repo "scripts\phone_pass.ps1"
$site = Join-Path $PSScriptRoot "out\s12\site"
function Say($m) { Write-Host "$(Get-Date -Format HH:mm:ss) $m" }
Say "build out/s12/site"
& node (Join-Path $PSScriptRoot "k1362s12_run.mjs") build
if ($LASTEXITCODE -ne 0) { Say "build failed (exit $LASTEXITCODE)"; exit 5 }
& pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_take.ps1") -Owner $owner -What "K1362 s12 corner-free cell A/B on the Pixel" -MaxWaitMin 10
if ($LASTEXITCODE -ne 0) { Say "no phone lock; no run"; exit 4 }
try {
  $dst = Join-Path $out "builds\$Sha"
  if (-not (Test-Path (Join-Path $dst "index.html"))) {
    New-Item $dst -ItemType Directory -Force | Out-Null
    $src = Join-Path $main ".claude\probes\K1362\out\s7\pass\builds\$Sha"
    Get-ChildItem $src | Where-Object { $_.Name -ne "k1362s7" } | Copy-Item -Destination $dst -Recurse -Force
  }
  Copy-Item $site (Join-Path $dst "k1362s12") -Recurse -Force
  & pwsh -NoProfile -File $pass -Phase start -Base $Sha -Head $Sha -Out $out -AllowChrome -WaitReady $WaitMin -PortRange "5493-5499" -Reps 1
  if ($LASTEXITCODE -ne 0) { Say "pass start failed (exit $LASTEXITCODE); see $out\logs" }
  else {
    Copy-Item (Join-Path $site "*") (Join-Path $dst "k1362s12") -Recurse -Force
    foreach ($c in $Cfgs) {
      Say "gpuclk $c"
      & node (Join-Path $PSScriptRoot "k1362s12_gpuclk.mjs") (Join-Path $out "config.json") $c (Join-Path $PSScriptRoot "k1362s12_cfg_$c.json")
      Say "gpuclk $c exit $LASTEXITCODE"
    }
  }
} finally {
  & pwsh -NoProfile -File $pass -Phase cleanup -Out $out
  & pwsh -NoProfile -File (Join-Path $lockDir "phone_lock_release.ps1") -Owner $owner
  Say "done"
}
