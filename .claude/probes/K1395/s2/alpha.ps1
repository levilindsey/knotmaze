# K1395 s2: alpha.mjs for today and gf at one reveal fraction. Run under scripts/perf_lock.ps1.
#   & .\alpha.ps1 -Port 5630 -Am bloom-comet -Frac 0.4 -Tag comet_f3
param([int]$Port = 5630, [string]$Am = "bloom-comet", [double]$Frac = 0.4, [string]$Tag = "comet_f3", [string]$Cols = "today,gf")
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$out = Join-Path $here "out"
New-Item -ItemType Directory $out -Force | Out-Null
$env:PROFILE = Join-Path $here "prof"
$link = "3.FGH1HtvQeDjm6e4BII&gfh=1" + ($(if ($Am) { "&am=$Am" } else { "" }))
foreach ($c in $Cols.Split(",")) {
  & node (Join-Path $here "alpha.mjs") "http://127.0.0.1:$Port" $link $c $Frac (Join-Path $out "${Tag}_$c") 2>&1 | Tee-Object -FilePath (Join-Path $out "${Tag}_$c.log")
}
exit 0
