# K1247 s35: runs the pool prototype (k1247s35_pool.mjs) under the machine-wide perf lock: waits for the lock
# (stale after 30 min), takes it, runs each case, writes out/s35/pool_<case>.txt|json, deletes the lock.
# -Only def_sub10,fat_sub1 runs those cases; -Extra "nobuild=1" passes arguments to every run.
#   pwsh .claude/probes/K1247/k1247s35_pool_locked.ps1 [-Drags <main checkout s18 drag dir>]
param([string]$Drags = "C:\Users\lsl\Repositories\knotmaze\.claude\probes\K1247\out\s18\drag", [string]$Only = "", [string]$Extra = "")
$ErrorActionPreference = "Stop"
# other processes' CPU over 3 s, in % of one core (sum, and the top three)
function Get-Load {
  $a = @{}; Get-Process | ForEach-Object { $a[$_.Id] = $_.CPU }; Start-Sleep -Seconds 3
  $r = Get-Process | Where-Object { $_.Name -notmatch "^(chrome|Idle|System)$" -and $a.ContainsKey($_.Id) -and $_.CPU } | ForEach-Object { [pscustomobject]@{ N = $_.Name; P = [math]::Round(100 * ($_.CPU - $a[$_.Id]) / 3) } } | Sort-Object P -Descending
  [pscustomobject]@{ Sum = ($r | Measure-Object P -Sum).Sum; Top = (($r | Select-Object -First 3 | ForEach-Object { "$($_.N) $($_.P)" }) -join ", ") }
}
# wait up to $QuietMin minutes for the others' load to drop under $QuietPct (% of one core)
$QuietMin = [double]($env:K1247_QUIET_MIN ?? 10); $QuietPct = [double]($env:K1247_QUIET_PCT ?? 60)
$root = Resolve-Path "$PSScriptRoot\..\..\.."
$lock = Join-Path $env:TEMP "claude-perf.lock"
$out = Join-Path $root ".claude\probes\K1247\out\s35"
New-Item -ItemType Directory $out -Force | Out-Null
$tq = Get-Date; do { $L = Get-Load } while ($L.Sum -gt $QuietPct -and ((Get-Date) - $tq).TotalMinutes -lt $QuietMin)
Write-Output "load before: $($L.Sum)% ($($L.Top)) after waiting $([int]((Get-Date) - $tq).TotalSeconds) s"
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Output "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock)"; break }
  Start-Sleep -Seconds 5
}
"K1247 s35 pool agent-a8d93842 $(Get-Date -Format s) pool prototype (Chrome, K outline workers)" | Out-File -Encoding ASCII $lock
Write-Output "lock taken $(Get-Date -Format HH:mm:ss)"
$L = Get-Load; Write-Output "load at lock: $($L.Sum)% ($($L.Top))"
try {
  $cases = @(
    @{ n = "def_sub1"; d = "def"; a = @("ks=1,2,3,4,5,6,8", "sub=1", "sec=8", "warm=3") },
    @{ n = "def_sub10"; d = "def"; a = @("ks=1,4,5,6", "sub=10", "sec=8", "warm=3") },
    @{ n = "muse_hash_sub1"; d = "muse_hash"; a = @("ks=1,5,6", "sub=1", "sec=8", "warm=3") },
    @{ n = "fat_sub1"; d = "fat"; a = @("ks=1,5,6", "sub=1", "sec=8", "warm=3") },
    @{ n = "def_sub1_b"; d = "def"; a = @("ks=5,4,1", "sub=1", "sec=8", "warm=3") },
    @{ n = "def_q_a"; d = "def"; a = @("ks=1,2,3,4,5,6,8", "sub=1", "sec=8", "warm=3") },
    @{ n = "def_q_b"; d = "def"; a = @("ks=8,6,5,4,3,2,1", "sub=1", "sec=8", "warm=3") },
    @{ n = "fat_q"; d = "fat"; a = @("ks=1,4,5", "sub=1", "sec=8", "warm=3") },
    @{ n = "muse_hash_q"; d = "muse_hash"; a = @("ks=1,4,5", "sub=1", "sec=8", "warm=3") }
  )
  if ($Only) { $cases = $cases | Where-Object { ($Only -split ",") -contains $_.n } }
  foreach ($c in $cases) {
    $txt = Join-Path $out "pool_$($c.n).txt"
    & node (Join-Path $root ".claude\probes\K1247\k1247s35_pool.mjs") (Join-Path $Drags $c.d) @($c.a) "out=$(Join-Path $out "pool_$($c.n).json")" @(if ($Extra) { $Extra -split " " }) 2>&1 | Tee-Object -FilePath $txt | Out-Null
    $L = Get-Load; "load after: $($L.Sum)% ($($L.Top))" | Out-File -Append -Encoding ASCII $txt
    Write-Output "$($c.n) done $(Get-Date -Format HH:mm:ss); load after $($L.Sum)% ($($L.Top))"
  }
} finally {
  Remove-Item $lock -Force
  Write-Output "lock released $(Get-Date -Format HH:mm:ss)"
}
