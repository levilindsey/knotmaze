# K1482 s30 (run29.ps1 + -NoTest: npm test runs outside the lock) Done checks (s28 run28.ps1's sequence), one Chrome at a time, run inside scripts/perf_lock.ps1. Each guard's
# WHOLE output goes to ../out/s30/raw/guards/<name>.txt (the console gets its tail). The page is a preview of the tip's
# code on -Port; the bar builds -Ref and -Base itself.
#   pwsh run27.ps1 -Port 6151 -Ref <tip> -BaseRef df4506594 [-NoBar | -BarOnly]   ($base is the page URL: PowerShell names are case-blind)
param([int]$Port = 6151, [string]$Ref, [string]$BaseRef = "df4506594", [int]$BarPort = 6160, [switch]$NoBar, [switch]$BarOnly, [switch]$NoTest)
$here = $PSScriptRoot; $out = Join-Path $here ../out/s30/raw/guards; $main = "C:\Users\lsl\Repositories\knotmaze\.claude\probes"
$wt = (Resolve-Path (Join-Path $here ../../../..)).Path
$base = "http://localhost:$Port"; $prof = Join-Path $env:TEMP "k1482s30-guard"
$link = "$base/?3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&rp=gf"
New-Item -ItemType Directory $out -Force | Out-Null; $out = (Resolve-Path $out).Path
$env:GF_KRETRY = "1"
function Wait-Mem { $t0 = Get-Date; while ((((Get-CimInstance Win32_OperatingSystem).FreeVirtualMemory / 1MB) -lt 3 -or ((Get-PSDrive C).Free / 1GB) -lt 8) -and ((Get-Date) - $t0).TotalMinutes -lt 15) { [Threading.Thread]::Sleep(20000) } }
function Log([string]$n) { Join-Path $out "$n.txt" }
"tip $Ref base $BaseRef page $base started $(Get-Date -Format s)" | Out-File (Log "meta") -Encoding utf8
if (-not $NoBar) {
  "== bar $(Get-Date -Format HH:mm:ss)"; $env:STRICT = "1"
  Push-Location $wt
  pwsh -NoProfile -File (Join-Path $main K1436/k1436_bar.ps1) -Ref $Ref -Base $BaseRef -Scenes ring,def,muse_hash,g41_user_tw64 -Port $BarPort -Tag k1482s30 -NoPerfLock 2>&1 | Tee-Object -FilePath (Log "bar") | Select-Object -Last 8
  "bar exit $LASTEXITCODE"; Pop-Location
  $env:STRICT = $null
}
if ($BarOnly) { "ALLDONE $(Get-Date -Format HH:mm:ss)"; return }
Wait-Mem
"== hold $(Get-Date -Format HH:mm:ss)"; node (Join-Path $main K1450/hold.mjs) $link (Join-Path $out "hold") $prof 60 2>&1 | Tee-Object -FilePath (Log "hold") | Select-Object -Last 4; "hold exit $LASTEXITCODE"
Wait-Mem
"== hold gfk=0 $(Get-Date -Format HH:mm:ss)"; node (Join-Path $main K1450/hold.mjs) "$link&gfk=0" (Join-Path $out "hold_gfk0") $prof 60 2>&1 | Tee-Object -FilePath (Log "hold_gfk0") | Select-Object -Last 4; "hold gfk0 exit $LASTEXITCODE"
Wait-Mem
"== panelopen $(Get-Date -Format HH:mm:ss)"; node (Join-Path $main K1482/s15/panelopen.mjs) $base $prof 2>&1 | Tee-Object -FilePath (Log "panelopen") | Select-Object -Last 2; "panelopen exit $LASTEXITCODE"
Wait-Mem
New-Item -ItemType Directory (Join-Path $out "dcb"), (Join-Path $out "dcf") -Force | Out-Null
"== dragcheck_b $(Get-Date -Format HH:mm:ss)"; $env:TLK = 'border'; node (Join-Path $main K1492/dragcheck_b.mjs) $base (Join-Path $out "dcb") $prof gfh 2>&1 | Tee-Object -FilePath (Log "dragcheck_b") | Select-Object -Last 6; "dcb exit $LASTEXITCODE"; $env:TLK = $null
Wait-Mem
"== dragcheck $(Get-Date -Format HH:mm:ss)"; node (Join-Path $main K1458/dragcheck.mjs) $base (Join-Path $out "dcf") $prof gfh 2>&1 | Tee-Object -FilePath (Log "dragcheck") | Select-Object -Last 6; "dcf exit $LASTEXITCODE"
if ($NoTest) { "ALLDONE $(Get-Date -Format HH:mm:ss)"; exit 0 }
"== npm test $(Get-Date -Format HH:mm:ss)"; $env:GF_KRETRY = $null; Push-Location $wt; npm test 2>&1 | Tee-Object -FilePath (Log "npm_test") | Select-Object -Last 6; "npm test exit $LASTEXITCODE"; Pop-Location
"ALLDONE $(Get-Date -Format HH:mm:ss)"
exit 0

