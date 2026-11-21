# K1482 s41 (from stage 39): s36's cap36.ps1 with s39 profiles (k1482s41-<tag>). A new tag's profile is a COPY of the kept profile
# $env:TEMP\k1482s27live-profile-20548 (never changed or deleted here); it runs ../s34/cap34.mjs.
# Capture a link on a preview (memory/disk wait, warm, then the frozen state at HASH), each node run under a time
# limit: on timeout the run and its Chrome are killed and the log says so.
#   pwsh cap41.ps1 <port> <outDir> <profileTag> [-Query q] [-Env k=v,...] [-NoWarm] [-Limit 240]
param([int]$Port, [string]$Out, [string]$Tag, [string]$Query = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&bgs=0", [string[]]$Env = @(), [switch]$NoWarm, [int]$Limit = 240, [int]$ShotLimit = 420, [string]$Cap = "cap34.mjs")
$cap = Join-Path $PSScriptRoot "../s34/$Cap"
$env:K15 = $null
$t0 = Get-Date
while ((((Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB) -lt 3 -or ((Get-PSDrive C).Free / 1GB) -lt 8) -and ((Get-Date) - $t0).TotalMinutes -lt 15) { [Threading.Thread]::Sleep(20000) }
$prof = Join-Path $env:TEMP "k1482s41-$Tag"
$kept = Join-Path $env:TEMP "k1482s27live-profile-20548"; 
if (-not (Test-Path $prof) -and (Test-Path $kept)) { robocopy $kept $prof /E /NFL /NDL /NJH /NJS /NP /R:0 /W:0 /XF lockfile SingletonLock SingletonCookie SingletonSocket | Out-Null; "profile $prof copied from the kept one" }
if (-not $env:HASH) { $env:HASH = "fff8c9e5" }
$Env = @($Env | ForEach-Object { $_ -split "," } | Where-Object { $_ })
foreach ($kv in $Env) { $k, $v = $kv.Split("=", 2); Set-Item "Env:$k" $v }
New-Item -ItemType Directory $Out -Force | Out-Null
function Run-Cap([string]$label, [int]$lim) {
  $log = Join-Path $Out "cap_$label.log"
  $p = Start-Process node -ArgumentList @($cap, "http://localhost:$Port", $Out, $prof, "`"$Query`"") -NoNewWindow -PassThru -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  if (-not $p.WaitForExit($lim * 1000)) {
    "TIMEOUT after $lim s ($label): killing" | Out-File -Append -Encoding ASCII $log
    taskkill /T /F /PID $p.Id 2>$null | Out-Null
    Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($prof) } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  }
  Get-Content $log
}
if (-not $NoWarm) { $env:WARM = "1"; Run-Cap "warm" $Limit }
$env:WARM = $null; Run-Cap "shot" $ShotLimit
foreach ($kv in $Env) { Set-Item "Env:$($kv.Split('=')[0])" $null }



