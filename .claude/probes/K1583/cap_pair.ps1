# K1583 (Muse batch 27 Run Z7): ONE capture session of one maze for the review tiles -
# two loads on one pinned view (rp=gf gfh=1, then today's renderer with no rp flag) through
# cap27z7.mjs, written under <RunOut>/<Maze>/ (gf_b2.png, today_b2.png, cap_meta.json).
# Run it through scripts/perf_lock.ps1 (run_captures.ps1 does, one maze per hold).
#   pwsh cap_pair.ps1 -Maze A_3 -Port 5495 -RunOut <abs raw dir> -Profile <abs profile dir>
# Hashes and queries are .claude/probes/K1578/cap_maze.ps1's 21-maze table, verbatim;
# &bgs=0 (a still background) and &fw=0 (K1544: a bare-seed link's load-dependent flow
# phase) are added to every query, cap27z7.mjs adds &phw=0&snd=none&prp=off itself.
# The first load on a profile does cap27z7.mjs's warm run; later loads pass the
# .warm<port> marker in the profile dir (cap_maze.ps1's scheme, own profile here:
# the K1482 kept profile is never read or touched in this run).
param([Parameter(Mandatory)][string]$Maze, [Parameter(Mandatory)][int]$Port,
      [Parameter(Mandatory)][string]$RunOut, [Parameter(Mandatory)][string]$Profile)
$ErrorActionPreference = "Stop"
$M = @{
  'A_3' = @('fff8c9e5', '3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1')
  'A_4' = @('17be5630', '4.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_5' = @('c79a38dc', '5.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_6' = @('0effcae3', '6.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_7' = @('b185ec76', '7.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_8' = @('c193f2c9', '8.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_9' = @('056f646d', '9.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_a' = @('11744900', 'a.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_b' = @('98ae3432', 'b.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_c' = @('076a7008', 'c.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_d' = @('190b62ed', 'd.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1')
  'D_1' = @('0f28ceb4', '1&xp=off&am=instant&gfh=1&tlk=border'); 'D_2' = @('820b0b4c', '2&xp=off&am=instant&gfh=1&tlk=border'); 'D_3' = @('f9d72040', '3&xp=off&am=instant&gfh=1&tlk=border'); 'D_4' = @('730413eb', '4&xp=off&am=instant&gfh=1&tlk=border'); 'D_5' = @('4886df51', '5&xp=off&am=instant&gfh=1&tlk=border'); 'D_6' = @('754983e6', '6&xp=off&am=instant&gfh=1&tlk=border'); 'D_7' = @('983ff750', '7&xp=off&am=instant&gfh=1&tlk=border'); 'D_8' = @('f8f3b24c', '8&xp=off&am=instant&gfh=1&tlk=border'); 'D_9' = @('6c9228b5', '9&xp=off&am=instant&gfh=1&tlk=border'); 'D_a' = @('dbd0530d', 'a&xp=off&am=instant&gfh=1&tlk=border')
}
if (-not $M.ContainsKey($Maze)) { throw "cap_pair: unknown maze $Maze" }
$hash, $q0 = $M[$Maze]
$q = "$q0&bgs=0&fw=0"
$cap = Join-Path $PSScriptRoot "cap27z7.mjs"
$out = Join-Path $RunOut $Maze
New-Item -ItemType Directory $out -Force | Out-Null
New-Item -ItemType Directory $Profile -Force | Out-Null

function Run-Cap([string]$label, [hashtable]$envs, [int]$limSec) {
  foreach ($k in $envs.Keys) { Set-Item "Env:$k" $envs[$k] }
  $log = Join-Path $out "cap_$label.log"
  try {
    $p = Start-Process node -ArgumentList @($cap, "http://localhost:$Port", $out, $Profile, "`"$q`"") -NoNewWindow -PassThru -RedirectStandardOutput $log -RedirectStandardError "$log.err"
    if (-not $p.WaitForExit($limSec * 1000)) {
      "TIMEOUT after $limSec s ($label): killing" | Out-File -Append -Encoding ASCII $log
      taskkill /T /F /PID $p.Id 2>$null | Out-Null
      Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($Profile) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      throw "cap_pair: $label timed out after $limSec s"
    }
    Get-Content $log | Select-Object -Last 3
    if ($p.ExitCode -ne 0) { throw "cap_pair: $label exited $($p.ExitCode); see $log" }
  } finally {
    foreach ($k in $envs.Keys) { Remove-Item "Env:$k" -ErrorAction SilentlyContinue }
  }
}

$warmMark = Join-Path $Profile ".warm$Port"
if (-not (Test-Path $warmMark)) {
  "== warm $Maze $((Get-Date).ToString('HH:mm:ss'))"
  Run-Cap "warm" @{ HASH = $hash; WARM = "1" } 600
  New-Item -ItemType File -Force $warmMark | Out-Null
}
"== pair $Maze $((Get-Date).ToString('HH:mm:ss'))"
Run-Cap "pair" @{ HASH = $hash; GF = "1"; TODAY = "1"; B2 = "1" } 900
"CAPPAIR $Maze DONE $((Get-Date).ToString('HH:mm:ss'))"
# perf_lock.ps1 propagates $LASTEXITCODE; a completed session resets it here (cap_maze.ps1).
$global:LASTEXITCODE = 0
