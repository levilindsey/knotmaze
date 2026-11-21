# K1384 / 27Z3: the twelve cold loads of brief Done 1, in a fixed interleaved
# order. Every load gets a fresh Chrome profile under $env:TEMP\knotmaze-27Z3
# (the GPU program cache lives in the profile), removed as soon as its load
# ends. Run the whole sequence through scripts/perf_lock.ps1, e.g.
#   pwsh scripts/perf_lock.ps1 -Owner "muse-27Z3" -What "27Z3 cold loads" -Cmd "pwsh .claude/probes/K1384/run27z3.ps1 -Base http://127.0.0.1:5493/ -OutDir .claude/probes/K1384/out/27Z3"
# A label with its JSON already in OutDir is skipped (a resumed sequence
# never re-runs a finished cold load; delete the JSON to redo that load).
param(
  [Parameter(Mandatory)][string]$Base,
  [Parameter(Mandatory)][string]$OutDir,
  [string[]]$Only = @()
)
$ErrorActionPreference = "Stop"
$repo = (git rev-parse --show-toplevel).Trim()
$out = Join-Path $repo $OutDir
New-Item -ItemType Directory -Force $out | Out-Null
$tmp = Join-Path $env:TEMP "knotmaze-27Z3"
$loads = @(
  @{ L = "A-gf1";  M = "gf";      Q = "?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1" },
  @{ L = "A-ctl1"; M = "control"; Q = "?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant" },
  @{ L = "P-gf1";  M = "gf";      Q = "?3&xp=off&am=instant&rp=gf" },
  @{ L = "P-ctl1"; M = "control"; Q = "?3&xp=off&am=instant" },
  @{ L = "A-gf2";  M = "gf";      Q = "?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1" },
  @{ L = "A-ctl2"; M = "control"; Q = "?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant" },
  @{ L = "P-gf2";  M = "gf";      Q = "?3&xp=off&am=instant&rp=gf" },
  @{ L = "P-ctl2"; M = "control"; Q = "?3&xp=off&am=instant" },
  @{ L = "A-gf3";  M = "gf";      Q = "?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&rp=gf&gfh=1" },
  @{ L = "A-ctl3"; M = "control"; Q = "?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant" },
  @{ L = "P-gf3";  M = "gf";      Q = "?3&xp=off&am=instant&rp=gf" },
  @{ L = "P-ctl3"; M = "control"; Q = "?3&xp=off&am=instant" }
)
foreach ($ld in $loads) {
  if ($Only.Count -and $ld.L -notin $Only) { continue }
  $json = Join-Path $out "$($ld.L).json"
  if (Test-Path $json) { "$($ld.L): already recorded, skipped"; continue }
  $prof = Join-Path $tmp "prof-$($ld.L)"
  if (Test-Path $prof) { Remove-Item $prof -Recurse -Force }
  "$(Get-Date -Format o) $($ld.L) $($ld.M) start"
  node (Join-Path $repo ".claude/probes/K1384/cold27z3.mjs") ($Base + $ld.Q) $prof $json $ld.M
  if ($LASTEXITCODE -ne 0) { throw "cold27z3 $($ld.L) exited $LASTEXITCODE" }
  if (Test-Path $prof) { Remove-Item $prof -Recurse -Force -ErrorAction SilentlyContinue }
  "$(Get-Date -Format o) $($ld.L) done"
}
