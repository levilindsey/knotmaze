# K1247 s35: runs the pool prototype (k1247s35_pool.mjs) under the machine-wide perf lock: waits for the lock
# (stale after 30 min), takes it, runs each case, writes out/s35/pool_<case>.txt|json, deletes the lock.
# -Only def_sub10,fat_sub1 runs those cases; -Extra "nobuild=1" passes arguments to every run.
#   pwsh .claude/probes/K1247/k1247s35_pool_locked.ps1 [-Drags <main checkout s18 drag dir>]
param([string]$Drags = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1247\out\s18\drag", [string]$Only = "", [string]$Extra = "")
$ErrorActionPreference = "Stop"
$root = Resolve-Path "$PSScriptRoot\..\..\.."
$lock = Join-Path $env:TEMP "claude-perf.lock"
$out = Join-Path $root ".claude\probes\K1247\out\s35"
New-Item -ItemType Directory $out -Force | Out-Null
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Output "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock)"; break }
  Start-Sleep -Seconds 5
}
"K1247 s35 pool agent-a8d93842 $(Get-Date -Format s) pool prototype (Chrome, K outline workers)" | Out-File -Encoding ASCII $lock
Write-Output "lock taken $(Get-Date -Format HH:mm:ss)"
try {
  $cases = @(
    @{ n = "def_sub1"; d = "def"; a = @("ks=1,2,3,4,5,6,8", "sub=1", "sec=8", "warm=3") },
    @{ n = "def_sub10"; d = "def"; a = @("ks=1,4,5,6", "sub=10", "sec=8", "warm=3") },
    @{ n = "muse_hash_sub1"; d = "muse_hash"; a = @("ks=1,5,6", "sub=1", "sec=8", "warm=3") },
    @{ n = "fat_sub1"; d = "fat"; a = @("ks=1,5,6", "sub=1", "sec=8", "warm=3") },
    @{ n = "def_sub1_b"; d = "def"; a = @("ks=5,4,1", "sub=1", "sec=8", "warm=3") }
  )
  if ($Only) { $cases = $cases | Where-Object { ($Only -split ",") -contains $_.n } }
  foreach ($c in $cases) {
    $txt = Join-Path $out "pool_$($c.n).txt"
    & node (Join-Path $root ".claude\probes\K1247\k1247s35_pool.mjs") (Join-Path $Drags $c.d) @($c.a) "out=$(Join-Path $out "pool_$($c.n).json")" @(if ($Extra) { $Extra -split " " }) 2>&1 | Tee-Object -FilePath $txt | Out-Null
    Write-Output "$($c.n) done $(Get-Date -Format HH:mm:ss)"
  }
} finally {
  Remove-Item $lock -Force
  Write-Output "lock released $(Get-Date -Format HH:mm:ss)"
}
