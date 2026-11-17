# K1449 (from k1438_scanall.ps1): K1433's scan over census scenes for several variants, in parallel. Run it under the
# perf lock (k1449_locked.ps1). Variant names: off (switch off), or <map>_<fl> with home on: map = src | base | zt | ctr
# (k1449_ev.ts's K1449_MAP), fl = fadeLength ("d" = the default). E.g. src_d, src_0, src_1.2, ctr_d.
#   pwsh -NoProfile -File .claude/probes/K1449/k1449_scanall.ps1 -Variants src_d,ctr_d [-Scenes a,b] [-Tag scan]
param([string]$Variants = "off,src_d", [string]$Scenes = "", [int]$Ppu = 100, [int]$Throttle = 12, [string]$Tag = "scan")
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$out = Join-Path $PSScriptRoot "out/$Tag"
New-Item -ItemType Directory $out -Force | Out-Null
$all = "muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"
$sc = if ($Scenes) { $Scenes -split ',' } else { $all }
$work = foreach ($v in ($Variants -split ',')) { foreach ($s in $sc) { [pscustomobject]@{ v = $v; s = $s } } }
$t0 = Get-Date
$work | ForEach-Object -ThrottleLimit $Throttle -Parallel {
  $v = $_.v; $s = $_.s
  Set-Location $using:root
  # env per child through cmd's set ($env: is process-wide across parallel runspaces)
  if ($v -eq "off") { $e = "set GF_HOME=&& set K1438_EV=&& set K1438_FL=&& set K1449_MAP=" }
  elseif ($v -match '^(\w+)_(.+)$') { $fl = if ($Matches[2] -eq 'd') { '' } else { $Matches[2] }; $e = "set GF_HOME=1&& set K1438_EV=&& set K1438_FL=$fl&& set K1449_MAP=$($Matches[1])" }
  else { throw "variant $v" }
  $o = Join-Path $using:out "$($v)_$($s)"
  cmd /c "$e&& node scripts/run_node.mjs .claude/probes/K1449/k1449_scan.ts $v $s $($using:Ppu) `"$o.json`"" 2>&1 | Out-File -Encoding utf8 "$o.txt"
}
Write-Host "scan done in $([int]((Get-Date) - $t0).TotalSeconds) s"
