# K1468 s2: interleaved rest frame time, builds ABC ABC (one Chrome at a time), links A and B in each launch (order
# alternating by round), on per-build warm profiles (warm.ps1). Takes the perf lock (waits inside this one command)
# and deletes it at the end. Usage:
#   interleave.ps1 -Out <dir> -Rounds 4 -Builds "b8711=5660","bae2b=5661","bmaster=5662" [-Extra '<link keys>'] [-BuildTime]
param([string]$Out, [int]$Rounds = 4, [string[]]$Builds, [string]$Extra = "", [switch]$BuildTime)
. "$PSScriptRoot/common.ps1"
# pwsh -File passes "-Builds a=1,b=2" as one string: split it (the second run's first try measured nothing for this)
$Builds = @($Builds | ForEach-Object { $_ -split "," } | Where-Object { $_ })
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1468s2-agent-a517b983"
New-Item -ItemType Directory $Out -Force | Out-Null
while ($true) {
  if (Test-Path $lock) {
    $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
    if ($age -lt 30) { Start-Sleep 20; continue }
    Write-Host "stale lock ($([int]$age) min): $(Get-Content $lock)"
  }
  "$owner $(Get-Date -Format o) rest frame time A/B (3 builds, interleaved)" | Set-Content $lock
  break
}
Write-Host "lock taken $(Get-Date -Format T)"
try {
  for ($r = 0; $r -lt $Rounds; $r++) {
    foreach ($b in $Builds) {
      $name, $port = $b -split "="
      Wait-Mem; Test-Disk
      $links = @("http://localhost:$port/$LinkA$Extra", "http://localhost:$port/$LinkB$Extra")
      if ($r % 2) { [array]::Reverse($links) }
      $env:SEC = "10"; $env:REDRAW = "1"; $env:EXTRA = $null
      "$owner $(Get-Date -Format o) rest frame time A/B round $r $name" | Set-Content $lock
      node "$PSScriptRoot/../rest.mjs" "$env:TEMP\k1468s2-prof-$name" (Join-Path $Out "r${r}_$name.json") 1 @links
    }
  }
  if ($BuildTime) {
    git show e83fa5a6:src/render/gpu_field/tables.ts | Set-Content -Encoding utf8 src/render/gpu_field/tables_k1451m.ts
    node scripts/run_node.mjs .claude/probes/K1451/k1451_buildtime.ts 5 | Tee-Object (Join-Path $Out "buildtime.txt")
    [System.IO.File]::Delete((Join-Path $PWD "src/render/gpu_field/tables_k1451m.ts"))
  }
} finally {
  if ((Test-Path $lock) -and ((Get-Content $lock) -like "$owner*")) { [System.IO.File]::Delete($lock) }
  Write-Host "lock released $(Get-Date -Format T)"
}
