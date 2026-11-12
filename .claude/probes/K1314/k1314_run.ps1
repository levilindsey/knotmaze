# K1314 s1: the 12-scene census at --ppu=160 --min=40 in three parallel groups, then merged.
#   pwsh .claude/probes/K1314/k1314_run.ps1 [-Tag s1] [-Lock]
# Form B tiles are cached in out/fb/, so a rerun after an outline change costs the outline raster only.
# The census waits before each scene while anyone holds $env:TEMP\claude-perf.lock. -Lock holds the lock for the
# whole run: it waits for a free lock (one blocking loop; a lock older than 30 min is stale), writes its own owner
# line, passes that line's prefix as $env:K1314_LOCK_OWNER (the census skips its own lock) and deletes the lock
# afterwards only if the line is still its own. Never wrap a run in a lock of your own without -Lock: the census
# then waits on it until it goes stale (K1314 s3's like-for-like census lost 24 min that way).
param([string]$Tag = 's1', [switch]$Lock)
$root = Resolve-Path "$PSScriptRoot/../../.."; Set-Location $root
$lockFile = Join-Path $env:TEMP 'claude-perf.lock'; $owner = "K1314 census $Tag pid $PID"
if ($Lock) {
  while ((Test-Path $lockFile) -and ((Get-Date) - (Get-Item $lockFile).LastWriteTime).TotalMinutes -lt 30) { Start-Sleep 15 }
  "$owner $(Get-Date -Format s) census at $(git rev-parse --short HEAD)" | Out-File -Encoding ASCII $lockFile; $env:K1314_LOCK_OWNER = $owner
}
try {
  $groups = @('muse_hash,g41_def_tw42,g41_ring_tw64,user_tw42.lightpaper', 'def,fat,g41_def_tw64,g41_user_tw42', 'muse_default_tw,ring,g41_ring_tw42,g41_user_tw64')
  $jobs = for ($i = 0; $i -lt 3; $i++) { $g = $groups[$i]; Start-Job -ScriptBlock { param($r, $t, $g) Set-Location $r; node scripts/run_node.mjs .claude/probes/K1314/k1314_census.ts $t --scene=$g --ppu=160 --min=40 2>&1 } -ArgumentList $root, "${Tag}_$i", $g }
  $jobs | Wait-Job | Receive-Job | Select-String -Pattern 'px at|Error' | ForEach-Object { $_.Line }
  node scripts/run_node.mjs .claude/probes/K1314/k1314_census.ts $Tag --merge="${Tag}_0,${Tag}_1,${Tag}_2" --ppu=160 --min=40
} finally {
  if ($Lock -and (Test-Path $lockFile) -and ((Get-Content $lockFile -Raw) -like "$owner *")) { [System.IO.File]::Delete($lockFile) }
}
