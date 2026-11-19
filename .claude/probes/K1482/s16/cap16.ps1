# K1482 s16 (s15 cap15.ps1 with s16 profiles; s14 cap14.ps1 with s15 profiles, cap15.mjs = cap11.mjs + the K15 knobs (-K15 json -> globalThis.__k15); s13 cap13.ps1 with s14 profiles; s11 cap11.ps1 with s13 profiles; runs s11/cap11.mjs): capture link A on a preview (memory/disk wait, warm, then the frozen state at HASH),
# each node run under a time limit (default 4 min; a shader that fails to compile makes cap.mjs wait forever):
# on timeout the run and its Chrome are killed and the log says so. The warm run compiles the look program (-Limit);
# the shot (-ShotLimit, 7 min) can reload several times to reach HASH.
#   pwsh cap11.ps1 <port> <outDir> <profileTag> [-Query q] [-Env k=v,...] [-NoWarm] [-Limit 240]
param([int]$Port, [string]$Out, [string]$Tag, [string]$Query = "3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1", [string[]]$Env = @(), [switch]$NoWarm, [int]$Limit = 240, [int]$ShotLimit = 420, [string]$K15 = "")
$cap = Join-Path $PSScriptRoot ../s15/cap15.mjs
if ($K15) { $env:K15 = $K15 } else { $env:K15 = $null }
$t0 = Get-Date
while ((((Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB) -lt 3 -or ((Get-PSDrive C).Free / 1GB) -lt 8) -and ((Get-Date) - $t0).TotalMinutes -lt 15) { [Threading.Thread]::Sleep(20000) }
$prof = Join-Path $env:TEMP "k1482s16-$Tag"
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


