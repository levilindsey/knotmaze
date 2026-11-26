# K1584 s1: several cap.ps1 streams at once inside one perf-lock hold (a capture is ~2.4 min, mostly the settle).
#   pwsh capmany.ps1 -Port 5585 -Tag before -Streams "D_1,D_2;D_3,D_4" [-PinFrom <tag>]
param([int]$Port, [string]$Tag, [string]$Streams, [string]$PinFrom = "")
$i = 0
$jobs = foreach ($s in ($Streams -split ';')) {
  $i++
  $a = @('-NoProfile', '-File', (Join-Path $PSScriptRoot 'cap.ps1'), '-Port', $Port, '-Tag', $Tag, '-Mazes', $s, '-Prof', "profile$i")
  if ($PinFrom) { $a += @('-PinFrom', $PinFrom) }
  Start-Process pwsh -ArgumentList $a -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $PSScriptRoot "out\capmany_${Tag}_$i.log")
}
$jobs | Wait-Process
"CAPMANY $Tag DONE $(Get-Date -Format HH:mm:ss)"
exit 0
