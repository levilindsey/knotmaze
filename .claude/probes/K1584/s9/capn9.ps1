# K1584 s9: warm the three capture profiles for one build, then capture all 21 mazes into s7/out/<Tag>, each step
# under scripts/perf_lock.ps1 (s7b/warm7.ps1, then s7/cap7.ps1, as the s9a run did). Used for s9n: the no-wedge build,
# HEAD with nowedge.patch applied as an off-branch commit (git commit-tree; never on a branch), so that s9a can be
# compared with a build that draws no wedge anywhere: at a loose-side ball s9a must equal it, at a tight one differ.
#   pwsh -NoProfile -File capn9.ps1 -Ref <sha> [-Port 5633] [-Tag s9n] *> out\run9n.log
param([Parameter(Mandatory)][string]$Ref, [int]$Port = 5633, [string]$Tag = 's9n')
$P = Resolve-Path (Join-Path $PSScriptRoot '..'); $repo = (git -C $PSScriptRoot rev-parse --show-toplevel).Trim()
$lock = Join-Path $repo 'scripts\perf_lock.ps1'
"start $(Get-Date -Format 'HH:mm:ss') ref $Ref tag $Tag port $Port"
pwsh -NoProfile -File $lock -Owner 'claude K1584 s9' -What "s9 warm $Tag" -Cmd "& '$P\s7b\warm7.ps1' -Ref $Ref -Port $Port"
"warm exit $LASTEXITCODE $(Get-Date -Format 'HH:mm:ss')"
pwsh -NoProfile -File $lock -Owner 'claude K1584 s9' -What "s9 captures $Tag" -Cmd "& '$P\s7\cap7.ps1' -Ref $Ref -Port $Port -Tag $Tag"
"cap exit $LASTEXITCODE $(Get-Date -Format 'HH:mm:ss')"
exit 0
