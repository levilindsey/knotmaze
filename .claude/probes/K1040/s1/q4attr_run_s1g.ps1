# K1040 S1g step 5: run q4attr_s1g.ts on muse_hash under four form B
# definitions (S1f's final on these two changes, the d-edge only, the root
# gate only, both = S1g's default), each into out/s1g/q4attr/<name>/.
# Usage: pwsh .claude/probes/K1040/s1/q4attr_run_s1g.ps1
$ErrorActionPreference = "Stop"
$wt = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a"
$top = (& git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
if ($top -ne $wt) { throw "not in the S1g worktree: $top" }
$out = Join-Path $PSScriptRoot "out\s1g\q4attr"
New-Item -ItemType Directory $out -Force | Out-Null
$variants = [ordered]@{
  "s1f"  = '{"dEdge":"skip","rootBand":0}'
  "near" = '{"rootBand":0}'
  "rb05" = '{"dEdge":"skip"}'
  "both" = '{}'
}
$procs = @()
foreach ($k in $variants.Keys) {
  $env:PARAMS = $variants[$k]
  $env:OUT = Join-Path $out $k
  $procs += Start-Process -FilePath "npx.cmd" -ArgumentList @("vite-node", ".claude/probes/K1040/s1/q4attr_s1g.ts", "muse_hash") -WorkingDirectory $wt -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $out "$k.txt") -RedirectStandardError (Join-Path $out "$k.err")
}
Remove-Item Env:PARAMS
Remove-Item Env:OUT
$procs | Wait-Process -Timeout 1200
foreach ($k in $variants.Keys) { "== $k"; Get-Content (Join-Path $out "$k.txt") | Select-String -Pattern "muse_hash|>0.5|> 0.5" | Select-Object -First 6 | ForEach-Object { $_.Line } }
