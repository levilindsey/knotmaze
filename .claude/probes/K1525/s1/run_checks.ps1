# K1525 s1 checks, one Chrome at a time, on a build of the tip's src (the tip's src = 330069e61's: served on 6030).
#   pwsh -NoProfile -File .claude/probes/K1525/s1/run_checks.ps1 -Base http://127.0.0.1:6030 -Ref <tip sha> [-SkipBar]
param([string]$Base = "http://127.0.0.1:6030", [string]$Ref, [switch]$SkipBar)
$ErrorActionPreference = "Continue"
$out = ".claude/probes/K1525/out/s1/checks"
New-Item -ItemType Directory $out -Force | Out-Null
$prof = Join-Path $env:TEMP "k1525s1-prof-hold"
$q3 = "$Base/?3&xp=off&am=instant&rp=gf"
$la = "$Base/?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1&tlk=fill"
"$(Get-Date -Format HH:mm:ss) hold q3"
node .claude/probes/K1450/hold.mjs $q3 "$out/hold_q3" $prof 60 250 5000 2>&1 | Select-Object -Last 4
"hold q3 exit $LASTEXITCODE"
"$(Get-Date -Format HH:mm:ss) hold A"
node .claude/probes/K1450/hold.mjs $la "$out/hold_A" $prof 60 250 5000 2>&1 | Select-Object -Last 4
"hold A exit $LASTEXITCODE"
"$(Get-Date -Format HH:mm:ss) fade (SHOTS=1)"
$env:SHOTS = "1"
node .claude/probes/K1458/fade.mjs $Base "$out/fade" $prof "0,0.5,1.2,0.14" "gf,gfh" 2>&1 | Select-Object -Last 8
"fade exit $LASTEXITCODE"
$env:SHOTS = $null
"$(Get-Date -Format HH:mm:ss) dragcheck gf"
node .claude/probes/K1458/dragcheck.mjs $Base "$out/fade" $prof gf 2>&1 | Select-Object -Last 6
"dragcheck gf exit $LASTEXITCODE"
"$(Get-Date -Format HH:mm:ss) dragcheck gfh"
node .claude/probes/K1458/dragcheck.mjs $Base "$out/fade" $prof gfh 2>&1 | Select-Object -Last 6
"dragcheck gfh exit $LASTEXITCODE"
"$(Get-Date -Format HH:mm:ss) two-load control (A gf fill fl 0.14 / 1.2 again on this build)"
node .claude/probes/K1525/s1/cap.mjs $Base "$out/ctl" (Join-Path $env:TEMP "k1525s1-prof-cap") .claude/probes/K1525/s1/jobs_ctl.json 2>&1 | Select-Object -Last 2
if (-not $SkipBar) {
  "$(Get-Date -Format HH:mm:ss) K1436 bar"
  $env:STRICT = "1"
  pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1 -Ref $Ref -Base 330069e61 -Scenes ring,def,muse_hash,g41_user_tw64 -Tag k1525s1 -NoPerfLock -Port 6040 -PrevRoot (Join-Path $env:TEMP "k1525s1-barprev") 2>&1 | Select-Object -Last 12
  "bar exit $LASTEXITCODE"
  $env:STRICT = $null
}
"$(Get-Date -Format HH:mm:ss) checks done"
