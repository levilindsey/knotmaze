# K1436 s2: THE BAR. One command that says whether a commit made rp=gf look worse than its base.
#
# HOW TO RUN (from any checkout of knotmaze, pwsh 7):
#   pwsh -NoProfile -File .claude/probes/K1436/k1436_bar.ps1 -Ref <commit> [-Base <commit>=master] [-HomeFlag 1|0]
#        [-Scenes def,ring,...] [-Port 5601] [-Keep]
#   It prints PASS or FAIL and exits 0 / 1. Output: .claude/probes/K1436/out/bar/<ref>/ (bar.txt: the verdict and, per
#   scan and kind:class, the NEW finds, the finds that GREW by more than 10% (and 3 px), the finds that went away;
#   sheet.png + sheet.txt: 4x crops of every new and grown find, base | ref, fill then border capture).
#   Time: about 2 min of shader compile per new build, then ~1 min per scene batch of 3; 12 scenes, 2 commits: ~20 min.
#
# WHAT IT DOES, per commit (base, then ref):
#   1. a detached git worktree at $env:TEMP\k1436s2-src-<sha> (node_modules junctioned to the main checkout's), this
#      folder's probe libraries (K1314, K1362, K1433, K1436) copied in, so both scans run THAT commit's src/;
#   2. a production build at $env:TEMP\k1436s2-prev\<sha> (reused when present), served by vite preview on -Port;
#   3. the MIRROR scan (k1436_scan.ts: scan v2 on GfEval at 100 px/unit, GF_HOME = -HomeFlag) of each census scene;
#   4. the SCREEN scan: k1436_screen.mjs captures each scene's frozen K868 state (rp=gf, cs=mono, bg=none, DSF 3:
#      ~100 device px per world unit, so a 1 css px fault is 3 px) in fill and border looks, and k1436_screen_scan.ts runs
#      v2's band profile and strays on the screen's ink plus the cut / speck / spill look checks (labels from the mirror
#      at the same pixel: a capture has none).
#   Then k1436_bar_cmp.mjs matches finds by scene, scan, kind:class and site (0.3 world units). Any new or grown find is
#   a FAIL. It waits (never takes) $env:TEMP\claude-perf.lock while another owner holds it, and deletes its worktrees,
#   builds and Chrome profile when it ends unless -Keep.
#
# WHAT IT CANNOT SEE: anything outside the 12 K868 census scenes and their frozen states (motion, intros, the reveal,
#   fog, markers, junction webs under other looks); colour (cs=mono: seams between section colours are the mirror
#   scan's SEAM test only); faults under 1 device px (a third of a css px); a fault inside a legit crossing gap zone that
#   keeps the coverage's local median (a smooth wrong fade); finds whose site moved more than 0.3 world units (they read
#   as one gone plus one new). A ref whose physics hash differs from the base's compares two states: bar.txt says so.
param(
  [Parameter(Mandatory = $true)][string]$Ref,
  [string]$Base = "master",
  [string]$HomeFlag = "1",
  [string[]]$Scenes = @("muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"),
  [int]$Port = 5601,
  [int]$Par = 3,
  [switch]$Keep
)
$ErrorActionPreference = "Stop"
$probeDir = $PSScriptRoot
$repoTop = (git -C $probeDir rev-parse --show-toplevel).Trim()
$mainNm = "C:\Users\lsl\Repositories\knotmaze\node_modules"
$sceneDir = "C:/Users/lsl/Repositories/knotmaze/.claude/probes/K868/scenes"
$refSha = (git -C $repoTop rev-parse --short=8 $Ref).Trim(); $baseSha = (git -C $repoTop rev-parse --short=8 $Base).Trim()
$outRoot = Join-Path $probeDir "out\bar\$refSha"; New-Item -ItemType Directory $outRoot -Force | Out-Null
$profile1 = Join-Path $env:TEMP "k1436s2-profile"
$made = @()
function Wait-Lock {
  $l = Join-Path $env:TEMP "claude-perf.lock"; $t0 = Get-Date
  while (Test-Path $l) {
    if (((Get-Date) - (Get-Item $l).LastWriteTime).TotalMinutes -gt 30) { Write-Host "perf lock stale, going on"; break }
    if (((Get-Date) - $t0).TotalMinutes -gt 60) { throw "perf lock held over 60 min: $(Get-Content $l)" }
    Start-Sleep 15
  }
}
function Get-Jobs([string]$suffix) {
  $jobs = @()
  foreach ($s in $Scenes) {
    $d = Get-Content "$sceneDir/$s.diag.json" -Raw | ConvertFrom-Json; $u = [string]$d.job.url; $q = $u.Substring($u.IndexOf('?') + 1)
    $q = ($q -split '&' | Where-Object { $_ -notmatch '^(bg|bgcm|bgc0|cs|rp|gfh|tlk)=' }) -join '&'
    $q += "&tlk=fill&cs=mono&bg=none&rp=gf" + $(if ($HomeFlag -eq "1") { "&gfh=1" } else { "" })
    $jobs += [ordered]@{ name = $s; query = $q; hash = [string]$d.step.frozenHash; t = [double]$d.step.frozenSim; w = 1240; h = 900 }
  }
  return $jobs
}
function Invoke-Commit([string]$sha, [string]$dst) {
  $src = Join-Path $env:TEMP "k1436s2-src-$sha"; $dist = Join-Path $env:TEMP "k1436s2-prev\$sha"
  if (-not (Test-Path $src)) {
    git -C $repoTop worktree add --detach $src $sha | Out-Null
    $script:made += $src
    New-Item -ItemType Junction -Path (Join-Path $src "node_modules") -Target $mainNm | Out-Null
  }
  foreach ($k in "K1314", "K1362", "K1433", "K1436") {
    $to = Join-Path $src ".claude\probes\$k"; New-Item -ItemType Directory $to -Force | Out-Null
    Get-ChildItem (Join-Path $probeDir "..\$k") -File | Where-Object { $_.Extension -in ".ts", ".mjs" } | Copy-Item -Destination $to -Force
  }
  if (-not (Test-Path (Join-Path $dist "index.html"))) {
    Push-Location $src; try { npx.cmd vite build --outDir $dist --emptyOutDir | Out-Null; if ($LASTEXITCODE -ne 0) { throw "build $sha failed" } } finally { Pop-Location }
    $script:made += $dist
  }
  New-Item -ItemType Directory $dst -Force | Out-Null
  $env:GF_HOME = $(if ($HomeFlag -eq "1") { "1" } else { "" })
  # the mirror scans (CPU; $Par at a time)
  $t0 = Get-Date
  $q = [System.Collections.Queue]::new($Scenes); $run = @()
  while ($q.Count -or $run.Count) {
    while ($q.Count -and $run.Count -lt $Par) { $s = $q.Dequeue(); $run += Start-Process node -ArgumentList "scripts/run_node.mjs", ".claude/probes/K1436/k1436_scan.ts", "bar", $s, "100", (Join-Path $dst "$s.mirror.json") -WorkingDirectory $src -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $dst "$s.mirror.log") }
    Start-Sleep 2; $run = @($run | Where-Object { -not $_.HasExited })
  }
  Write-Host "[$sha] mirror scans $([int]((Get-Date) - $t0).TotalSeconds) s"
  # the screen: serve, capture, scan
  $jobsPath = Join-Path $dst "jobs.json"; Get-Jobs | ConvertTo-Json -Depth 3 -AsArray | Out-File $jobsPath -Encoding utf8
  $srv = Start-Process npx.cmd -ArgumentList "vite", "preview", "--outDir", $dist, "--port", "$Port", "--strictPort" -WorkingDirectory $src -WindowStyle Hidden -PassThru
  try {
    $ok = $false; for ($k = 0; $k -lt 60 -and -not $ok; $k++) { try { $ok = (Invoke-WebRequest "http://localhost:$Port/" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 } catch { Start-Sleep 1 } }
    if (-not $ok) { throw "preview on $Port did not start" }
    Wait-Lock
    $t1 = Get-Date
    node (Join-Path $probeDir "k1436_screen.mjs") "http://localhost:$Port" (Join-Path $dst "cap") $profile1 $jobsPath $Par
    if ($LASTEXITCODE -ne 0) { throw "capture failed ($sha)" }
    Write-Host "[$sha] captures $([int]((Get-Date) - $t1).TotalSeconds) s"
  } finally { Get-CimInstance Win32_Process -Filter "ParentProcessId=$($srv.Id)" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Stop-Process -Id $srv.Id -Force -ErrorAction SilentlyContinue }
  $t2 = Get-Date
  $q = [System.Collections.Queue]::new($Scenes); $run = @()
  while ($q.Count -or $run.Count) {
    while ($q.Count -and $run.Count -lt $Par) { $s = $q.Dequeue(); $run += Start-Process node -ArgumentList "scripts/run_node.mjs", ".claude/probes/K1436/k1436_screen_scan.ts", (Join-Path $dst "cap\$s"), (Join-Path $dst "$s.screen.json"), "$sceneDir/$s.json" -WorkingDirectory $src -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $dst "$s.screen.log") }
    Start-Sleep 2; $run = @($run | Where-Object { -not $_.HasExited })
  }
  Write-Host "[$sha] screen scans $([int]((Get-Date) - $t2).TotalSeconds) s"
}
$code = 1
try {
  Invoke-Commit $baseSha (Join-Path $outRoot "base-$baseSha")
  Invoke-Commit $refSha (Join-Path $outRoot "ref-$refSha")
  node (Join-Path $probeDir "k1436_bar_cmp.mjs") (Join-Path $outRoot "base-$baseSha") (Join-Path $outRoot "ref-$refSha") $outRoot
  $code = $LASTEXITCODE
} finally {
  if (-not $Keep) {
    foreach ($p in $made) {
      if (-not (Test-Path $p)) { continue }
      Get-ChildItem $p -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue | ForEach-Object { $_.Delete() }
      $nm = Join-Path $p "node_modules"; if (Test-Path $nm) { (Get-Item $nm).Delete() }
      if (Test-Path (Join-Path $p ".git")) { git -C $repoTop worktree remove --force $p } else { [System.IO.Directory]::Delete($p, $true) }
    }
    git -C $repoTop worktree prune
    if (Test-Path $profile1) { [System.IO.Directory]::Delete($profile1, $true) }
  }
}
exit $code
