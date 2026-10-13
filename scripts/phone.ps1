# Connects Levi's Android phone (Pixel 11) to this machine's dev servers
# and to Chrome DevTools, so probes can drive the phone's Chrome.
#
#   pwsh scripts/phone.ps1                      # USB, or Tailscale if set up
#   pwsh scripts/phone.ps1 -Wireless            # plugged in: switch to
#                                               # Tailscale, then unplug
#   pwsh scripts/phone.ps1 -Ports 5173,5174     # tunnel other ports too
#   pwsh scripts/phone.ps1 -Url "http://localhost:5173/?k88dtb.J"
#
# The phone then reaches each dev server as http://localhost:<port> (a
# secure context, unlike a LAN or Tailscale address), and
# `puppeteer.connect({ browserURL: "http://127.0.0.1:9222" })` drives its
# Chrome (see .claude/probes/phone_probe.mjs).
#
# Wireless: Android's own wireless debugging can't work here, because the
# phone's Wi-Fi (192.168.86.x, behind the mesh router) is unreachable from
# the desktop (192.168.0.x). Instead, -Wireless runs `adb tcpip 5555` over
# USB and connects through Tailscale, which works anywhere both devices
# are on Tailscale, until the phone reboots. Later runs reconnect on
# their own.
param(
  # Strings, split on commas: `pwsh -File` passes "5173,5174" as ONE value.
  [string[]]$Ports = @("5173"),
  [string]$Url = "",
  [switch]$Wireless,
  [string]$TailscaleHost = "pixel-11"
)
$ErrorActionPreference = "Stop"
$TcpPort = 5555
$Ports = @($Ports | ForEach-Object { $_ -split "," } | Where-Object { $_ } | ForEach-Object { [int]$_ })

function Find-Adb {
  $onPath = Get-Command adb -ErrorAction SilentlyContinue
  if ($onPath) { return $onPath.Source }
  $candidates = @(
    "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
  ) + @(Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Google.PlatformTools_*\platform-tools\adb.exe" -ErrorAction SilentlyContinue | ForEach-Object FullName)
  foreach ($c in $candidates) { if (Test-Path $c) { return $c } }
  throw "adb not found (install Android platform-tools or the Android SDK)."
}

# The phone's Tailscale IPv4 address, or $null without Tailscale.
function Find-TailscaleIp {
  $ts = Get-Command tailscale -ErrorAction SilentlyContinue
  if (-not $ts) { return $null }
  try {
    $status = (& $ts.Source status --json) -join "`n" | ConvertFrom-Json
  } catch { return $null }
  # Match the machine name (the DNS label `tailscale status` prints,
  # e.g. "pixel-11"); HostName is the device's own ("Pixel 11").
  foreach ($peer in $status.Peer.PSObject.Properties.Value) {
    if (($peer.DNSName -split '\.')[0] -eq $TailscaleHost -or $peer.HostName -eq $TailscaleHost) {
      return @($peer.TailscaleIPs | Where-Object { $_ -match '^\d+\.' })[0]
    }
  }
  return $null
}

function Get-Devices {
  & $adb devices | Select-Object -Skip 1 |
    Where-Object { $_ -match "\tdevice$" } |
    ForEach-Object { ($_ -split "\t")[0] }
}

$adb = Find-Adb
$tsIp = Find-TailscaleIp
$tcpSerial = if ($tsIp) { "${tsIp}:$TcpPort" } else { $null }
$devices = @(Get-Devices)
$usbSerial = $devices | Where-Object { $_ -notmatch ":" } | Select-Object -First 1

if ($Wireless) {
  if (-not $usbSerial) { throw "-Wireless needs the phone plugged in over USB once." }
  if (-not $tsIp) { throw "Tailscale can't see '$TailscaleHost'. Is Tailscale on, on both devices?" }
  & $adb -s $usbSerial tcpip $TcpPort | Out-Null
  Start-Sleep -Seconds 3
}
if ($tcpSerial -and ($devices -notcontains $tcpSerial)) {
  # Reconnects after a desktop restart too, while the phone has not rebooted.
  $null = & $adb connect $tcpSerial 2>&1
  $devices = @(Get-Devices)
}

# Prefer the Tailscale transport: it survives unplugging.
$serial = if ($tcpSerial -and ($devices -contains $tcpSerial)) { $tcpSerial } else { $usbSerial }
if (-not $serial) {
  throw "No phone. Plug it in over USB with USB debugging on (accept the RSA prompt), then rerun with -Wireless to keep it over Tailscale."
}
Write-Host "Phone: $serial$(if ($serial -eq $tcpSerial) { ' (Tailscale; you may unplug)' } else { ' (USB)' })"

# Wake the screen; Chrome throttles rendering on a sleeping display.
& $adb -s $serial shell input keyevent KEYCODE_WAKEUP | Out-Null
$keyguard = & $adb -s $serial shell "dumpsys window | grep -c 'isKeyguardShowing=true'"
if ([int]$keyguard -gt 0) { Write-Warning "The phone is locked; unlock it before probing." }

foreach ($d in $devices) { & $adb -s $d forward --remove tcp:9222 2>$null | Out-Null }
foreach ($p in $Ports) { & $adb -s $serial reverse "tcp:$p" "tcp:$p" | Out-Null }
& $adb -s $serial forward tcp:9222 localabstract:chrome_devtools_remote | Out-Null

if ($Url) {
  & $adb -s $serial shell am start -a android.intent.action.VIEW -d "'$Url'" com.android.chrome | Out-Null
  Start-Sleep -Seconds 2
}

Write-Host "Reverse tunnels: $((& $adb -s $serial reverse --list) -join '; ')"
try {
  $tabs = (Invoke-WebRequest http://127.0.0.1:9222/json/list -UseBasicParsing -TimeoutSec 15).Content | ConvertFrom-Json
  Write-Host "Chrome DevTools: $(@($tabs).Count) tab(s) at http://127.0.0.1:9222 (none listed while Chrome is in the background)"
} catch {
  Write-Warning "Chrome DevTools isn't answering. Open Chrome on the phone, then rerun."
}
