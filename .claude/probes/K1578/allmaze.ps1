# K1578 (Muse batch 27 Run V): list and sheet EVERY place a candidate commit changes against a
# base commit, on every test maze - the one tool for any two commits, made from stage 40's script
# chain (.claude/probes/K1482/s40/: capseq40.ps1's 21-maze table, cap40.ps1's captures,
# s33/diff33.py's places, s39/place39.py's sheets; see ### Handoff K1482 s40 in
# docs/design/K1482_s40_ball_narrow.md). No candidate goes to Levi before every place it changes
# on ALL the test mazes has a picture (K1578; .claude/rules/render-gpu-field.md).
#   pwsh .claude/probes/K1578/allmaze.ps1 -Base <commit> -Cand <commit> -Name <run> [-Mazes A_3,A_4] [-Fill] [-Off] [-Force]
# It builds both commits (scripts/preview.ps1 -Port <p> -Ref <commit>, ports 5500-5519, a per-run
# root under $env:TEMP; a local commit is built by SHA only - never checked out, merged or
# pushed), then per maze ONE capture session with the loads base, candidate, base, candidate
# (cap_maze.ps1, tags m/c/m2/c2), compared only inside that session (analyze_maze.py). Ports and
# previews are stopped and their directories removed when the run ends.
# Under .claude/probes/K1578/out/<run>/ (untracked): mazes.txt (per maze: hash, passes, base
# against base px, candidate against candidate px, base against candidate px and place count,
# the repeat pair's px), places.txt (per changed place: maze, x, y in device px, px gained,
# px lost, nearest site, sheet), sheets/<maze>_<x>x<y>_<site>.png (place39's layout: base |
# candidate, wide and close, as drawn and brightened) and look/<the same name> (the sheet's two
# brightened rows only, 1300 px wide). The diffed shot is gf_b2 (the still border shot), or
# gf_fill with -Fill; -Off also captures and lists each maze with &gfk=0 (rows <maze>_off).
# Mirror first pass (K1581, Muse batch 27 Run Y): the CPU mirror (census40.ts, candidate
# worktree) may NOT stand as a first pass for this tool. On ball40's pair (d1c25f5fe ->
# 4925aa786) matched against the tool's 64 captured places at 48 px (match27y.py): captured 64,
# mirror 21, matched 17, captured-only 47, mirror-only 4. Every captured-only place sits on A_b:
# 46 stroke-edge places of 1-7 px and the start marker's ring at j142 (22 px) - a view shift
# between the two builds' fit landings (now pinned away in cap_maze.ps1) and a Pixi marker the
# mirror's corner-ink census never evaluates. The mirror matched every real ink place (all 17
# across the other nine mazes plus A_b's t25e), but it also splits two corners into two groups
# (A_7 t83e/t83s, A_9 t28e) and sees 2 sub-level places of 1-3 px the screen step cannot list
# (A_7 t37e, A_9 t10s). A mirror run can therefore shortlist corners, but a place it does not
# list is not proven unchanged on screen, and this tool's captures stay the gate.
# A maze that already has its mazes.txt row is skipped unless -Force. A maze whose base against
# base or candidate against candidate is not 0 px is captured once more; if it is still not 0
# its row is flagged with its px. The perf lock is taken PER MAZE (scripts/perf_lock.ps1
# -Owner "muse-27V", one maze per hold, no lock left behind).
param([Parameter(Mandatory)][string]$Base, [Parameter(Mandatory)][string]$Cand,
      [Parameter(Mandatory)][string]$Name, [string[]]$Mazes, [switch]$Fill, [switch]$Off, [switch]$Force)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
$runOut = Join-Path $here "out/$Name"
New-Item -ItemType Directory $runOut -Force | Out-Null
$img = if ($Fill) { "gf_fill" } else { "gf_b2" }
$all = @('A_3','A_4','A_5','A_6','A_7','A_8','A_9','A_a','A_b','A_c','A_d',
         'D_1','D_2','D_3','D_4','D_5','D_6','D_7','D_8','D_9','D_a')
$Mazes = @($Mazes | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
if (-not $Mazes) { $Mazes = $all }
$baseSha = (git -C $repo rev-parse $Base).Trim()
$candSha = (git -C $repo rev-parse $Cand).Trim()
"allmaze $Name base $baseSha cand $candSha img $img mazes $($Mazes -join ' ') $(Get-Date -Format s)"

function Test-FreePort([int]$p) {
  return -not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)
}
$ports = @()
for ($p = 5500; $p -le 5519 -and $ports.Count -lt 2; $p++) { if (Test-FreePort $p) { $ports += $p } }
if ($ports.Count -lt 1) { throw "allmaze: no free port in 5500-5519" }
$basePort = $ports[0]
$sameBuild = $baseSha -eq $candSha
$candPort = if ($sameBuild) { $basePort } elseif ($ports.Count -ge 2) { $ports[1] } else { throw "allmaze: need two free ports in 5500-5519" }

$root = Join-Path $env:TEMP "k1578-$Name"
$procs = @()
function Start-Preview([string]$sha, [int]$port, [string]$label) {
  $log = Join-Path $runOut "preview_$label.log"
  $args = @("-NoProfile", "-File", (Join-Path $repo "scripts/preview.ps1"), "-Port", "$port", "-Ref", $sha, "-Root", $root)
  $pr = Start-Process pwsh -ArgumentList $args -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  $deadline = (Get-Date).AddSeconds(900)
  while ((Get-Date) -lt $deadline) {
    if ($pr.HasExited) { throw "allmaze: preview $label ($sha) exited; see $log" }
    try {
      $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$port/" -TimeoutSec 5
      if ($r.StatusCode -eq 200) { "preview $label $sha on $port ready $((Get-Date).ToString('HH:mm:ss'))"; return $pr }
    } catch { Start-Sleep -Seconds 5 }
  }
  throw "allmaze: preview $label ($sha) not ready in 900 s; see $log"
}

try {
  $procs += Start-Preview $baseSha $basePort "base"
  if (-not $sameBuild) { $procs += Start-Preview $candSha $candPort "cand" }
  else { "candidate is the base build; one preview serves both" }

  $capMaze = Join-Path $here "cap_maze.ps1"
  $perfLock = Join-Path $repo "scripts/perf_lock.ps1"
  $variants = @("")
  if ($Off) { $variants += "_off" }
  foreach ($mz in $Mazes) {
    foreach ($v in $variants) {
      $rowName = "$mz$v"
      $hasRow = (Test-Path (Join-Path $runOut "mazes.txt")) -and
        [bool](Select-String -Path (Join-Path $runOut "mazes.txt") -Pattern "^$([regex]::Escape($rowName))`t" -Quiet)
      if ($hasRow -and -not $Force) { "skip $rowName (row exists; -Force to redo)"; continue }
      for ($attempt = 1; $attempt -le 2; $attempt++) {
        $extra = $(if ($Fill) { " -Fill" } else { "" }) + $(if ($Off) { " -Off" } else { "" })
        $cmd = "& '$capMaze' -Maze $mz -BasePort $basePort -CandPort $candPort -RunOut '$runOut'$extra"
        & pwsh -NoProfile -File $perfLock -Owner "muse-27V" -What "allmaze $Name $rowName" -Cmd $cmd
        if ($LASTEXITCODE -ne 0) { throw "allmaze: capture of $rowName failed (perf_lock exit $LASTEXITCODE)" }
        python (Join-Path $here "analyze_maze.py") $runOut $rowName --img $img
        $code = $LASTEXITCODE
        if ($code -eq 0) { break }
        if ($code -eq 2 -and $attempt -eq 1) {
          "recapture $rowName (a floor was not 0 px)"
          python (Join-Path $here "analyze_maze.py") $runOut $rowName --undo | Out-Null
          continue
        }
        if ($code -eq 2) { "FLAGGED $rowName (floors still not 0 px after the recapture; row carries its px)"; break }
        throw "allmaze: analyze of $rowName failed (exit $code)"
      }
    }
  }
  "ALLMAZE $Name DONE $((Get-Date).ToString('HH:mm:ss'))"
} finally {
  foreach ($pr in $procs) {
    if ($pr -and -not $pr.HasExited) { taskkill /T /F /PID $pr.Id 2>$null | Out-Null }
  }
  Start-Sleep -Seconds 3
  if (Test-Path $root) {
    foreach ($d in @(Get-ChildItem $root -Directory -Filter "src-*" -Force -ErrorAction SilentlyContinue)) {
      $nm = Get-Item (Join-Path $d.FullName "node_modules") -Force -ErrorAction SilentlyContinue
      if ($nm -and $nm.LinkType) { $nm.Delete() }
      git -C $repo worktree remove --force $d.FullName 2>$null | Out-Null
    }
    Remove-Item $root -Recurse -Force -ErrorAction SilentlyContinue
  }
}
