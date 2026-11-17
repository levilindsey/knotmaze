# K1449: GPU = mirror with home on (K1439's k1439_parity.ts) on this worktree's source, served by a private-cache Vite
# dev server on 5542. Run under the perf lock (k1449_locked.ps1). Output: K1439/out/parity_<Tag>.json, moved to out/.
#   pwsh -NoProfile -File .claude/probes/K1449/k1449_gpu.ps1 [-Tag k1449]
param([string]$Tag = "k1449", [int]$Port = 5542)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$vite = "C:\Users\lsl\Repositories\knotmaze\node_modules\vite\bin\vite.js"
$out = Join-Path $PSScriptRoot "out"; New-Item -ItemType Directory -Force $out | Out-Null
$log = Join-Path $out "dev_$Port.log"
$srv = Start-Process -FilePath node -WorkingDirectory $root -ArgumentList @($vite, "--config", ".claude/probes/K1449/vite.private-cache.config.ts", "--host", "127.0.0.1", "--port", "$Port", "--strictPort") -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
try {
  $ok = $false
  for ($i = 0; $i -lt 120 -and -not $ok; $i++) { try { $null = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 "http://127.0.0.1:$Port/@vite/client"; $ok = $true } catch { Start-Sleep -Milliseconds 500 } }
  if (-not $ok) { throw "dev server on $Port never answered" }
  Set-Location $root
  $env:BASE = "http://127.0.0.1:$Port/"
  node scripts/run_node.mjs .claude/probes/K1439/k1439_parity.ts $Tag --scene=def,muse_hash --fl=0,0.14,1.2 --ppu=80 2>&1 | Tee-Object (Join-Path $out "parity_$Tag.log")
  Move-Item (Join-Path $root ".claude/probes/K1439/out/parity_$Tag.json") $out -Force -ErrorAction SilentlyContinue
} finally {
  if ($srv -and -not $srv.HasExited) { Stop-Process -Id $srv.Id -Force }
  Write-Host "dev server stopped"
}