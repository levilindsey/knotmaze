# K1208 Run K: run node probe steps under the machine perf lock (owner 22K).
#   pwsh -NoProfile -File run_locked.ps1 -Steps "k744.mjs outDir","k734.mjs outDir"
param([string[]]$Steps, [int]$MaxWaitMin = 45)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
& pwsh -NoProfile -File (Join-Path $here "../../K441/lock_take_fast.ps1") -Owner "22K" -What "K1208 Run K junction residuals (22K)" -MaxWaitMin $MaxWaitMin
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
try {
  foreach ($s in $Steps) {
    $parts = $s -split " ", 2
    $script = Join-Path $here $parts[0]
    $arg = if ($parts.Count -gt 1) { $parts[1] } else { "" }
    "--- node $($parts[0]) $arg ($(Get-Date -Format HH:mm:ss))"
    if ($arg) { & node $script $arg } else { & node $script }
    "exit $LASTEXITCODE"
    if ($LASTEXITCODE -ne 0) { throw "step failed: $s" }
  }
} finally {
  & pwsh -NoProfile -File (Join-Path $here "../../K441/lock_release_exact.ps1") -Owner "22K"
}
