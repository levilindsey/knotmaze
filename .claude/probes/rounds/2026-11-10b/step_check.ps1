param([string]$Label = "step")
$R = 'C:\Users\lsl\Repositories\knotmaze\.claude\probes\rounds\2026-11-10b'
$cfg = Get-Content "$R\sdf\config.json" -Raw | ConvertFrom-Json
& 'C:\Users\lsl\Repositories\knotmaze\.claude\probes\agents\phone_lock_take.ps1' -Owner 'K156 agent acaae08c' -What 'round 2026-11-10b' *> $null
$trip = if (Test-Path "$R\sdf\state\watchdog.trip") { (Get-Content "$R\sdf\state\watchdog.trip" -Raw).Trim() } else { "none" }
$wl = (Get-Content "$R\sdf\state\watchdog.log" -Tail 1) -replace '\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?', '<dev>'
$th = & $cfg.adb -s $cfg.serial shell "dumpsys thermalservice | grep -E 'Thermal Status' ; dumpsys thermalservice | sed -n '/Current temperatures from HAL/,/Current cooling/p' | grep -E 'mName=(VIRTUAL-SKIN|battery),'" 2>&1
$st = ([regex]::Match(($th -join "`n"), 'Thermal Status: (\d+)')).Groups[1].Value
$temps = ([regex]::Matches(($th -join "`n"), 'mValue=([\d.]+), mType=-?\d+, mName=([\w-]+)') | ForEach-Object { "$($_.Groups[2].Value) $([math]::Round([double]$_.Groups[1].Value,1))" }) -join ', '
$ms = & $cfg.adb -s $cfg.serial shell "dumpsys media_session" 2>&1
$states = ([regex]::Matches(($ms -join "`n"), 'state=PlaybackState \{state=(\w+)') | ForEach-Object { $_.Groups[1].Value }) -join ','
$active = ([regex]::Matches(($ms -join "`n"), 'active=(true|false)') | ForEach-Object { $_.Groups[1].Value }) -join ','
$line = "$(Get-Date -Format HH:mm:ss) [$Label] trip=$trip | watchdog: $wl | thermal $st ($temps) | media sessions active=[$active] states=[$states]"
$line | Out-File -Append -Encoding utf8 "$R\logs\steps.log"
$line


