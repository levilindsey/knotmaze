# K1449: k1449_spots.ts over the 29 spots (K1407 c4) and the brief's named sites for several variants, in parallel,
# then the per-variant FLAG count. Variants: ol (rp=outline), or <name>=<map>_<fl> (map: k1449_ev.ts K1449_MAP;
# fl "d" = the default), e.g. base_0=base_0 new_d=src_d. Panels and logs: out/spots/.
#   pwsh -NoProfile -File .claude/probes/K1449/k1449_spotsall.ps1 -Variants "base_0=base_0,ol"
param([string]$Variants = "ol", [int]$Throttle = 8)
$ErrorActionPreference = "Stop"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../../..")).Path
$out = Join-Path $PSScriptRoot "out/spots"; New-Item -ItemType Directory $out -Force | Out-Null
$spots = (Get-Content (Join-Path $root ".claude/probes/K1407/out/c4/spots.txt") -Raw).Trim()
$named = "muse_hash:31.56:7.41,muse_hash:33.64:9.23,muse_hash:22.09:34.40,muse_hash:34.29:18.93,ring:19.63:20.34,g41_ring_tw64:19.78:20.37,g41_ring_tw64:16.43:2.90,g41_def_tw64:11.21:8.29,def:9.06:6.41,g41_user_tw64:17.80:9.55"
$list = "$spots,$named"
$Variants -split ',' | ForEach-Object -ThrottleLimit $Throttle -Parallel {
  $v = $_; Set-Location $using:root
  if ($v -eq "ol") { $nm = "ol"; $e = "set GF_HOME=&& set K1438_FL=&& set K1449_MAP=" }
  else { $nm, $spec = $v -split '='; if ($spec -notmatch '^(\w+)_(.+)$') { throw "variant $v" }; $fl = if ($Matches[2] -eq 'd') { '' } else { $Matches[2] }; $e = "set GF_HOME=1&& set K1438_EV=&& set K1438_FL=$fl&& set K1449_MAP=$($Matches[1])" }
  cmd /c "$e&& node scripts/run_node.mjs .claude/probes/K1449/k1449_spots.ts $nm $($using:list) `"$($using:out)`"" 2>&1 | Out-File -Encoding utf8 (Join-Path $using:out "spots_$nm.txt")
}
foreach ($v in ($Variants -split ',')) { $nm = ($v -split '=')[0]; $t = Get-Content (Join-Path $out "spots_$nm.txt"); "$nm`tFLAG $(@($t | Select-String 'FLAG').Count)`tclean $(@($t | Select-String 'clean').Count)" }