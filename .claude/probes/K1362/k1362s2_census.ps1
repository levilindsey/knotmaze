# K1362 s2: the GPU-readback census (k1362s2_census.ts) on the 12 scenes in parallel groups, then merged,
# under the perf lock (a pixel-exact GPU probe). Needs the worktree's dev server on $env:BASE
# (default http://127.0.0.1:5371/; k1362s2_vite.config.ts). Run from the worktree:
#   pwsh .claude/probes/K1362/k1362s2_census.ps1 -Tag g [-Groups 'a,b','c'] [-Extra smoke]
param([string]$Tag = 'g', [string[]]$Groups = @('muse_hash,g41_ring_tw64', 'g41_def_tw64,user_tw42.lightpaper', 'def,g41_user_tw42', 'muse_default_tw,ring', 'g41_def_tw42,g41_user_tw64', 'fat'), [string]$Extra = '')
$root = (Get-Location).Path
$lock = Join-Path $env:TEMP 'claude-perf.lock'
$owner = 'K1362 s2 agent (claude session 01SUPGULDxvE5gKXozfaFaFG)'
while ((Test-Path $lock) -and ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes -lt 30) { Start-Sleep 10 }
"$owner $(Get-Date -Format o) GPU census readback (k1362s2_census.ps1)" | Out-File -Encoding ASCII $lock
try {
  $jobs = for ($i = 0; $i -lt $Groups.Count; $i++) { Start-Job -ScriptBlock { param($r, $t, $g) Set-Location $r; node scripts/run_node.mjs .claude/probes/K1362/k1362s2_census.ts $t --scene=$g --ppu=160 --min=40 --nolock 2>&1 } -ArgumentList $root, "${Tag}_$i", $Groups[$i] }
  $jobs | Wait-Job | Receive-Job | Select-String -Pattern 'px at|Error|error' | ForEach-Object { $_.Line }
  $tags = (0..($Groups.Count - 1) | ForEach-Object { "${Tag}_$_" }) + @($Extra | Where-Object { $_ })
  node scripts/run_node.mjs .claude/probes/K1362/k1362s2_census.ts $Tag --merge=$($tags -join ',') --ppu=160 --min=40 --nolock
} finally {
  if ((Test-Path $lock) -and (Get-Content $lock -Raw).StartsWith($owner)) { Remove-Item $lock }
}
