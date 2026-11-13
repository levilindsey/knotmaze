# K1325 s1: the shared form B cache's two-run check (K1333).
#   pwsh .claude/probes/K1325/k1325_cachecheck.ps1 [-Scene g41_user_tw64] [-Flag --nomarch]
# Makes a second worktree of this checkout's HEAD (detached, in $env:TEMP, node_modules junctioned from the main
# checkout), takes the perf lock (one blocking wait; a lock older than 30 min is stale) and passes its owner prefix
# as $env:K1314_LOCK_OWNER, then runs one census of -Scene in each checkout AT ONCE. -Flag gives the runs an fbf key
# nobody has built (--nomarch: s9's reference), so both write the same new tiles concurrently. While they run it
# polls the scene's key dirs for temp files (each names its writer's pid). After: the scene's key dirs, any .tmp or
# short tile (a tile's bytes must be 12 * W * H from its name) anywhere in the cache, both runs' counts, the cache's
# size. It removes the second worktree (junction first) and releases the lock only if the line is still its own.
param([string]$Scene = 'g41_user_tw64', [string]$Flag = '--nomarch')
$root = (Resolve-Path "$PSScriptRoot/../../..").Path; Set-Location $root
$main = Split-Path (git rev-parse --path-format=absolute --git-common-dir)
$cache = Join-Path $main '.claude/probes/K1314/out'
$wt = Join-Path $env:TEMP "k1325_cachecheck_$PID"
git worktree add --detach $wt HEAD 2>&1 | Select-Object -Last 1
New-Item -ItemType Junction -Path (Join-Path $wt 'node_modules') -Target (Join-Path $main 'node_modules') | Out-Null
$lockFile = Join-Path $env:TEMP 'claude-perf.lock'; $owner = "K1325 s1 cache check pid $PID"
try {
  while ((Test-Path $lockFile) -and ((Get-Date) - (Get-Item $lockFile).LastWriteTime).TotalMinutes -lt 30) { Start-Sleep 15 }
  "$owner $(Get-Date -Format s) two concurrent censuses of $Scene" | Out-File -Encoding ASCII $lockFile; $env:K1314_LOCK_OWNER = $owner
  $t0 = Get-Date
  $runs = foreach ($p in @(@{ dir = $root; tag = 'cc_a' }, @{ dir = $wt; tag = 'cc_b' })) {
    $log = Join-Path $env:TEMP "k1325_cc_$($p.tag)_$PID.log"
    $a = @('scripts/run_node.mjs', '.claude/probes/K1314/k1314_census.ts', $p.tag, "--scene=$Scene", '--ppu=160', '--min=40', $Flag)
    @{ proc = Start-Process node -ArgumentList $a -WorkingDirectory $p.dir -NoNewWindow -PassThru -RedirectStandardOutput $log -RedirectStandardError "$log.err"; log = $log; dir = $p.dir; tag = $p.tag }
  }
  $seen = @{}
  while ($runs | Where-Object { -not $_.proc.HasExited }) {
    Get-ChildItem (Join-Path $cache 'fb'), (Join-Path $cache 'fbf') -Directory -Filter "${Scene}_*" | Get-ChildItem -File -Filter '*.tmp' -ErrorAction SilentlyContinue |
      ForEach-Object { if ($_.Name -match '\.bin\.(\d+)\.[0-9a-f]+\.tmp$') { $seen[$_.Name] = $Matches[1] } }
    Start-Sleep -Milliseconds 500
  }
  "both runs done in $([int]((Get-Date) - $t0).TotalSeconds) s; node pids $(($runs | ForEach-Object { $_.proc.Id }) -join ', '); exit codes $(($runs | ForEach-Object { $_.proc.ExitCode }) -join ', ')"
  "temp files seen mid-run: $($seen.Count), by writer pid: $(($seen.Values | Group-Object | ForEach-Object { "$($_.Name) x$($_.Count)" }) -join ', ')"
} finally {
  if ((Test-Path $lockFile) -and ((Get-Content $lockFile -Raw) -like "$owner *")) { [System.IO.File]::Delete($lockFile) }
}
foreach ($r in $runs) {
  $txt = Join-Path $r.dir ".claude/probes/K1314/out/s1/census_$($r.tag).txt"
  "$($r.tag): " + ((Get-Content $txt | Where-Object { $_ -match "^$Scene\s" }) -replace '\s+', ' ')
}
foreach ($d in 'fb', 'fbf') {
  Get-ChildItem (Join-Path $cache $d) -Directory -Filter "${Scene}_*" | ForEach-Object { $f = Get-ChildItem $_.FullName -File; "$d/$($_.Name): $($f.Count) files, $([math]::Round(($f | Measure-Object Length -Sum).Sum / 1MB, 1)) MB, written $($_.LastWriteTime.ToString('T'))" }
}
$bad = Get-ChildItem (Join-Path $cache 'fb'), (Join-Path $cache 'fbf') -Recurse -File | Where-Object {
  $_.Name -like '*.tmp' -or ($_.Name -match '_(\d+)_(\d+)\.bin$' -and $_.Length -ne 12 * [long]$Matches[1] * [long]$Matches[2])
}
"temp or short files in the cache: $(@($bad).Count) $(($bad | ForEach-Object { $_.Name }) -join ', ')"
$all = Get-ChildItem (Join-Path $cache 'fb'), (Join-Path $cache 'fbf') -Recurse -File | Measure-Object Length -Sum
"shared cache: $($all.Count) files, $([math]::Round($all.Sum / 1GB, 2)) GB"
(Get-Item (Join-Path $wt 'node_modules')).Delete()
git worktree remove --force $wt
"second worktree removed: $(-not (Test-Path $wt)); main node_modules intact: $(Test-Path (Join-Path $main 'node_modules/vite/package.json'))"
