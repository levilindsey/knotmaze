# K1220 Run N: run node probe steps under the machine perf lock (owner K1220-N).
#   pwsh -NoProfile -File run_locked.ps1 -Steps "shoot.mjs out","measure.mjs out"
param([string[]]$Steps, [int]$MaxWaitMin = 45)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
& pwsh -NoProfile -File (Join-Path $here "../../K441/lock_take_fast.ps1") -Owner "K1220-N" -What "K1220 Run N text fork disc and steps (22N)" -MaxWaitMin $MaxWaitMin
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
try {
  foreach ($s in $Steps) {
    $parts = $s -split " "
    $script = Join-Path $here $parts[0]
    $rest = if ($parts.Count -gt 1) { $parts[1..($parts.Count - 1)] } else { @() }
    "--- node $($parts[0]) $rest ($(Get-Date -Format HH:mm:ss))"
    if ($rest.Count) { & node $script @rest } else { & node $script }
    "exit $LASTEXITCODE"
    if ($LASTEXITCODE -ne 0) { throw "step failed: $s" }
  }
} finally {
  & pwsh -NoProfile -File (Join-Path $here "../../K441/lock_release_exact.ps1") -Owner "K1220-N"
}
