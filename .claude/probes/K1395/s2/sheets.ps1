# K1395 s2: the stage's sheets. s1's pinsheet.mjs per (mode, column), PINREST=1 on every load, into out/sh/.
#   & .\sheets.ps1 -Jobs "comet:today:5630","comet:before:5631","comet:now:5630",...
# Call it inside scripts/perf_lock.ps1. Outputs out/sh/<mode>_<col>_f<i>.png, _rest.png, _restpin.png, .json, .log
param([string[]]$Jobs)
$here = $PSScriptRoot
$pin = Join-Path $here '..\s1\pinsheet.mjs'
$link = '3.FGH1HtvQeDjm6e4BII&gfh=1'
$am = @{ levi = ''; burn = '&am=trace-burn'; rainbow = '&am=trace-rainbow'; dust = '&am=ink-dust'; roots = '&am=trace-roots'; comet = '&am=bloom-comet'; instant = '&am=instant' }
$env:PROFILE = Join-Path $here 'prof'
$env:PINREST = '1'
$od = Join-Path $here 'out\sh'
New-Item -ItemType Directory $od -Force | Out-Null
foreach ($j in $Jobs) {
  $m, $col, $port = $j.Split(':')
  $env:INSTANT = if ($m -eq 'instant') { '1' } else { '0' }
  $r = if ($col -eq 'today') { 'today' } else { 'gf' }
  $o = Join-Path $od "${m}_$col"
  "$(Get-Date -Format HH:mm:ss) $m $col $port"
  node $pin "http://127.0.0.1:$port" "$link$($am[$m])" $r $o *> "$o.log"
  "$(Get-Date -Format HH:mm:ss) done $m $col exit $LASTEXITCODE"
}
exit 0
