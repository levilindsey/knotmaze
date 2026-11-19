# K1482 s14: judge a candidate frame against master's (same physics hash): count13.py's limits, its --specks against
# master, the movers (sites whose 48x48 box gains + loses >= 10 ink px, s11 boxdiff.py) and 4x tile sheets of every
# mover (master | candidate, 8 rows a sheet) for the eye.
#   pwsh judge14.ps1 <master dir> <cand dir> <sheet prefix>
param([string]$M, [string]$C, [string]$Sheet)
$p = $PSScriptRoot
$sj = Join-Path $M "sites_gf.json"
"== count13 limits"; python (Join-Path $p ..\s13\count13.py) "$C/gf.png" $sj
"== count13 --specks vs master"; python (Join-Path $p ..\s13\count13.py) "$C/gf.png" $sj --specks "$M/gf.png"
"== movers (>= 10 px)"
$env:MIN = "9"; $mv = python (Join-Path $p ..\s11\boxdiff.py) "$M/gf.png" "$C/gf.png" $sj "$C/movers.json"; $env:MIN = $null
$mv
$names = @($mv | Select-Object -Skip 1 | ForEach-Object { ($_ -split '\s+')[0] } | Where-Object { $_ })
for ($i = 0; $i -lt $names.Count; $i += 8) {
  $chunk = ($names[$i..([Math]::Min($i + 7, $names.Count - 1))]) -join ","
  python (Join-Path $p ..\s13\tiles13.py) "$Sheet`_$([int]($i / 8) + 1).png" $sj 24 4 $chunk "master=$M/gf.png" "cand=$C/gf.png" | Out-Null
}
"sheets: $([Math]::Ceiling($names.Count / 8)) at $Sheet`_N.png"
