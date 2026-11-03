# K1040 S1g step 5: run popattr_s1g.ts under the four form B variants in
# parallel (s1f, near = the d-edge only, rb05 = the root gate only, both),
# each into out/s1g/popattr/<name>.txt.
# Usage: pwsh .claude/probes/K1040/s1/popattr_run_s1g.ps1
$ErrorActionPreference = "Stop"
$wt = "C:/Users/lsl/Repositories/knotmaze/.claude/worktrees/agent-a8056cde26bf07a6a"
$top = (& git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
if ($top -ne $wt) { throw "not in the S1g worktree: $top" }
$out = Join-Path $PSScriptRoot "out\s1g\popattr"
New-Item -ItemType Directory $out -Force | Out-Null
$procs = @()
foreach ($k in @("s1f", "near", "rb05", "both")) {
  $env:VARIANT = $k
  $env:OUT = Join-Path $out "$k.txt"
  $procs += Start-Process -FilePath "npx.cmd" -ArgumentList @("vite-node", ".claude/probes/K1040/s1/popattr_s1g.ts", $out) -WorkingDirectory $wt -NoNewWindow -PassThru -RedirectStandardOutput (Join-Path $out "$k.log") -RedirectStandardError (Join-Path $out "$k.err")
}
Remove-Item Env:VARIANT
Remove-Item Env:OUT
$procs | Wait-Process -Timeout 1200
foreach ($k in @("s1f", "near", "rb05", "both")) { Get-Content (Join-Path $out "$k.txt") -ErrorAction SilentlyContinue; Get-Content (Join-Path $out "$k.err") -ErrorAction SilentlyContinue | Select-Object -First 3 }
