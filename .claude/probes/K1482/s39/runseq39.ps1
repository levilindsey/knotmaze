# K1482 s39: run capseq39.ps1 for the given mazes under the perf lock, whole output to out/s39/<name>.log
#   pwsh runseq39.ps1 -Name seq1 -Mazes A_4,A_6 [-Fill] [-Off] [-What text]
param([string]$Name, [string[]]$Mazes, [switch]$Fill, [switch]$Off, [string]$What = "border captures", [string]$Pairs = "6320=m,6321=c,6320=m2,6321=c2")
$here = $PSScriptRoot; $repo = (git -C $here rev-parse --show-toplevel).Trim()
$Mazes = @($Mazes | ForEach-Object { $_ -split ',' } | Where-Object { $_ })
$ms = ($Mazes | ForEach-Object { "'$_'" }) -join ','
$ps = (($Pairs -split ',') | ForEach-Object { "'$_'" }) -join ','
$extra = $(if ($Fill) { " -Fill" } else { "" }) + $(if ($Off) { " -Off" } else { "" })
$cmd = "& '$here\capseq39.ps1' -Pairs $ps -Mazes $ms$extra"
$log = Join-Path $repo ".claude/probes/K1482/out/s39/$Name.log"
& pwsh -NoProfile -File (Join-Path $repo "scripts/perf_lock.ps1") -Owner "claude K1482 s39" -What "$What $($Mazes -join ' ')" -Cmd $cmd *>&1 | Tee-Object -FilePath $log
"RUNDONE $Name $(Get-Date -Format HH:mm:ss)" | Tee-Object -Append -FilePath $log
