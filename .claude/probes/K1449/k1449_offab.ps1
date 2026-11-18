# K1449 (a copy of K1439's k1439_offab.ps1: ports 5540/5541, def + muse_hash, K1449's lock owner). The flag-off pixel A/B. Serves master's build (cfb1f30b) on 5540 and the stage's (-Branch) on 5541 with
# `vite preview` (builds from scripts/preview.ps1 -BuildOnly under $env:TEMP\k1439pv), runs k1449_offab.mjs (A = master,
# B = branch, A again as the control) under the perf lock (k1449_locked.ps1), and stops both servers after.
#   pwsh -NoProfile -File .claude/probes/K1449/k1449_offab.ps1 -Branch 963029e8
param([string]$Master = "cfb1f30b", [Parameter(Mandatory = $true)][string]$Branch, [string]$Tag = "offab")
$ErrorActionPreference = "Stop"
$root = Join-Path $env:TEMP "k1439pv"
$vite = "C:\Users\lsl\Repositories\knotmaze\node_modules\vite\bin\vite.js"
$out = Join-Path $PSScriptRoot "out"
New-Item -ItemType Directory -Force $out | Out-Null
$servers = @()
try {
  foreach ($p in @(@($Master, 5540), @($Branch, 5541))) {
    $dir = Join-Path $root $p[0]
    if (-not (Test-Path (Join-Path $dir "index.html"))) { throw "no build at $dir" }
    $log = Join-Path $out "preview_$($p[1]).log"
    $servers += Start-Process -FilePath node -ArgumentList @($vite, "preview", "--outDir", $dir, "--host", "127.0.0.1", "--port", "$($p[1])", "--strictPort") -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  }
  foreach ($port in 5540, 5541) {
    $ok = $false
    for ($i = 0; $i -lt 60 -and -not $ok; $i++) {
      try { $null = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:$port/"; $ok = $true } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ok) { throw "preview on $port never answered" }
  }
  $mjs = Join-Path $PSScriptRoot "k1449_offab.mjs"
  & pwsh -NoProfile -File (Join-Path $PSScriptRoot "k1449_locked.ps1") -What "K1449 flag-off pixel A/B" -Cmd "node `"$mjs`" http://127.0.0.1:5540 http://127.0.0.1:5541 $Tag"
} finally {
  foreach ($s in $servers) { if ($s -and -not $s.HasExited) { Stop-Process -Id $s.Id -Force } }
  Write-Host "servers stopped"
}
