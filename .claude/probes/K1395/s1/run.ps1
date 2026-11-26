# K1395 s1: shoot Levi's link per appearance mode with pinsheet.mjs (today, master gf or my gf), one load each.
#   pwsh -NoProfile -File run.ps1 -Port 5630 -Col today|master|mine -Modes levi,rainbow,...
# Call it inside scripts/perf_lock.ps1. Outputs: out/<mode>_<col>_f<i>.png, _rest.png, .json, .log
param([int]$Port, [string]$Col, [string[]]$Modes)
$here = $PSScriptRoot
$link = '3.FGH1HtvQeDjm6e4BII&gfh=1'
$am = @{ levi = ''; burn = '&am=trace-burn'; rainbow = '&am=trace-rainbow'; dust = '&am=ink-dust'; roots = '&am=trace-roots'; comet = '&am=bloom-comet'; instant = '&am=instant' }
$env:PROFILE = Join-Path $env:TEMP 'k1395s1prof'
foreach ($m in $Modes) {
  $env:INSTANT = if ($m -eq 'instant') { '1' } else { '0' }
  $r = if ($Col -eq 'today') { 'today' } else { 'gf' }
  $o = Join-Path $here "out\${m}_$Col"
  "$(Get-Date -Format HH:mm:ss) $m $Col"
  node (Join-Path $here 'pinsheet.mjs') "http://localhost:$Port" "$link$($am[$m])" $r $o *> "$o.log"
  "$(Get-Date -Format HH:mm:ss) done $m $Col exit $LASTEXITCODE"
}
exit 0
