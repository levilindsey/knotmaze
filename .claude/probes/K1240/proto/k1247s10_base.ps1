# K1247 s10 step 0 (K1263): the baselines on the outline as it stands (run it on
# master's, before any change), then k1247c_final.ps1 against them (verify reads 0).
#   & .claude/probes/K1240/proto/k1247s10_base.ps1 [-Sub s10base]
# Writes verify's tables to out/<Sub>/ and the rows to out/k1247/<Sub>/; logs in
# out/k1247s10_base/. Exits with k1247c_final.ps1's code.
param([string]$Sub = "s10base")
$ErrorActionPreference = "Continue"
$root = (Resolve-Path (Join-Path $PSScriptRoot "../../../..")).Path
Set-Location $root
$p = ".claude/probes/K1240/proto"
$log = ".claude/probes/K1240/out/k1247s10_base"
New-Item -ItemType Directory $log -Force | Out-Null
"start $(Get-Date -Format s) $(git rev-parse --short HEAD) $(git status --porcelain $p/outline.ts)" | Out-File "$log/index.txt" -Encoding ascii
foreach ($step in @(
    @("dump", @("$p/k1247c_dump.ts", $Sub)),
    @("rows_still", @("$p/k1247_exact.ts", "--out=$Sub")),
    @("rows_0.1", @("$p/k1247_exact.ts", "--out=$Sub", "--move=0.1")),
    @("rows_0.5", @("$p/k1247_exact.ts", "--out=$Sub", "--move=0.5")))) {
  $t = Get-Date
  & node scripts/run_node.mjs @($step[1]) *> "$log/$($step[0]).txt"
  "$($step[0]) exit $LASTEXITCODE $([int]((Get-Date) - $t).TotalSeconds)s" | Tee-Object -FilePath "$log/index.txt" -Append
}
& "$p/k1247c_final.ps1" -Base "out/k1247/$Sub" -Tables $Sub -Out "${Sub}_final"
$code = $LASTEXITCODE
"final exit $code; end $(Get-Date -Format s)" | Tee-Object -FilePath "$log/index.txt" -Append
exit $code
