# K1584 s3: s1's capmany with an output root: several cap.ps1 streams at once inside one perf-lock hold.
#   pwsh capmany.ps1 -Port 5587 -Tag s3 -Streams "A_4,A_5;D_1,D_2" -PinFrom before -OutRoot <abs dir>
param([int]$Port, [string]$Tag, [string]$Streams, [string]$PinFrom = "", [string]$OutRoot)
$i = 0
$cap = Join-Path $PSScriptRoot '..\s1\cap.ps1'
$jobs = foreach ($s in ($Streams -split ';')) {
  $i++
  $a = @('-NoProfile', '-File', $cap, '-Port', $Port, '-Tag', $Tag, '-Mazes', $s, '-Prof', "profile$i", '-OutRoot', $OutRoot)
  if ($PinFrom) { $a += @('-PinFrom', $PinFrom) }
  Start-Process pwsh -ArgumentList $a -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $OutRoot "capmany_${Tag}_$i.log")
}
$jobs | Wait-Process
"CAPMANY $Tag DONE $(Get-Date -Format HH:mm:ss)"
