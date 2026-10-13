# Connects Levi's USB Android phone (Pixel 11) to this machine's dev
# servers and to Chrome DevTools, so probes can drive the phone's Chrome.
#
#   pwsh scripts/phone.ps1                      # tunnel the default ports
#   pwsh scripts/phone.ps1 -Ports 5173,5174     # tunnel other ports too
#   pwsh scripts/phone.ps1 -Url "http://localhost:5173/?k88dtb.c"
#
# The phone then reaches each dev server as http://localhost:<port>, and
# `puppeteer.connect({ browserURL: "http://127.0.0.1:9222" })` drives its
# Chrome (see .claude/probes/phone_probe.mjs). USB only: the phone's
# Wi-Fi subnet differs from the desktop's, so wireless pairing fails.
# Away from home, use Tailscale instead (no script needed): the desktop's
# dev server answers at http://100.121.181.127:5173 because Vite listens
# on all interfaces (--host).
param(
  [int[]]$Ports = @(5173),
  [string]$Url = ""
)
$ErrorActionPreference = "Stop"

function Find-Adb {
  $onPath = Get-Command adb -ErrorAction SilentlyContinue
  if ($onPath) { return $onPath.Source }
  $candidates = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
  ) + @(Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Google.PlatformTools_*\platform-tools\adb.exe" -ErrorAction SilentlyContinue | ForEach-Object FullName)
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  throw "adb not found (install Android platform-tools or the Android SDK)."
}

$adb = Find-Adb
$devices = & $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" }
if (-not $devices) {
  throw "No phone attached. Plug it in over USB with USB debugging on, and accept the RSA prompt on the phone."
}
Write-Host "Phone: $(($devices | Select-Object -First 1) -replace '\t.*$', '')"

# Wake the screen; Chrome throttles rendering on a sleeping display.
& $adb shell input keyevent KEYCODE_WAKEUP | Out-Null
$keyguard = & $adb shell "dumpsys window | grep -c 'isKeyguardShowing=true'"
if ([int]$keyguard -gt 0) { Write-Warning "The phone is locked; unlock it before probing." }

foreach ($p in $Ports) { & $adb reverse "tcp:$p" "tcp:$p" | Out-Null }
& $adb forward tcp:9222 localabstract:chrome_devtools_remote | Out-Null

if ($Url) {
  & $adb shell am start -a android.intent.action.VIEW -d "'$Url'" com.android.chrome | Out-Null
  Start-Sleep -Seconds 2
}

Write-Host "Reverse tunnels: $((& $adb reverse --list) -join '; ')"
try {
  $tabs = (Invoke-WebRequest http://127.0.0.1:9222/json/list -UseBasicParsing -TimeoutSec 5).Content | ConvertFrom-Json
  Write-Host "Chrome DevTools: $($tabs.Count) tab(s) at http://127.0.0.1:9222"
} catch {
  Write-Warning "Chrome DevTools isn't answering. Open Chrome on the phone once, then rerun."
}
