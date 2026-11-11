# K1283 s6 (copy of k1283s5_sweep.ps1, own out dir): stage 4's stray-ink sweep in one run. Every junction with an end arm (k1283s4_sweep.ts), scored by
# k1283s4_crops.ts --err --noimg --ppu=100 (before = stage 3, 9963d239), in three groups as stage 4 ran it.
# Summary per group: |ink - form B| before / after summed, and the spots where after is off form B by more
# than before on > 20 px (stage 4 at master: def/user/ring 9 spots, muse_hash 33).
#   pwsh .claude/probes/K1240/proto/k1283s6_sweep.ps1 <tag>      (writes out/k1283s6/sweep/sweep_<tag>_<group>.txt)
param([string]$Tag = 'cur')
$root = (Resolve-Path (Join-Path $PSScriptRoot '../../../..')).Path
Set-Location $root
$p = '.claude/probes/K1240/proto'; $cfg = "$p/k1283_vite.config.mjs"; $o = '.claude/probes/K1240/out/k1283s6/sweep'
New-Item -ItemType Directory -Force $o | Out-Null
$groups = [ordered]@{ def = @('def'); muse_hash = @('muse_hash'); user_ring = @('g41_user_tw64', 'ring', 'g41_ring_tw42') }
foreach ($g in $groups.Keys) {
  $specs = @(node scripts/run_node.mjs --config $cfg "$p/k1283s4_sweep.ts" @($groups[$g]) | Where-Object { $_ -match '^\S+:[-\d.]+:[-\d.]+:j\d+$' })
  $png = Join-Path $env:TEMP "k1283s6_sw_${Tag}_$g.png"
  node scripts/run_node.mjs --config $cfg "$p/k1283s4_crops.ts" $png @specs --err --noimg --ppu=100 > "$o/sweep_${Tag}_$g.txt" 2>&1
}
foreach ($g in $groups.Keys) {
  $b = 0; $a = 0; $worse = @()
  foreach ($l in Get-Content "$o/sweep_${Tag}_$g.txt") {
    if ($l -match '^(j\d+) (\S+) \(([-\d.]+), ([-\d.]+)\): \|ink - form B\| before (\d+) after (\d+); after off form B by 0.2 more than before on (\d+) px') {
      $b += [int]$Matches[5]; $a += [int]$Matches[6]; if ([int]$Matches[7] -gt 20) { $worse += "$($Matches[2]) $($Matches[1]) +$($Matches[7])" }
    }
  }
  "${g}: before $b after $a; worse than before on > 20 px: $($worse.Count): $($worse -join ', ')"
}