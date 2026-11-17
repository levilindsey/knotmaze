# K1407 c1: the GPU-readback census (K1362's k1362s2_census.ts, GPU pixels against the eval.ts mirror) on the
# 12 scenes in parallel groups, then merged, under the perf lock. Needs the worktree's dev server:
#   npx.cmd vite --config .claude/probes/K1362/k1362s2_vite.config.ts --port 5501 --strictPort --host 127.0.0.1
# Run from the worktree, with no edits in flight (a Vite reload kills the run, K1411):
#   pwsh -NoProfile -File .claude/probes/K1407/k1407c1_gpucensus.ps1 -Tag c1g [-Base http://127.0.0.1:5501/]
param([string]$Tag = 'c1g', [string]$Base = 'http://127.0.0.1:5501/', [string[]]$Groups = @('muse_hash,g41_ring_tw64', 'g41_def_tw64,user_tw42.lightpaper', 'def,g41_user_tw42', 'muse_default_tw,ring', 'g41_def_tw42,g41_user_tw64', 'fat'))
$root = (Resolve-Path "$PSScriptRoot/../../..").Path
Set-Location $root
$lock = Join-Path $env:TEMP 'claude-perf.lock'
$owner = 'K1407 c3 agent (claude session 01SUPGULDxvE5gKXozfaFaFG)'
while ((Test-Path $lock) -and ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes -lt 30) { Start-Sleep 10 }
"$owner $(Get-Date -Format o) GPU census readback (k1407c1_gpucensus.ps1)" | Out-File -Encoding ASCII $lock
try {
  $env:BASE = $Base
  $jobs = for ($i = 0; $i -lt $Groups.Count; $i++) { Start-Job -ScriptBlock { param($r, $t, $g, $b) Set-Location $r; $env:BASE = $b; node scripts/run_node.mjs .claude/probes/K1362/k1362s2_census.ts $t --scene=$g --ppu=160 --min=40 --nolock 2>&1 } -ArgumentList $root, "${Tag}_$i", $Groups[$i], $Base }
  $jobs | Wait-Job | Receive-Job | Select-String -Pattern 'px at|Error|error' | ForEach-Object { $_.Line }
  $tags = 0..($Groups.Count - 1) | ForEach-Object { "${Tag}_$_" }
  node scripts/run_node.mjs .claude/probes/K1362/k1362s2_census.ts $Tag --merge=$($tags -join ',') --ppu=160 --min=40 --nolock
} finally {
  if ((Test-Path $lock) -and (Get-Content $lock -Raw).StartsWith($owner)) { Remove-Item $lock }
}
