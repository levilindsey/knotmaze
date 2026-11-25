# K1588 s3 (copy of s1's capall.ps1 on master, with K1584's cap.ps1 / capmany.ps1 beside it): the 21 test mazes from an already-served build, each view pinned to stage 4's (K1584 s4, out/s4g):
# warm the three Chrome profiles (one WARM=1 load each, in parallel), then K1584's capmany in three streams.
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1588" -What "21-maze capture" -Cmd "& '.claude\probes\K1588\s3\capall.ps1' -Port 5640 -Tag j5"
# The pins are read from .claude/probes/K1588/s3/out/s4pin/<maze>/gf_b2view.txt (copies of stage 4's, untracked).
# Outputs (untracked): .claude/probes/K1588/s3/out/<Tag>/<maze>/, logs out/capmany_<Tag>_<i>.log, out/warm_<Tag>_<i>.log.
param([Parameter(Mandatory)][int]$Port, [Parameter(Mandatory)][string]$Tag, [string]$Streams = "A_3,A_4,A_5,A_6,A_7,A_8,A_9;A_a,A_b,A_c,A_d,D_1,D_2,D_3;D_4,D_5,D_6,D_7,D_8,D_9,D_a", [string]$PinFrom = "s4pin", [switch]$NoWarm)
$here = $PSScriptRoot
$wt = (Resolve-Path (Join-Path $here '..\..\..\..')).Path
$outRoot = Join-Path $here 'out'
New-Item -ItemType Directory $outRoot -Force | Out-Null
$capTool = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1482\s40\cap40pin.mjs"
if (-not $NoWarm) {
  $n = 0
  $ws = foreach ($s in ($Streams -split ';')) {
    $n++
    $first = ($s -split ',')[0]
    $q = if ($first.StartsWith('A_')) { "$($first.Substring(2)).FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&bgs=0&fw=0" } else { "$($first.Substring(2))&xp=off&am=instant&gfh=1&tlk=border&bgs=0&fw=0" }
    $prof = Join-Path $here "profile$n"
    New-Item -ItemType Directory $prof -Force | Out-Null
    $wd = Join-Path $outRoot "warm_${Tag}_$n"
    $cmd = "`$env:WARM='1'; `$env:GF='1'; node '$capTool' 'http://localhost:$Port' '$wd' '$prof' '$q'"
    Start-Process pwsh -ArgumentList @('-NoProfile', '-Command', $cmd) -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $outRoot "warm_${Tag}_$n.log")
  }
  $ws | Wait-Process -Timeout 900
  "WARM $Tag DONE $(Get-Date -Format HH:mm:ss)"
  Get-ChildItem $outRoot -Filter "warm_${Tag}_*.log" | ForEach-Object { Get-Content $_.FullName -Tail 1 }
}
& (Join-Path $here 'capmany.ps1') -Port $Port -Tag $Tag -Streams $Streams -PinFrom $PinFrom -OutRoot $outRoot
exit 0
