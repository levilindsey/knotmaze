# K1436 (from K1451's k1451_scanall.ps1): the v2 bar test over the 12 census scenes on the working tree's GfEval, with
# v1's tally on the same raster. Prints v1 beside v2 per kind:class, both totals and the tie / ramp sums, and the wall time.
#   pwsh -NoProfile -File .claude/probes/K1436/k1436_scanall.ps1 [-HomeOn 1|""] [-Ppu 100] [-Tag scan_h1] [-Throttle 12]
# Writes out/<Tag>/<scene>.json (k1451_cls.ts reads them) and .txt. Wait on $env:TEMP\claude-perf.lock first.
param([string]$Scenes = "", [int]$Ppu = 100, [int]$Throttle = 12, [string]$Tag = "scan", [string]$HomeOn = "1", [string]$Ev = "src")
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$out = Join-Path $PSScriptRoot "out/$Tag"
New-Item -ItemType Directory $out -Force | Out-Null
$all = "muse_hash", "g41_def_tw42", "g41_ring_tw64", "user_tw42.lightpaper", "def", "fat", "g41_def_tw64", "g41_user_tw42", "muse_default_tw", "ring", "g41_ring_tw42", "g41_user_tw64"
$sc = if ($Scenes) { $Scenes -split ',' } else { $all }
$t0 = Get-Date
$sc | ForEach-Object -ThrottleLimit $Throttle -Parallel {
  $s = $_; Set-Location $using:root
  $o = Join-Path $using:out $s
  cmd /c "set GF_HOME=$($using:HomeOn)&& set K1436_EV=$($using:Ev)&& node scripts/run_node.mjs .claude/probes/K1436/k1436_scan.ts $($using:Tag) $s $($using:Ppu) `"$o.json`"" 2>&1 | Out-File -Encoding utf8 "$o.txt"
}
$sec = [int]((Get-Date) - $t0).TotalSeconds
$t1 = @{}; $t2 = @{}; $ms = 0
foreach ($f in Get-ChildItem (Join-Path $out "*.json")) { $j = Get-Content $f -Raw | ConvertFrom-Json; foreach ($p in $j.cnt1.PSObject.Properties) { $t1[$p.Name] = [int]$t1[$p.Name] + $p.Value }; foreach ($p in $j.cnt.PSObject.Properties) { $t2[$p.Name] = [int]$t2[$p.Name] + $p.Value }; $ms += $j.ms.raster + $j.ms.v1 + $j.ms.v2 }
$sum = { param($t, $pat) [int](($t.GetEnumerator() | Where-Object { $_.Key -like $pat } | Measure-Object Value -Sum).Sum) }
"$Tag (GF_HOME=$HomeOn, ppu $Ppu): wall $sec s, cpu $([int]($ms / 1000)) s"
foreach ($c in "tie", "ramp", "thru", "plain") { "  $c`tv1 $(& $sum $t1 "*:$c")`tv2 $(& $sum $t2 "*:$c")" }
"  all`tv1 $(& $sum $t1 '*')`tv2 $(& $sum $t2 '*')"
"  v1: " + (($t1.GetEnumerator() | Sort-Object Key | ForEach-Object { "$($_.Key) $($_.Value)" }) -join ', ')
"  v2: " + (($t2.GetEnumerator() | Sort-Object Key | ForEach-Object { "$($_.Key) $($_.Value)" }) -join ', ')
