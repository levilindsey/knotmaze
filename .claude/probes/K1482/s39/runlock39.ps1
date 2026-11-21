# K1482 s39: run one script under the perf lock, whole output to out/s39/<Name>.log
#   pwsh runlock39.ps1 -Name src1 -Script src39_run.ps1 -What "item 6 src record"
param([string]$Name, [string]$Script, [string]$What = "s39 capture")
$here = $PSScriptRoot; $repo = (git -C $here rev-parse --show-toplevel).Trim()
$log = Join-Path $repo ".claude/probes/K1482/out/s39/$Name.log"
& pwsh -NoProfile -File (Join-Path $repo "scripts/perf_lock.ps1") -Owner "claude K1482 s39" -What $What -Cmd "& '$(Join-Path $here $Script)'" *>&1 | Tee-Object -FilePath $log
"RUNDONE $Name $(Get-Date -Format HH:mm:ss)" | Tee-Object -Append -FilePath $log
