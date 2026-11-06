# K1214 22M: CDP Profiler per build on a Vite DEV server of the build's
# own temporary worktree (a preview bundle is minified into one chunk,
# so its profile cannot be grouped by source file). One build at a
# time on port 5995; the worktree's node_modules is a junction to the
# main checkout's, unlinked before the worktree is removed (git 2.33
# follows a junction into its target). Run under the perf lock:
#   run_locked.ps1 -Batch batch22m_cdp.txt
$ErrorActionPreference = "Continue"
$repo = "C:\Users\lsl\Repositories\knotmaze"
$cfg = Join-Path $repo ".claude\probes\K1214\vite.private-cache.config.ts"
$here = $PSScriptRoot
foreach ($sha in @("1fe793f5", "71eedb94", "36aed2d5", "fbc1b212", "734c55b9")) {
  $wt = Join-Path $env:TEMP "k1214-wt-$sha"
  Write-Output "=== CDP $sha $(Get-Date -Format HH:mm:ss) ==="
  git -C $repo worktree add --detach $wt $sha | Out-Null
  if ($LASTEXITCODE -ne 0) { Write-Output "worktree add failed for $sha"; continue }
  try {
    New-Item -ItemType Junction -Path (Join-Path $wt "node_modules") -Target (Join-Path $repo "node_modules") | Out-Null
    $log = Join-Path $here "dev_$sha.log"
    $proc = Start-Process -FilePath "node" -ArgumentList @("node_modules/vite/bin/vite.js", "--config", $cfg, "--port", "5995", "--strictPort", "--host", "127.0.0.1") -WorkingDirectory $wt -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err" -PassThru
    try {
      $ok = $false
      foreach ($i in 1..60) {
        Start-Sleep -Seconds 2
        try { $r = Invoke-WebRequest -Uri "http://127.0.0.1:5995/" -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { $ok = $true; break } } catch {}
      }
      if (-not $ok) { Write-Output "dev server for $sha never answered"; continue }
      $env:K1214_HOST = "http://127.0.0.1:5995"
      $env:K1214_LABEL = $sha
      Push-Location $here
      node cdp22m.mjs "out_cdp_$sha"
      Pop-Location
    } finally {
      Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
      Start-Sleep -Seconds 1
    }
  } finally {
    $nm = Get-Item (Join-Path $wt "node_modules") -Force -ErrorAction SilentlyContinue
    if ($nm -and $nm.LinkType) { $nm.Delete() }
    git -C $repo worktree remove --force $wt 2>$null | Out-Null
  }
}
