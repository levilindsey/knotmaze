# K1439: the cost check. Serves master's build (cfb1f30b) on 5522 and the stage's (-Branch) on 5523 with
# `vite preview` (builds from scripts/preview.ps1 -BuildOnly under $env:TEMP\k1439pv), runs K1362's
# k1362c1_bench.ps1 (it takes the perf lock itself) in two rounds, the second in reverse order, over
# the bench's two links: master flag off | branch flag off | branch gfh=1. Stops both servers after.
#   pwsh -NoProfile -File .claude/probes/K1439/k1439_bench.ps1 -Branch 963029e8
param([string]$Master = "cfb1f30b", [Parameter(Mandatory = $true)][string]$Branch, [string]$Tag = "bench")
$ErrorActionPreference = "Stop"
$root = Join-Path $env:TEMP "k1439pv"
$vite = "C:\Users\lsl\Repositories\knotmaze\node_modules\vite\bin\vite.js"
$out = Join-Path $PSScriptRoot "out"
New-Item -ItemType Directory -Force $out | Out-Null
$servers = @()
try {
  foreach ($p in @(@($Master, 5522), @($Branch, 5523))) {
    $dir = Join-Path $root $p[0]
    if (-not (Test-Path (Join-Path $dir "index.html"))) { throw "no build at $dir" }
    $log = Join-Path $out "preview_$($p[1]).log"
    $servers += Start-Process -FilePath node -ArgumentList @($vite, "preview", "--outDir", $dir, "--host", "127.0.0.1", "--port", "$($p[1])", "--strictPort") -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  }
  foreach ($port in 5522, 5523) {
    $ok = $false
    for ($i = 0; $i -lt 60 -and -not $ok; $i++) {
      try { $null = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:$port/"; $ok = $true } catch { Start-Sleep -Milliseconds 500 }
    }
    if (-not $ok) { throw "preview on $port never answered" }
  }
  $links = "?b.FMKB4DIQ&am=instant&snd=none&rp=gf", "?p9ar6.FMKB4DIQ&am=instant&snd=none&rp=gf"
  $urls = @()
  foreach ($l in $links) { $urls += "http://127.0.0.1:5522/$l", "http://127.0.0.1:5523/$l", "http://127.0.0.1:5523/$l&gfh=1" }
  $r1 = Join-Path $out "$($Tag)_r1.json"
  $r2 = Join-Path $out "$($Tag)_r2.json"
  & (Join-Path $PSScriptRoot "..\K1362\k1362c1_bench.ps1") -Out $r1 -Q $urls
  [array]::Reverse($urls)
  & (Join-Path $PSScriptRoot "..\K1362\k1362c1_bench.ps1") -Out $r2 -Q $urls
} finally {
  foreach ($s in $servers) { if ($s -and -not $s.HasExited) { Stop-Process -Id $s.Id -Force } }
  Write-Host "servers stopped"
}
