# K268 proof stage: the desktop census under the perf lock.
#   pwsh -File run_census.ps1 -Base http://localhost:5871 [-Out <dir>] [-Moves 10]
#        [-Extra '&cam=follow' | none] [-Proof '2.5:fade,2.5:beacon'] [-ProofOnly]
# Defaults are the brief's recipe: WALK=new EXTRA=&cam=follow
# PROOF=2.5:fade,2.5:beacon ONES=shaped PROOF_IMG=1, 10 moves (31 checks).
# -ProofOnly runs the PROOF sweep and visitAll right after the mode-on checks
# (8 checks); -Proof '' runs census3a's default 11-entry sweep. Run it from
# the checkout root; the log goes to <Out>.log.
param(
  [string]$Base = 'http://localhost:5871',
  [string]$Out = '.claude/probes/K268/proof/out/full_m10',
  [string]$Moves = '10',
  [string]$Extra = '&cam=follow',
  [string]$Proof = '2.5:fade,2.5:beacon',
  [switch]$ProofOnly
)
$here = $PSScriptRoot
pwsh -NoProfile -File (Join-Path $here 'lock_take.ps1') -Owner 'K268 proof' -What "desktop census3a m$Moves $(if ($ProofOnly) { 'PROOF_ONLY' })" -MaxWaitMin 30
if ($LASTEXITCODE -ne 0) { 'LOCK FAIL'; exit 1 }
$env:WALK = 'new'; $env:ONES = 'shaped'; $env:PROOF_IMG = '1'
if ($Extra -eq 'none') { Remove-Item Env:EXTRA -ErrorAction SilentlyContinue } else { $env:EXTRA = $Extra }
if ($Proof) { $env:PROOF = $Proof } else { Remove-Item Env:PROOF -ErrorAction SilentlyContinue }
if ($ProofOnly) { $env:PROOF_ONLY = '1' } else { Remove-Item Env:PROOF_ONLY -ErrorAction SilentlyContinue }
Remove-Item Env:PROOF_SLOT -ErrorAction SilentlyContinue
$t = Get-Date
try {
  node (Join-Path $here 'census3a.mjs') $Base $Out $Moves 2>&1 | Tee-Object -FilePath "$Out.log"
} finally {
  "elapsed=$(((Get-Date) - $t).TotalSeconds)"
  pwsh -NoProfile -File (Join-Path $here 'lock_release.ps1') -Owner 'K268 proof'
}
