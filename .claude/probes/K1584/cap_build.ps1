# K1584 (27Z8): capture mazes on one build for census.py.
#   pwsh cap_build.ps1 -Ref <commit> -Port 5490 -Tag today -Mazes A_3,A_8,D_1
# Builds <Ref> via scripts/preview.ps1 into $env:TEMP\knotmaze-27Z8-<Tag>,
# proves the listener is that build (command line names the root; the served
# JS carries the short sha), captures each maze once with cap40pin.mjs
# (GF=1,B2=1,SCENE=1,DUMPGW=1, K1578 hash/query table + &bgs=0&fw=0), then
# stops the preview and removes the root. Run under scripts/perf_lock.ps1.
# Outputs (untracked): .claude/probes/K1584/out/27Z8/<Tag>/<Maze>/.
param([Parameter(Mandatory)][string]$Ref, [Parameter(Mandatory)][int]$Port,
      [Parameter(Mandatory)][string]$Tag, [Parameter(Mandatory)][string]$Mazes,
      [switch]$NoGw)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
$sha = (git -C $repo rev-parse $Ref).Trim()
$short = (git -C $repo rev-parse --short $Ref).Trim()
$root = Join-Path $env:TEMP "knotmaze-27Z8-$Tag"
$outBase = Join-Path $here "out/27Z8/$Tag"
$profile = Join-Path $here "profile"
New-Item -ItemType Directory $outBase -Force | Out-Null
New-Item -ItemType Directory $profile -Force | Out-Null
$M = @{
  'A_3' = @('fff8c9e5', '3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1')
  'A_4' = @('17be5630', '4.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_5' = @('c79a38dc', '5.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_6' = @('0effcae3', '6.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_7' = @('b185ec76', '7.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_8' = @('c193f2c9', '8.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_9' = @('056f646d', '9.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_a' = @('11744900', 'a.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_b' = @('98ae3432', 'b.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_c' = @('076a7008', 'c.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_d' = @('190b62ed', 'd.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1')
  'D_1' = @('0f28ceb4', '1&xp=off&am=instant&gfh=1&tlk=border'); 'D_2' = @('820b0b4c', '2&xp=off&am=instant&gfh=1&tlk=border'); 'D_3' = @('f9d72040', '3&xp=off&am=instant&gfh=1&tlk=border'); 'D_4' = @('730413eb', '4&xp=off&am=instant&gfh=1&tlk=border'); 'D_5' = @('4886df51', '5&xp=off&am=instant&gfh=1&tlk=border'); 'D_6' = @('754983e6', '6&xp=off&am=instant&gfh=1&tlk=border'); 'D_7' = @('983ff750', '7&xp=off&am=instant&gfh=1&tlk=border'); 'D_8' = @('f8f3b24c', '8&xp=off&am=instant&gfh=1&tlk=border'); 'D_9' = @('6c9228b5', '9&xp=off&am=instant&gfh=1&tlk=border'); 'D_a' = @('dbd0530d', 'a&xp=off&am=instant&gfh=1&tlk=border')
}
$log = Join-Path $outBase "preview.log"
$args = @("-NoProfile", "-File", (Join-Path $repo "scripts/preview.ps1"), "-Port", "$Port", "-Ref", $sha, "-Root", $root)
$proc = Start-Process pwsh -ArgumentList $args -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
try {
  $deadline = (Get-Date).AddSeconds(900); $ready = $false
  while ((Get-Date) -lt $deadline) {
    if ($proc.HasExited) { throw "preview $sha exited; see $log" }
    try { $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Seconds 5 }
  }
  if (-not $ready) { throw "preview $sha not ready in 900s; see $log" }
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1
  $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)").CommandLine
  "listener pid $($conn.OwningProcess) cmd: $cmd"
  if ($cmd -notlike "*$root*") { throw "listener on $Port is not this run's preview (root $root)" }
  $html = (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 10).Content
  $jsPath = [regex]::Match($html, 'assets/[^"'']+\.js').Value
  $bundleHit = $html.Contains($short)
  if ($jsPath) { $js = (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/$jsPath" -TimeoutSec 30).Content; $bundleHit = $bundleHit -or $js.Contains($short) }
  if (-not $bundleHit) { $bundleHit = (Get-Content $log -Raw).Contains("/$short/") }
  "served page/bundle carries sha $short : $bundleHit (entry $jsPath)"
  if (-not $bundleHit) { throw "served bundle does not carry $short" }
  "preview $Tag $sha on $Port ready $((Get-Date).ToString('HH:mm:ss'))"
  foreach ($maze in ($Mazes -split ',')) {
    $maze = $maze.Trim(); if (-not $maze) { continue }
    if (-not $M.ContainsKey($maze)) { throw "unknown maze $maze" }
    $hash, $q0 = $M[$maze]
    $q = "$q0&bgs=0&fw=0"
    $out = Join-Path $outBase $maze
    New-Item -ItemType Directory $out -Force | Out-Null
    "== $Tag $maze hash $hash $((Get-Date).ToString('HH:mm:ss'))"
    $env:GF = "1"; $env:B2 = "1"; $env:SCENE = "1"; $env:DUMPGW = if ($NoGw) { $null } else { "1" }; $env:HASH = $hash
    & node (Join-Path $repo ".claude/probes/K1482/s40/cap40pin.mjs") "http://localhost:$Port" $out $profile $q 2>&1 | Select-Object -Last 4
    if (-not (Test-Path (Join-Path $out "scene_gf.json"))) { throw "capture $maze wrote no scene_gf.json" }
  }
  "CAPBUILD $Tag DONE $((Get-Date).ToString('HH:mm:ss'))"
} finally {
  if (-not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
  Start-Sleep -Seconds 3
  if (Test-Path $root) { Remove-Item $root -Recurse -Force -ErrorAction SilentlyContinue }
  git -C $repo worktree prune 2>$null | Out-Null
  "preview stopped, root removed: $root"
}
$global:LASTEXITCODE = 0
