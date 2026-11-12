# K1247 s25: k1247s24_rest.ps1 under the s25 owner. K1247 s24: the app's paint at rest, ob=0 against the default (or any second link), one build, under the perf lock:
# two scripts/diag_screenshot.mjs captures (headed, real GPU, real time; phy=0 so both loads hold one layout), then
# k1247s20_appdiff.mjs (off | on | |diff| at the n windows that differ most).
#   pwsh .claude/probes/K1247/k1247s25_rest.ps1 -Out <dir> -Port <port> [-Q <query>] [-B <suffix for the second link>] [-Shot]
# -Shot captures with k1247s24_restshot.mjs (both links in one browser, everything but the canvases hidden).
param([Parameter(Mandatory = $true)][string]$Out, [int]$Port = 5995, [string]$Q = "?b&am=instant&snd=none&fw=0&rp=outline&phy=0", [string]$B = "", [int]$SettleMs = 6000, [switch]$Shot)
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1247 s25 agent (worktree-agent-a2a09438173cbb356)"
$deadline = (Get-Date).AddMinutes(30)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 30 min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), k1247s25_rest app paint at rest ob=0 vs default" | Out-File -Encoding ASCII $lock
try {
  New-Item -ItemType Directory $Out -Force | Out-Null
  $root = Resolve-Path (Join-Path $PSScriptRoot "..\..\..")
  $diagJs = Join-Path $root "scripts\diag_screenshot.mjs"
  $pngA = Join-Path $Out "rest_ob0.png"; $pngB = Join-Path $Out "rest_default.png"
  if ($Shot) {
    # canvas only: the panel's open state and theme differed between two diag_screenshot loads (203627 px of panel)
    & node (Join-Path $PSScriptRoot "k1247s24_restshot.mjs") $pngA "http://localhost:$Port/$Q&ob=0" $pngB "http://localhost:$Port/$Q$B"
  } else {
    & node $diagJs "http://localhost:$Port/$Q&ob=0" $pngA $SettleMs | Select-Object -Last 3
    & node $diagJs "http://localhost:$Port/$Q$B" $pngB $SettleMs | Select-Object -Last 3
  }
  & node (Join-Path $PSScriptRoot "k1247s20_appdiff.mjs") $pngA $pngB (Join-Path $Out "rest_ob0_vs_default.png")
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
