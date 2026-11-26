# K1584 s7b: s7's tabdiff.ts + pxdiff.ts in pad mode (env GF_SRCP = out/v_pad<P>, mkpad.ps1) over every maze of a
# capture (default s7a): rule "K" places = the padded build against s7 (pxdiff: inkMore = s7 inks more, i.e. the pad
# removes a cut there). Outputs out/pad<P>/tab|px/<maze>.json (untracked) and one summary line per maze.
#   pwsh padall.ps1 -Pad 0.5 [-Cap <dir>] [-Mazes A_6,A_d] [-BoxPad 40] [-Var g]   (pxdiff's box pad: its default 14 px is under a
#   thread's half width at DSF 3, so outline pixels on a run's far side fall outside the box)
param([Parameter(Mandatory)][double]$Pad, [string]$Cap = (Join-Path $PSScriptRoot '..\s7\out\s7a'), [string]$Mazes = '', [int]$BoxPad = 40, [string]$Var = '')
$P = $PSScriptRoot; $wt = (Resolve-Path "$P\..\..\..\..").Path; $S7 = Join-Path $P '..\s7'
$o = Join-Path $P "out\pad$Pad$Var"; New-Item -ItemType Directory "$o\tab", "$o\px" -Force | Out-Null
$env:GF_SRCP = Join-Path $P "out\v_pad$Pad$Var"; $env:GF_KRETRY = '1'
if (-not (Test-Path $env:GF_SRCP)) { throw "run mkpad.ps1 -Pad $Pad first" }
Push-Location $wt
try {
  $ms = Get-ChildItem $Cap -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'gw_gf.json') } | ForEach-Object Name
  if ($Mazes) { $ms = $ms | Where-Object { ($Mazes -split ',') -contains $_ } }
  foreach ($m in $ms) {
    npx tsx "$S7\tabdiff.ts" "$Cap\$m" "$o\tab\$m.json" 2>&1 | Select-Object -Last 1
    npx tsx "$S7\pxdiff.ts" "$Cap\$m" "$o\tab\$m.json" "$o\px\$m.json" $BoxPad 2>&1 | Select-Object -Last 1
  }
} finally { Pop-Location; $env:GF_SRCP = $null }


