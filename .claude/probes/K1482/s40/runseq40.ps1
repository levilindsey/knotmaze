# K1482 s40: run capseq40.ps1 for the given mazes under the perf lock, whole output to out/s40/<name>.log
#   pwsh runseq39.ps1 -Name seq1 -Mazes A_4,A_6 [-Fill] [-Off] [-Scene] [-What text]
param([string]$Name, [string[]]$Mazes, [switch]$Fill, [switch]$Off, [switch]$Scene, [string]$What = "border captures", [string]$Pairs = "6340=m,6341=c,6340=m2,6341=c2")
$here = $PSScriptRoot; $repo = (git -C $here rev-parse --show-toplevel).Trim()
$Mazes = @($Mazes | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$ms = ($Mazes | ForEach-Object { "'$_'" }) -join ','
$ps = (($Pairs -split ',') | ForEach-Object { "'$_'" }) -join ','
$extra = $(if ($Fill) { " -Fill" } else { "" }) + $(if ($Off) { " -Off" } else { "" }) + $(if ($Scene) { " -Scene" } else { "" })
$cmd = "& '$here\capseq40.ps1' -Pairs $ps -Mazes $ms$extra"
$log = Join-Path $repo ".claude/probes/K1482/out/s40/$Name.log"
& pwsh -NoProfile -File (Join-Path $repo "scripts/perf_lock.ps1") -Owner "claude K1482 s40" -What "$What $($Mazes -join ' ')" -Cmd $cmd *>&1 | Tee-Object -FilePath $log
"RUNDONE $Name $(Get-Date -Format HH:mm:ss)" | Tee-Object -Append -FilePath $log


