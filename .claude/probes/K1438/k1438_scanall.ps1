# K1438: K1433's scan over the 12 census scenes for several variants, in parallel, under the perf lock.
#   pwsh .claude/probes/K1438/k1438_scanall.ps1 -Variants off,new,tgrfl [-Ppu 100]
# Variant -> env: off (src, switch off = master), new (GF_HOME=1, default fadeLength), tgrfl (GF_HOME=1, K1438_FL=tgr),
# fl<x> (GF_HOME=1, K1438_FL=<x>), m (master's copy), tgr (K1435's mode on master).
# Output: out/scan/<variant>_<scene>.json and .txt.
param([string[]]$Variants = @("off", "new"), [int]$Ppu = 100, [int]$Throttle = 12)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$out = Join-Path $PSScriptRoot "out/scan"
New-Item -ItemType Directory $out -Force | Out-Null
$lock = Join-Path $env:TEMP "claude-perf.lock"
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock: $(Get-Content $lock)"; break }
  Start-Sleep -Seconds 15
}
"K1438 agent (claude session 09c7a672), $(Get-Date -Format s), K1433 scan 12 scenes x $($Variants -join ',')" | Set-Content $lock
try {
  $scenes = "muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"
  $work = foreach ($v in $Variants) { foreach ($s in $scenes) { [pscustomobject]@{ v = $v; s = $s } } }
  $t0 = Get-Date
  $work | ForEach-Object -ThrottleLimit $Throttle -Parallel {
    $v = $_.v; $s = $_.s
    Set-Location $using:root
    $env:GF_HOME = $null; $env:K1438_EV = $null; $env:K1438_FL = $null
    if ($v -eq "new") { $env:GF_HOME = "1" }
    elseif ($v -eq "tgrfl") { $env:GF_HOME = "1"; $env:K1438_FL = "tgr" }
    elseif ($v -match '^fl(.+)$') { $env:GF_HOME = "1"; $env:K1438_FL = $Matches[1] }
    elseif ($v -eq "m") { $env:K1438_EV = "m" }
    elseif ($v -eq "tgr") { $env:K1438_EV = "tgr" }
    $o = Join-Path $using:out "$($v)_$($s)"
    node scripts/run_node.mjs .claude/probes/K1438/k1438_scan.ts $v $s $using:Ppu "$o.json" 2>&1 | Out-File -Encoding utf8 "$o.txt"
  }
  Write-Host "scan done in $([int]((Get-Date) - $t0).TotalSeconds) s"
}
finally { [System.IO.File]::Delete($lock) }
