# K1584 s8: s7's tabdiff.ts + pxdiff.ts over every maze of a capture (default s7a) for a stage 8 variant built by
# mkv8.ps1 (env GF_SRCP = out/v_s8<Var>): their "s6" column is the variant, "K" is s7 (pxdiff: inkMore = s7 inks more,
# i.e. the variant removes a cut there). Outputs out/r_<Var>/tab|px/<maze>.json (untracked), one line per maze.
#   pwsh v8all.ps1 -Var a [-Cap <dir>] [-Mazes A_6,A_d] [-BoxPad 40]
param([Parameter(Mandatory)][string]$Var, [string]$Cap = (Join-Path $PSScriptRoot '..\s7\out\s7a'), [string]$Mazes = '', [int]$BoxPad = 40)
$P = $PSScriptRoot; $wt = (Resolve-Path "$P\..\..\..\..").Path; $S7 = Join-Path $P '..\s7'
$o = Join-Path $P "out\r_$Var"; New-Item -ItemType Directory "$o\tab", "$o\px" -Force | Out-Null
$env:GF_SRCP = Join-Path $P "out\v_s8$Var"; $env:GF_KRETRY = '1'
if (-not (Test-Path $env:GF_SRCP)) { throw "run mkv8.ps1 -Var $Var first" }
Push-Location $wt
try {
  $ms = Get-ChildItem $Cap -Directory | Where-Object { Test-Path (Join-Path $_.FullName 'gw_gf.json') } | ForEach-Object Name
  if ($Mazes) { $ms = $ms | Where-Object { ($Mazes -split ',') -contains $_ } }
  foreach ($m in $ms) {
    $t = npx tsx "$S7\tabdiff.ts" "$Cap\$m" "$o\tab\$m.json" 2>&1 | Select-Object -Last 1
    $x = npx tsx "$S7\pxdiff.ts" "$Cap\$m" "$o\tab\$m.json" "$o\px\$m.json" $BoxPad 2>&1 | Select-Object -Last 1
    "$m | $t | $x"
  }
} finally { Pop-Location; $env:GF_SRCP = $null }
