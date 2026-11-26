# K1584 s6: the fade sheet's captures: s1's cap.ps1 at fade lengths 0, 0.5 and 1.2 (link key fl), one stream each,
# in parallel, pinned to the same states as before (today's captures). Run under scripts/perf_lock.ps1.
#   pwsh fcap.ps1 -Port 5630 -Mazes "A_7,A_9"
param([int]$Port, [string]$Mazes)
$cap = Join-Path $PSScriptRoot '..\s1\cap.ps1'; $out = Join-Path $PSScriptRoot 'out'
$runs = @(@('s6f0', '&fl=0'), @('s6f05', '&fl=0.5'), @('s6f12', '&fl=1.2'))
$i = 0
$jobs = foreach ($r in $runs) {
  $i++
  $a = @('-NoProfile', '-File', $cap, '-Port', $Port, '-Tag', $r[0], '-Mazes', $Mazes, '-Prof', "profile$i", '-OutRoot', $out, '-PinFrom', 'before', '-Extra', $r[1])
  Start-Process pwsh -ArgumentList $a -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $out "fcap_$($r[0]).log")
}
$jobs | Wait-Process
"FCAP DONE $(Get-Date -Format HH:mm:ss)"
