# K1325 s2: the K1314 census on chosen scenes only, under the perf lock (k1314_run.ps1's protocol), for quick
# looks at a reference rule before the full 12-scene run.
#   pwsh .claude/probes/K1325/k1325_s2_scene.ps1 -Tag s2a [-Scenes muse_hash,g41_user_tw64] [-Flags --noself]
# Output: .claude/probes/K1314/out/s1/census_<Tag>.json/.txt (same format; compare with k1325_compare.ps1).
param([string]$Tag = 's2a', [string]$Scenes = 'muse_hash', [string[]]$Flags = @())
$root = Resolve-Path "$PSScriptRoot/../../.."; Set-Location $root
$lockFile = Join-Path $env:TEMP 'claude-perf.lock'; $owner = "K1325 s2 census $Tag pid $PID"
while ((Test-Path $lockFile) -and ((Get-Date) - (Get-Item $lockFile).LastWriteTime).TotalMinutes -lt 30) { Start-Sleep 15 }
"$owner $(Get-Date -Format s) census at $(git rev-parse --short HEAD)" | Out-File -Encoding ASCII $lockFile; $env:K1314_LOCK_OWNER = $owner
try {
  node scripts/run_node.mjs .claude/probes/K1314/k1314_census.ts $Tag --scene=$Scenes --ppu=160 --min=40 @Flags
} finally {
  if ((Test-Path $lockFile) -and ((Get-Content $lockFile -Raw) -like "$owner *")) { [System.IO.File]::Delete($lockFile) }
}
