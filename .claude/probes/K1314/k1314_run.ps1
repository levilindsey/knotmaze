# K1314 s1: the 12-scene census at --ppu=160 --min=40 in three parallel groups, then merged.
#   pwsh .claude/probes/K1314/k1314_run.ps1 [-Tag s1] [-Lock]
# Form B tiles live in ONE cache that every checkout shares (K1333): the main checkout's
# .claude/probes/K1314/out/fb/<scene>_<key>/ and out/fbf/<scene>_<key>/ (k1314_census.ts CACHE_ROOT, found from any
# worktree through git rev-parse --git-common-dir), keyed by a hash of the reference's code (refCacheDirs), so a rerun
# after an outline change costs the outline raster only, a reference change builds a new key, and checkouts at one
# key share its tiles. A tile is written to a unique .tmp and renamed into place, and a read takes only a whole tile
# (12 bytes a pixel), so concurrent runs never leave or read a partial one. Pruning (pruneRoot) renames aside and
# deletes only key directories untouched for a day (every read and run touches its own) and .tmp files over an hour
# old, so it is safe while another checkout's census runs. A worktree's own out/fb and out/fbf are obsolete: delete
# them. Never copy caches by hand.
# The census waits before each scene while anyone holds $env:TEMP\claude-perf.lock. -Lock holds the lock for the
# whole run: it waits for a free lock (one blocking loop; a lock older than 30 min is stale), writes its own owner
# line, passes that line's prefix as $env:K1314_LOCK_OWNER (the census skips its own lock) and deletes the lock
# afterwards only if the line is still its own. Never wrap a run in a lock of your own without -Lock: the census
# then waits on it until it goes stale (K1314 s3's like-for-like census lost 24 min that way).
# -Flags passes census flags to every scene's run (K1325 s1: -Flags --plateau); a --no* or --plateau flag keys its own
# fbf tiles.
param([string]$Tag = 's1', [switch]$Lock, [string[]]$Flags = @())
$root = Resolve-Path "$PSScriptRoot/../../.."; Set-Location $root
$lockFile = Join-Path $env:TEMP 'claude-perf.lock'; $owner = "K1314 census $Tag pid $PID"
if ($Lock) {
  while ((Test-Path $lockFile) -and ((Get-Date) - (Get-Item $lockFile).LastWriteTime).TotalMinutes -lt 30) { Start-Sleep 15 }
  "$owner $(Get-Date -Format s) census at $(git rev-parse --short HEAD)" | Out-File -Encoding ASCII $lockFile; $env:K1314_LOCK_OWNER = $owner
}
try {
  $groups = @('muse_hash,g41_def_tw42,g41_ring_tw64,user_tw42.lightpaper', 'def,fat,g41_def_tw64,g41_user_tw42', 'muse_default_tw,ring,g41_ring_tw42,g41_user_tw64')
  $jobs = for ($i = 0; $i -lt 3; $i++) { $g = $groups[$i]; Start-Job -ScriptBlock { param($r, $t, $g, $f) Set-Location $r; node scripts/run_node.mjs .claude/probes/K1314/k1314_census.ts $t --scene=$g --ppu=160 --min=40 @f 2>&1 } -ArgumentList $root, "${Tag}_$i", $g, $Flags }
  $jobs | Wait-Job | Receive-Job | Select-String -Pattern 'px at|Error' | ForEach-Object { $_.Line }
  node scripts/run_node.mjs .claude/probes/K1314/k1314_census.ts $Tag --merge="${Tag}_0,${Tag}_1,${Tag}_2" --ppu=160 --min=40
} finally {
  if ($Lock -and (Test-Path $lockFile) -and ((Get-Content $lockFile -Raw) -like "$owner *")) { [System.IO.File]::Delete($lockFile) }
}
