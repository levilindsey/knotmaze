# K1572 Muse batch 27 Run Z6 (27Z6): build N (stage 41, 1f44d1509) against master on all
# 21 test mazes (A_3..A_d, D_1..D_a), probes only, nothing of N lands. Captures reuse the
# K1578 chain verbatim (cap_maze.ps1's four loads base, candidate, base, candidate on one
# pinned view, analyze_maze.py's 24 px cell merge on gf_b2, rp=gf gfh=1), one session per
# maze, compared only inside that session. This driver only adds what Run Z6 needs on top:
# previews of the two commits by SHA (scripts/preview.ps1 -Ref; a local commit is built by
# SHA only, never checked out, merged or pushed), the perf lock as muse-27Z6 one maze per
# hold, validity lines (hash, lost, passes, views) beside analyze_maze's floors, and its
# outputs under .claude/probes/K1572/out/27Z6/ (untracked).
#   pwsh .claude/probes/K1572/run27z6.ps1 -Base <master sha> -Cand <N sha> [-Mazes A_4,A_5] [-Force]
# A maze whose mazes.txt row exists is skipped unless -Force. A maze whose base-vs-base or
# cand-vs-cand floor is not 0 px is captured once more, then flagged with its px (K1534).
# Previews and their $env:TEMP root are stopped and removed when the run ends.
param([Parameter(Mandatory)][string]$Base, [Parameter(Mandatory)][string]$Cand,
      [string[]]$Mazes, [switch]$Force)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
$runOut = Join-Path $here "out/27Z6"
New-Item -ItemType Directory $runOut -Force | Out-Null
$all = @('A_3','A_4','A_5','A_6','A_7','A_8','A_9','A_a','A_b','A_c','A_d',
         'D_1','D_2','D_3','D_4','D_5','D_6','D_7','D_8','D_9','D_a')
$Mazes = @($Mazes | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
if (-not $Mazes) { $Mazes = $all }
$baseSha = (git -C $repo rev-parse $Base).Trim()
$candSha = (git -C $repo rev-parse $Cand).Trim()
"run27z6 base $baseSha cand $candSha mazes $($Mazes -join ' ') $(Get-Date -Format s)"

function Test-FreePort([int]$p) {
  return -not (Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction SilentlyContinue)
}
$ports = @()
for ($p = 5480; $p -le 5499 -and $ports.Count -lt 2; $p++) { if (Test-FreePort $p) { $ports += $p } }
if ($ports.Count -lt 2) { throw "run27z6: need two free ports in 5480-5499" }
$basePort, $candPort = $ports[0], $ports[1]

$root = Join-Path $env:TEMP "k1572-27Z6"
$procs = @()
function Start-Preview([string]$sha, [int]$port, [string]$label) {
  $log = Join-Path $runOut "preview_$label.log"
  $args = @("-NoProfile", "-File", (Join-Path $repo "scripts/preview.ps1"), "-Port", "$port", "-Ref", $sha, "-Root", $root)
  $pr = Start-Process pwsh -ArgumentList $args -PassThru -WindowStyle Hidden `
    -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  $deadline = (Get-Date).AddSeconds(900)
  while ((Get-Date) -lt $deadline) {
    if ($pr.HasExited) { throw "run27z6: preview $label ($sha) exited; see $log" }
    try {
      $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$port/" -TimeoutSec 5
      if ($r.StatusCode -eq 200) {
        $lis = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
        $cmd = ""
        if ($lis) { $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($lis.OwningProcess)").CommandLine }
        "preview $label $sha on $port ready $((Get-Date).ToString('HH:mm:ss')) listener: $cmd"
        if ($cmd -notlike "*$root*") { throw "run27z6: listener on $port is not this run's preview (cmdline lacks $root)" }
        return $pr
      }
    } catch {
      if ($_.Exception.Message -like "run27z6:*") { throw }
      Start-Sleep -Seconds 5
    }
  }
  throw "run27z6: preview $label ($sha) not ready in 900 s; see $log"
}

try {
  $procs += Start-Preview $baseSha $basePort "base"
  $procs += Start-Preview $candSha $candPort "cand"

  $capMaze = Join-Path $repo ".claude/probes/K1578/cap_maze.ps1"
  $analyze = Join-Path $repo ".claude/probes/K1578/analyze_maze.py"
  $perfLock = Join-Path $repo "scripts/perf_lock.ps1"
  foreach ($mz in $Mazes) {
    $hasRow = (Test-Path (Join-Path $runOut "mazes.txt")) -and
      [bool](Select-String -Path (Join-Path $runOut "mazes.txt") -Pattern "^$([regex]::Escape($mz))`t" -Quiet)
    if ($hasRow -and -not $Force) { "skip $mz (row exists; -Force to redo)"; continue }
    for ($attempt = 1; $attempt -le 2; $attempt++) {
      $cmd = "& '$capMaze' -Maze $mz -BasePort $basePort -CandPort $candPort -RunOut '$runOut'"
      & pwsh -NoProfile -File $perfLock -Owner "muse-27Z6" -What "run27z6 $mz" -Cmd $cmd
      if ($LASTEXITCODE -ne 0) { throw "run27z6: capture of $mz failed (perf_lock exit $LASTEXITCODE)" }
      python $analyze $runOut $mz --img gf_b2
      $code = $LASTEXITCODE
      if ($code -eq 0) { break }
      if ($code -eq 2 -and $attempt -eq 1) {
        "recapture $mz (a floor was not 0 px)"
        python $analyze $runOut $mz --undo | Out-Null
        continue
      }
      if ($code -eq 2) { "FLAGGED $mz (floors still not 0 px after the recapture; row carries its px)"; break }
      throw "run27z6: analyze of $mz failed (exit $code)"
    }
  }
  "RUN27Z6 CAPTURES DONE $((Get-Date).ToString('HH:mm:ss'))"
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
