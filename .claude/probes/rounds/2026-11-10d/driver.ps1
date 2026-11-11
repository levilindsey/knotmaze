# K156 round 2026-11-10d driver: runs the passes one after another (start, bench, [census], cleanup) and logs each exit code.
# pwsh -NoProfile -File driver.ps1 -Passes fin,c,a,b   (run from the worktree root; the phone lock is already taken)
param([string[]]$Passes = @('fin', 'c', 'a', 'b'), [string]$StopAt = '06:50')
$W = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..\..')).Path
$R = 'C:\Users\lsl\Repositories\knotmaze\.claude\probes\rounds\2026-11-10d'
$PerfLock = Join-Path $env:TEMP 'claude-perf.lock'
Set-Location $W
$cfgs = @{
  fin = @{ base = 'master'; head = 'master'; qb = ''; qh = 'rp=sdf'; census = $true }
  c   = @{ base = '1800ddbf'; head = 'c9186de5'; qb = 'rp=sdf'; qh = 'rp=sdf' }
  a   = @{ base = 'eb1bc554'; head = '53702915'; qb = 'rp=sdf'; qh = 'rp=sdf' }
  b   = @{ base = '53702915'; head = '1800ddbf'; qb = 'rp=sdf'; qh = 'rp=sdf' }
}
function Say($m) { $l = "{0} {1}" -f (Get-Date -Format 'HH:mm:ss'), $m; Add-Content -Path "$R\logs\driver.log" -Value $l }
foreach ($p in $Passes) {
  $c = $cfgs[$p]; $out = "$R\$p"
  if ((Get-Date).ToString('HH:mm') -ge $StopAt) { Say "$p skipped: past $StopAt"; continue }
  # perf lock around the build
  $t0 = Get-Date
  while ((Test-Path $PerfLock) -and ((Get-Date) - (Get-Item $PerfLock).LastWriteTime).TotalMinutes -lt 30) { Start-Sleep 10 }
  "K156 agent ab9da9e8 | $(Get-Date -Format s) | round 2026-11-10d $p build" | Set-Content $PerfLock
  Say "$p perf lock taken, start"
  pwsh -NoProfile -File scripts/phone_pass.ps1 -Phase start -Base $c.base -Head $c.head -AllowChrome -QuietS 30 -Out $out *> "$R\logs\${p}_start.out"
  $se = $LASTEXITCODE
  if ((Test-Path $PerfLock) -and ((Get-Content $PerfLock -Raw) -match 'ab9da9e8')) { Remove-Item $PerfLock -Force }
  Say "$p start exit $se; perf lock released"
  if ($se -eq 0) {
    $env:ITER = '60'; $env:QBASE = $c.qb; $env:QHEAD = $c.qh
    Say "$p g31 begin"
    node scripts/phone_pass/k539_g31.mjs "$out\config.json" *> "$R\logs\${p}_g31.out"
    Say "$p g31 exit $LASTEXITCODE"
    if ($c.census -and -not (Test-Path "$out\state\watchdog.trip")) {
      $env:WALK = 'new'; $env:EXTRA = '&cam=follow'; $env:PROOF = '2.5:fade,2.5:beacon'; $env:ONES = 'shaped'; $env:PROOF_IMG = '1'
      $env:CVP = '1000x900'; $env:BUDGET_MS = '360000'; $env:PASSCFG = "$out\config.json"
      Say "$p census begin"
      node .claude/probes/K268/proof/census3a.mjs http://localhost:5480 "$out\census" 10 *> "$R\logs\${p}_census.out"
      Say "$p census exit $LASTEXITCODE"
      Remove-Item Env:PASSCFG, Env:PROOF_IMG, Env:ONES, Env:PROOF, Env:EXTRA, Env:WALK, Env:CVP, Env:BUDGET_MS -ErrorAction SilentlyContinue
      if (Test-Path "$out\census\proofdata") {
        node .claude/probes/K268/proof/far_scan.mjs "$out\census\proofdata" *> "$R\logs\${p}_farscan.out"
        Say "$p far_scan exit $LASTEXITCODE"
      }
    }
  }
  if ($c.census -and $se -eq 0 -and -not (Test-Path "$out\state\watchdog.trip")) {
    # K307 traced load: Chrome restarted 2026-11-10 08:11 (after salt p1109a, 2026-11-09 22:07:41); 0 shader translates = the program cache persisted
    $env:PASSCFG = "$out\config.json"
    $hb = (Get-Content "$out\config.json" -Raw | ConvertFrom-Json).hostB
    Say "$p k307 traced load begin"
    $kp = Start-Process -FilePath node -ArgumentList @('--max-old-space-size=8192', "$R\k307\trace_intro_phone.mjs", $hb, 'k307_p1109a_after_restart', '?daily&snd=none', '--loads', '1', '--vp', '411x753x2.625', '--max', '20', '--ms', '12000', '--inject', 'salt_p1109a.js', '--trace', 'first') -WorkingDirectory "$R\k307" -RedirectStandardOutput "$R\logs\${p}_k307.out" -RedirectStandardError "$R\logs\${p}_k307.err" -WindowStyle Hidden -PassThru
    $dl = (Get-Date).AddMinutes(4)
    while (-not $kp.HasExited -and (Get-Date) -lt $dl) { if (Test-Path "$out\state\watchdog.trip") { break }; Start-Sleep 3 }
    if (-not $kp.HasExited) { Stop-Process -Id $kp.Id -Force; Say "$p k307 STOPPED (timeout or trip)" }
    Say "$p k307 exit $($kp.ExitCode)"
    Remove-Item Env:PASSCFG -ErrorAction SilentlyContinue
  }
  $trip = if (Test-Path "$out\state\watchdog.trip") { (Get-Content "$out\state\watchdog.trip" -Raw).Trim() } else { 'none' }
  Say "$p trip=$trip"
  pwsh -NoProfile -File scripts/phone_pass.ps1 -Phase cleanup -Out $out *> "$R\logs\${p}_cleanup.log"
  Say "$p cleanup exit $LASTEXITCODE"
  if ($trip -ne 'none') { Say "stopping: trip"; break }
}
Say 'driver done'
