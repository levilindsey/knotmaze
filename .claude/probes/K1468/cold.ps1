# K1468: one cold load (a fresh profile under $env:TEMP\k1468-<Tag>), cold.mjs beside gputhreads.ps1, then the
# Crashpad reports the load left and the GPU main thread's worst 10 s. One line "RESULT ..." at the end.
#   powershell -File .claude/probes/K1468/cold.ps1 -Tag fix1 -Url "http://localhost:5662/?3&xp=off&am=instant&rp=gf" [-Secs 150] [-Keep]
param([string]$Tag, [string]$Url, [int]$Secs = 150, [switch]$Keep)
$ErrorActionPreference = "Stop"
$here = $PSScriptRoot
$prof = Join-Path $env:TEMP "k1468-$Tag"
if (Test-Path $prof) { [IO.Directory]::Delete($prof, $true) }
$out = Join-Path $here "runs"
New-Item -ItemType Directory $out -Force | Out-Null
$gpuLog = Join-Path $out "$Tag.gpu.txt"; $pageLog = Join-Path $out "$Tag.page.txt"
$gp = Start-Process powershell.exe -ArgumentList '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $here 'gputhreads.ps1'), '-Match', "k1468-$Tag", '-Secs', ($Secs + 20) -RedirectStandardOutput $gpuLog -WindowStyle Hidden -PassThru
& node (Join-Path $here 'cold.mjs') $Url $prof $Secs *> $pageLog
Stop-Process -Id $gp.Id -ErrorAction SilentlyContinue
Start-Sleep 1
$dumps = @(Get-ChildItem (Join-Path $prof 'Crashpad\reports') -File -ErrorAction SilentlyContinue).Count
$mains = Select-String -Path $gpuLog -Pattern 'main ([\d.]+)s/10s' | ForEach-Object { [double]$_.Matches[0].Groups[1].Value }
$maxMain = if ($mains) { ($mains | Measure-Object -Maximum).Maximum } else { -1 }
$sum = (Select-String -Path $pageLog -Pattern '^SUMMARY (.*)$' | Select-Object -Last 1)
$sj = if ($sum) { $sum.Matches[0].Groups[1].Value } else { '{}' }
"RESULT tag=$Tag dumps=$dumps gpuMainMax=$maxMain samples=$(@($mains).Count) summary=$sj"
if (-not $Keep) { [IO.Directory]::Delete($prof, $true) }
