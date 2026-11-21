# K1578 (Muse batch 27 Run V): ONE capture session of one maze for allmaze.ps1 - the four loads
# base, candidate, base, candidate (tags m, c, m2, c2, as in .claude/probes/K1482/s40/capseq40.ps1)
# on the two preview ports allmaze started, written under <RunOut>/raw/<tag>/<maze>[ _off].
# Run it through scripts/perf_lock.ps1 (allmaze does, one maze per hold, owner muse-27V).
#   pwsh cap_maze.ps1 -Maze A_3 -BasePort 5500 -CandPort 5501 -RunOut <abs out dir> [-Fill] [-Off]
# Hashes and queries are capseq40.ps1's 21-maze table, verbatim; &bgs=0 added (a still background).
# &fw=0 added to every query (K1544: a bare-seed link's flow clock - flowStrength defaults to 0.3 -
# sits at a load-dependent phase, so two loads of one build on one hash and one view differ by
# ~100k px; cap34's freeze pins paintClock but not flowTime. Token links already carry flow 0, so
# it changes nothing there; flow is render-only, so the table hash is unchanged. Measured on
# ball40 D_1 before the mend: floors 105,148 / 46,844 px, bit-identical views.)
# cap40.ps1 appends &snd=none, &phw=0 and &rp=gf to every link and shoots only after gf's first
# composite. The first load on a tag does cap40's warm run; later loads on that tag pass -NoWarm
# (the .warm<port> marker in the tag's profile dir, capseq40's scheme).
param([Parameter(Mandatory)][string]$Maze, [Parameter(Mandatory)][int]$BasePort,
      [Parameter(Mandatory)][int]$CandPort, [Parameter(Mandatory)][string]$RunOut,
      [switch]$Fill, [switch]$Off)
$ErrorActionPreference = "Stop"
$M = @{
  'A_3' = @('fff8c9e5', '3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1')
  'A_4' = @('17be5630', '4.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_5' = @('c79a38dc', '5.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_6' = @('0effcae3', '6.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_7' = @('b185ec76', '7.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_8' = @('c193f2c9', '8.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_9' = @('056f646d', '9.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_a' = @('11744900', 'a.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_b' = @('98ae3432', 'b.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_c' = @('076a7008', 'c.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1'); 'A_d' = @('190b62ed', 'd.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1')
  'D_1' = @('0f28ceb4', '1&xp=off&am=instant&gfh=1&tlk=border'); 'D_2' = @('820b0b4c', '2&xp=off&am=instant&gfh=1&tlk=border'); 'D_3' = @('f9d72040', '3&xp=off&am=instant&gfh=1&tlk=border'); 'D_4' = @('730413eb', '4&xp=off&am=instant&gfh=1&tlk=border'); 'D_5' = @('4886df51', '5&xp=off&am=instant&gfh=1&tlk=border'); 'D_6' = @('754983e6', '6&xp=off&am=instant&gfh=1&tlk=border'); 'D_7' = @('983ff750', '7&xp=off&am=instant&gfh=1&tlk=border'); 'D_8' = @('f8f3b24c', '8&xp=off&am=instant&gfh=1&tlk=border'); 'D_9' = @('6c9228b5', '9&xp=off&am=instant&gfh=1&tlk=border'); 'D_a' = @('dbd0530d', 'a&xp=off&am=instant&gfh=1&tlk=border')
}
if (-not $M.ContainsKey($Maze)) { throw "cap_maze: unknown maze $Maze" }
$hash, $q0 = $M[$Maze]
$cap40 = Join-Path $PSScriptRoot "..\K1482\s40\cap40.ps1"
$variants = @("")
if ($Off) { $variants += "_off" }
foreach ($v in $variants) {
  $q = "$q0&bgs=0&fw=0" + $(if ($v) { "&gfk=0" } else { "" })
  $envs = "GF=1,B2=1,HASH=$hash" + $(if ($Fill) { ",FILL=1" } else { "" })
  foreach ($lp in @(@("m", $BasePort), @("c", $CandPort), @("m2", $BasePort), @("c2", $CandPort))) {
    $tag, $port = $lp[0], [int]$lp[1]
    $out = Join-Path $RunOut "raw/$tag/$Maze$v"
    $prof = Join-Path $env:TEMP "k1482s40-$tag"
    $warmMark = Join-Path $prof ".warm$port"
    "== $tag $Maze$v $((Get-Date).ToString('HH:mm:ss'))"
    if (Test-Path $warmMark) {
      & $cap40 -Port $port -Out $out -Tag $tag -Query $q -Env $envs -NoWarm -Limit 300 -ShotLimit 300 | Select-Object -Last 2
    } else {
      & $cap40 -Port $port -Out $out -Tag $tag -Query $q -Env $envs -Limit 300 -ShotLimit 300 | Select-Object -Last 3
      New-Item -ItemType Directory $prof -Force | Out-Null
      New-Item -ItemType File -Force $warmMark | Out-Null
    }
  }
}
"CAPMAZE $Maze DONE $((Get-Date).ToString('HH:mm:ss'))"
# perf_lock.ps1 propagates $LASTEXITCODE; cap40.ps1's robocopy profile copy leaves it at 1
# (robocopy: files copied) after a good capture. A failed capture throws above, or leaves a
# missing shot that analyze_maze.py refuses (exit 3), so a completed session resets it here.
$global:LASTEXITCODE = 0
