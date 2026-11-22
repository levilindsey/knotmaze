# K1582 (27Z5): capture the two spot scenes on a list of commits, in order.
#   pwsh .claude/probes/K1582/bisect.ps1 -Refs <sha,sha,...> [-Port 5496]
# Per commit: scripts/preview.ps1 builds and serves it (its own process,
# stopped after the capture; the listener's command line must name that
# commit's build folder before any capture), then capbox.mjs takes the two
# scenes into out/27Z5/bisect_<short>/ on the run's one kept profile.
# Run it inside scripts/perf_lock.ps1 (the caller holds the lock).
param(
  [Parameter(Mandatory)][string]$Refs,
  [int]$Port = 5496
)
$list = $Refs -split "\s+" | Where-Object { $_ }
$ErrorActionPreference = "Stop"
$repo = "C:\Users\lsl\Repositories\knotmaze"
$root = Join-Path $env:TEMP "knotmaze-27Z5"
foreach ($ref in $list) {
  $short = $ref.Substring(0, 9)
  $out = ".claude/probes/K1582/out/27Z5/bisect_$short"
  if (Test-Path "$repo\$out\muse_hash\border.png") { "skip $short (captured)"; continue }
  "=== $ref ==="
  $log = Join-Path $env:TEMP "k1582-preview-$short.log"
  $proc = Start-Process pwsh -ArgumentList "-NoProfile", "-File", "scripts/preview.ps1", "-Port", "$Port", "-Ref", $ref, "-Root", $root -WorkingDirectory $repo -PassThru -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  try {
    $ok = $false
    for ($i = 0; $i -lt 90; $i++) {
      Start-Sleep -Seconds 2
      try { if ((Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 5).StatusCode -eq 200) { $ok = $true; break } } catch {}
      if ($proc.HasExited) { break }
    }
    if (-not $ok) { "PREVIEW FAILED $short"; Get-Content $log -Tail 5; continue }
    $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)").CommandLine
    if ($cmd -notlike "*$short*") { "LISTENER MISMATCH $short : $cmd"; continue }
    "listener ok $short"
    $env:EXPECT_SHA = $short
    node .claude/probes/K1582/capbox.mjs "http://localhost:$Port" $out .claude/probes/K1582/out/profile .claude/probes/K1582/jobs.json
  } finally {
    try { $conn2 = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue; if ($conn2) { Stop-Process -Id $conn2.OwningProcess -Force -ErrorAction SilentlyContinue } } catch {}
    try { if (-not $proc.HasExited) { Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue } } catch {}
    Start-Sleep -Seconds 2
  }
}
"bisect batch done"
