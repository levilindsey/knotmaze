# K1583 (Muse batch 27 Run Z7): capture every test maze's today|new pair on ONE preview
# of master (started by the caller; this script never starts a server). Per maze one
# perf-lock hold (scripts/perf_lock.ps1 -Owner "muse-27Z7", no lock left behind).
#   pwsh run_captures.ps1 -Port 5495 [-Mazes A_3,A_4] [-Force]
# A maze whose cap_meta.json already proves a valid pair (both hashes on the table hash,
# bit-equal views, lost 0, gf fallback empty, passes > 0) is skipped unless -Force.
# Validity is re-checked by tiles.py before any tile is cut; this skip is only a resume aid.
param([Parameter(Mandatory)][int]$Port, [string[]]$Mazes, [switch]$Force)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
$runOut = Join-Path $here "out/27Z7"
$raw = Join-Path $runOut "raw"
$profile = Join-Path $here "profile27z7"
New-Item -ItemType Directory $raw -Force | Out-Null
$all = @('A_3','A_4','A_5','A_6','A_7','A_8','A_9','A_a','A_b','A_c','A_d',
         'D_1','D_2','D_3','D_4','D_5','D_6','D_7','D_8','D_9','D_a')
$Mazes = @($Mazes | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
if (-not $Mazes) { $Mazes = $all }
$capPair = Join-Path $here "cap_pair.ps1"
$perfLock = Join-Path $repo "scripts/perf_lock.ps1"

function Test-ValidPair([string]$mz) {
  $metaPath = Join-Path $raw "$mz/cap_meta.json"
  if (-not (Test-Path $metaPath)) { return $false }
  try {
    $meta = Get-Content $metaPath -Raw | ConvertFrom-Json
    $g = $meta.loads.gf; $t = $meta.loads.today
    if ($null -eq $g -or $null -eq $t) { return $false }
    if ($g.hash -ne $t.hash -or -not $g.hash) { return $false }
    if ($g.view -ne $t.view -or -not $g.view) { return $false }
    if ($g.lost -ne 0 -or $t.lost -ne 0) { return $false }
    if ($g.gfStats.fallback -ne "" -or $g.gfStats.passes -le 0) { return $false }
    if (-not (Test-Path (Join-Path $raw "$mz/gf_b2.png"))) { return $false }
    if (-not (Test-Path (Join-Path $raw "$mz/today_b2.png"))) { return $false }
    return $true
  } catch { return $false }
}

foreach ($mz in $Mazes) {
  if ((Test-ValidPair $mz) -and -not $Force) { "skip $mz (valid pair exists; -Force to redo)"; continue }
  $cmd = "& '$capPair' -Maze $mz -Port $Port -RunOut '$raw' -Profile '$profile'"
  & pwsh -NoProfile -File $perfLock -Owner "muse-27Z7" -What "27Z7 pair $mz" -Cmd $cmd
  if ($LASTEXITCODE -ne 0) { throw "run_captures: capture of $mz failed (perf_lock exit $LASTEXITCODE)" }
  if (-not (Test-ValidPair $mz)) { throw "run_captures: $mz captured but its pair is not valid; see $raw/$mz/cap_meta.json" }
  "valid $mz $((Get-Date).ToString('HH:mm:ss'))"
}
"CAPTURES DONE $((Get-Date).ToString('HH:mm:ss'))"
