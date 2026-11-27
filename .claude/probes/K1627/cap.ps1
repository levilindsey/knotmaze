# K1627 s1 (from K1604 s3's cap.ps1): + maze L (Levi's link ?3.FCBQ1H6L4-6NPbeg8HHN09w, hash from env LHASH), -Patch <json> (cap40pin PATCH),
# -PatchF <json> (PATCHF).
# K1584 s1: capture mazes of the K1578 table from an already-served build (cap40pin.mjs: GF=1,B2=1,SCENE=1,DUMPGW=1).
#   pwsh cap.ps1 -Port 5584 -Tag after -Mazes A_3,A_8,D_1 [-PinFrom <tag>]
# -PinFrom pins each maze's view to <tag>'s gf_b2view.txt (the K1581 PINVIEW), so two builds compare pixel for pixel.
# Run under scripts/perf_lock.ps1. Outputs (untracked): .claude/probes/K1584/s1/out/<Tag>/<Maze>/.
param([Parameter(Mandatory)][int]$Port, [Parameter(Mandatory)][string]$Tag, [Parameter(Mandatory)][string]$Mazes, [string]$PinFrom = "", [switch]$NoGw, [string]$Prof = "profile", [string]$Extra = "", [string]$OutRoot = "", [string]$Patch = "", [string]$PatchF = "", [string]$HashFrom = "")
# K1627 s3: -HashFrom none = each maze's first gf hash is its target (re-freeze after a physics change);
#   -HashFrom <tag> = the hash that tag's capture landed on (out/<tag>/<maze>/cap.log 'done <hash>').
$here = $PSScriptRoot
$main = "C:\Users\lsl\Repositories\knotmaze"
$capTool = Join-Path $main ".claude\probes\K1482\s40\cap40pin.mjs"
$prof = Join-Path $here $Prof
New-Item -ItemType Directory $prof -Force | Out-Null
$M = @{}
foreach ($p in @(@('3', 'fff8c9e5'), @('4', '17be5630'), @('5', 'c79a38dc'), @('6', '0effcae3'), @('7', 'b185ec76'), @('8', 'c193f2c9'), @('9', '056f646d'), @('a', '11744900'), @('b', '98ae3432'), @('c', '076a7008'), @('d', '190b62ed'))) { $M["A_$($p[0])"] = @($p[1], "$($p[0]).FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1") }
foreach ($p in @(@('1', '0f28ceb4'), @('2', '820b0b4c'), @('3', 'f9d72040'), @('4', '730413eb'), @('5', '4886df51'), @('6', '754983e6'), @('7', '983ff750'), @('8', 'f8f3b24c'), @('9', '6c9228b5'), @('a', 'dbd0530d'))) { $M["D_$($p[0])"] = @($p[1], "$($p[0])&xp=off&am=instant&gfh=1&tlk=border") }
$M['L'] = @($env:LHASH, '3.FCBQ1H6L4-6NPbeg8HHN09w&xp=off&am=instant&gfh=1')
$env:PATCH = if ($Patch) { (Resolve-Path (Join-Path $here $Patch)).Path } else { $null }
$env:PATCHF = if ($PatchF) { (Resolve-Path (Join-Path $here $PatchF)).Path } else { $null }
foreach ($maze in ($Mazes -split ',')) {
  $maze = $maze.Trim(); if (-not $maze) { continue }
  $hashV, $q0 = $M[$maze]
  if ($HashFrom -eq 'none') { $hashV = '' }
  elseif ($HashFrom) {
    $hl = Join-Path $(if ($OutRoot) { $OutRoot } else { Join-Path $here 'out' }) "$HashFrom\$maze\cap.log"
    $hm = if (Test-Path $hl) { Select-String -Path $hl -Pattern 'done ([0-9a-f]{8})' | Select-Object -Last 1 } else { $null }
    if (-not $hm) { "== $Tag ${maze}: no hash in $hl, skipped"; continue }
    $hashV = $hm.Matches[0].Groups[1].Value
  }
  $outD = if ($OutRoot) { Join-Path $OutRoot "$Tag\$maze" } else { Join-Path $here "out\$Tag\$maze" }
  New-Item -ItemType Directory $outD -Force | Out-Null
  $env:GF = "1"; $env:B2 = "1"; $env:SCENE = "1"; $env:DUMPGW = if ($NoGw) { $null } else { "1" }; $env:HASH = $hashV
  $env:PINVIEW = $null
  if ($PinFrom) { $pv = Join-Path $here "out\$PinFrom\$maze\gf_b2view.txt"; if (Test-Path $pv) { $env:PINVIEW = (Get-Content $pv -TotalCount 1).Replace(',', ';') } }
  "== $Tag $maze $(Get-Date -Format HH:mm:ss) pin '$($env:PINVIEW)'"
  & node $capTool "http://localhost:$Port" $outD $prof "$q0&bgs=0&fw=0$Extra" 2>&1 | Tee-Object -FilePath (Join-Path $outD "cap.log") | Select-Object -Last 3
}
"CAP $Tag DONE $(Get-Date -Format HH:mm:ss)"
exit 0
