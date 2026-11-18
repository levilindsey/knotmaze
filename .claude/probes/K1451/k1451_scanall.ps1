# K1451 (from k1449_scanall.ps1): K1433's scan over the 12 census scenes, home on at the default fade, for tie-window
# variants (k1451_sev.ts's K1451_F: the window as a fraction of zt; "src" = no override). Prints the kind:class tally.
#   pwsh -NoProfile -File .claude/probes/K1451/k1451_scanall.ps1 -Variants src,0.5 [-Tag scan] [-Fl ""]
param([string]$Variants = "src", [string]$Scenes = "", [int]$Ppu = 100, [int]$Throttle = 12, [string]$Tag = "scan", [string]$Fl = "", [string]$HomeOn = "1")
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
  $f = if ($v -eq "src") { "" } elseif ($v -like "dz*") { $v.Substring(2) } else { $v }; $m = if ($v -like "dz*") { "dz" } else { "" }; $cf = if ($v -like "cfg*") { $v.Substring(3) } else { "" }; if ($cf) { $f = "" }; $wn = if ($v -like "win*") { $v.Substring(3) } elseif ($v -like "rch*") { $v.Substring(3) } elseif ($v -like "rck*") { $v.Substring(3) } elseif ($v -like "snk*") { $v.Substring(3) } else { "" }; if ($wn) { $f = "" }; $wm = if ($v -like "rc[hk]*") { "reach" } elseif ($v -like "snk*") { "sin" } else { "" }; $wkk = if ($v -like "rck*" -or $v -like "snk*") { "1" } else { "" }
  $e = "set GF_HOME=$($using:HomeOn)&& set K1438_FL=$($using:Fl)&& set K1451_F=$f&& set K1451_MODE=$m&& set K1451_CFG=$cf&& set K1451_WIN=$wn&& set K1451_WINM=$wm&& set K1451_WINK=$wkk"
  $o = Join-Path $using:out "$($v)_$($s)"
  cmd /c "$e&& node scripts/run_node.mjs .claude/probes/K1451/k1451_scan.ts $v $s $($using:Ppu) `"$o.json`"" 2>&1 | Out-File -Encoding utf8 "$o.txt"
}
Write-Host "scan done in $([int]((Get-Date) - $t0).TotalSeconds) s"
foreach ($v in ($Variants -split ',')) {
  $t = @{}; $tot = 0
  foreach ($f in Get-ChildItem (Join-Path $out "$($v)_*.json")) { $j = Get-Content $f -Raw | ConvertFrom-Json; foreach ($p in $j.cnt.PSObject.Properties) { $t[$p.Name] = [int]$t[$p.Name] + $p.Value; $tot += $p.Value } }
  $tie = ($t.GetEnumerator() | Where-Object { $_.Key -like '*:tie' } | Measure-Object Value -Sum).Sum
  $ramp = ($t.GetEnumerator() | Where-Object { $_.Key -like '*:ramp' } | Measure-Object Value -Sum).Sum
  "$v`tall $tot`ttie $tie`tramp $ramp`t" + (($t.GetEnumerator() | Sort-Object Key | ForEach-Object { "$($_.Key) $($_.Value)" }) -join ', ')
}
