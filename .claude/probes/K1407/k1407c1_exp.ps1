# K1407 c1: render the c1 spot list's crops into out/c1/<tag> and two half sheets
# (before gf | <tag> gf | before fb | before ol). CPU only. Env toggles pass through.
#   pwsh .claude/probes/K1407/k1407c1_exp.ps1 <tag> [spots]
param([string]$Tag, [string]$Spots = '')
$ErrorActionPreference = 'Stop'
Set-Location (Resolve-Path "$PSScriptRoot/../../..")
$all = 'muse_default_tw:24.50:10.58,g41_def_tw64:19.60:30.87,muse_hash:5.53:14.97,muse_hash:5.88:8.50,muse_hash:19.41:14.16,muse_hash:29.74:20.26,muse_default_tw:22.90:2.44,muse_default_tw:22.42:2.92,muse_default_tw:24.05:10.43,def:19.96:30.66,def:19.71:30.93,g41_def_tw64:31.05:12.20,g41_def_tw64:19.96:30.53,g41_user_tw64:9.13:18.25,g41_user_tw64:8.73:18.59,muse_hash:22.56:34.84'
if (-not $Spots) { $Spots = $all }
$out = ".claude/probes/K1407/out/c1/$Tag"
node scripts/run_node.mjs .claude/probes/K1407/k1407_crops.ts $out $Spots | Out-Null
$bases = $Spots.Split(',') | ForEach-Object { $p = $_.Split(':'); '{0}_{1:F2}_{2:F2}' -f $p[0], [double]$p[1], [double]$p[2] }
$d = '.claude/probes/K1407/out/c1/before'
$cols = "${d}:gf,${out}:gf,${d}:fb,${d}:ol"
for ($i = 0; $i -lt $bases.Count; $i += 8) {
  $chunk = ($bases[$i..([Math]::Min($i + 7, $bases.Count - 1))]) -join ','
  node scripts/run_node.mjs .claude/probes/K1407/k1407_sheet_half.ts ".claude/probes/K1407/out/c1/${Tag}_$($i / 8).png" $cols $chunk
}
