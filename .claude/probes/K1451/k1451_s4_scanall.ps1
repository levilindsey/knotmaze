# K1451 s4: the v2 scan (k1451_s4_scan.ts) on master's windows (clip) and this stage's (over) at three fades, on the
# scenes whose windows differ (k1451_s4_wdump.ts: the other eight have identical tables, so identical finds).
#   pwsh -NoProfile -File .claude/probes/K1451/k1451_s4_scanall.ps1 [-Scenes a,b] [-Rules clip,over] [-Fls d,0,1.2] [-Throttle 3]
param([string]$Scenes = "muse_hash,g41_ring_tw64,g41_def_tw64,g41_user_tw64", [string]$Rules = "clip,over", [string]$Fls = "d,0,1.2", [int]$Throttle = 3)
$root = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$out = Join-Path $PSScriptRoot "out/s4scan"; New-Item -ItemType Directory $out -Force | Out-Null
$jobs = foreach ($f in $Fls -split ',') { foreach ($r in $Rules -split ',') { foreach ($s in $Scenes -split ',') { [pscustomobject]@{ f = $f; r = $r; s = $s } } } }
$t0 = Get-Date
$jobs | ForEach-Object -ThrottleLimit $Throttle -Parallel {
  $j = $_; Set-Location $using:root
  $tag = "fl$($j.f)"; $o = Join-Path $using:out "$tag`_$($j.r)_$($j.s)"
  $fl = if ($j.f -eq 'd') { '' } else { $j.f }
  cmd /c "set GF_HOME=1&& set GF_NOCLIP=1&& set K1451_RULE=$($j.r)&& set K1451_FL=$fl&& node scripts/run_node.mjs .claude/probes/K1451/k1451_s4_scan.ts $($j.r) $($j.s) 100 `"$o.json`"" 2>&1 | Out-File -Encoding utf8 "$o.txt"
}
"wall $([int]((Get-Date) - $t0).TotalSeconds) s"
