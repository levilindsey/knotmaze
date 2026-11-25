# K1588 s3 (copy of s1's; -BeforeRoot is mandatory here): fdiff.py (framediff with a colour test) of every maze, stage 4's capture (K1584 s4, out/s4g, or -BeforeRoot) against a tag captured
# here (out/<Tag>), then sheets of every changed place (sheets.py).
#   pwsh .claude/probes/K1588/s3/diffall.ps1 -Tag j2 [-Mazes A_3,A_4] [-BeforeRoot <dir>] [-Name j2]
# Outputs (untracked): diff/<Name>_<maze>.json, fd_<Name>.txt, sheets/<Name>_<maze>_<n>.png (12 tiles each, largest first).
param([Parameter(Mandatory)][string]$Tag, [string[]]$Mazes, [string]$Name,
  [Parameter(Mandatory)][string]$BeforeRoot)
$here = $PSScriptRoot
if (-not $Name) { $Name = $Tag }
$fd = Join-Path $here 'fdiff.py'
$diffDir = Join-Path $here 'diff'; $shDir = Join-Path $here 'sheets'
New-Item -ItemType Directory $diffDir, $shDir -Force | Out-Null
$all = if ($Mazes) { $Mazes -split ',' } else { (Get-ChildItem (Join-Path $here "out\$Tag") -Directory | Where-Object { $_.Name -match '^[AD]_' }).Name }
$log = Join-Path $here "fd_$Name.txt"
$res = $all | ForEach-Object -ThrottleLimit 7 -Parallel {
  $m = $_; $b = Join-Path $using:BeforeRoot $m; $a = Join-Path $using:here "out\$($using:Tag)\$m"
  if (-not (Test-Path (Join-Path $a 'gf_b2.png'))) { "${m}: no capture"; return }
  $j = Join-Path $using:diffDir "$($using:Name)_$m.json"
  $o = python $using:fd $b $a $j 2>&1 | Out-String
  $s = python (Join-Path $using:here 'sheets.py') $m $b $a $j (Join-Path $using:shDir "$($using:Name)_$m") 2>&1 | Out-String
  "$m`n$o$s"
}
$res | Sort-Object | Set-Content $log -Encoding utf8
Get-Content $log | Select-String 'view same|no capture|no places'
exit 0
