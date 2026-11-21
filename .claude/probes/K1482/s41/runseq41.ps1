# K1482 s41: run capseq41.ps1 for the given mazes under the perf lock, whole output to out/s41/<name>.log
#   pwsh runseq41.ps1 -Name seq1 -Mazes A_4,A_6 [-Sub raw] [-Fill] [-Off] [-Scene] [-What text]
param([string]$Name, [string[]]$Mazes, [switch]$Fill, [switch]$Off, [switch]$Scene, [string]$What = "border captures", [string]$Pairs = "6360=m,6361=c,6360=m2,6361=c2", [string]$Sub = "raw")
$here = $PSScriptRoot; $repo = (git -C $here rev-parse --show-toplevel).Trim()
$Mazes = @($Mazes | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$ms = ($Mazes | ForEach-Object { "'$_'" }) -join ','
$ps = (($Pairs -split ',') | ForEach-Object { "'$_'" }) -join ','
$extra = $(if ($Fill) { " -Fill" } else { "" }) + $(if ($Off) { " -Off" } else { "" }) + $(if ($Scene) { " -Scene" } else { "" })
$cmd = "& '$here\capseq41.ps1' -Pairs $ps -Mazes $ms -Sub $Sub$extra"
$log = Join-Path $repo ".claude/probes/K1482/out/s41/$Name.log"
& pwsh -NoProfile -File (Join-Path $repo "scripts/perf_lock.ps1") -Owner "claude K1482 s41" -What "$What $($Mazes -join ' ')" -Cmd $cmd *>&1 | Tee-Object -FilePath $log
"RUNDONE $Name $(Get-Date -Format HH:mm:ss)" | Tee-Object -Append -FilePath $log


