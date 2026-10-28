# build_pool.ps1: build commits into a round's pool, <Round>\pool\<sha>\ (scripts/preview.ps1 -Ref -Root -BuildOnly, about 3 s each).
# A commit that is already in the pool is skipped, so a later pass or round reuses it (copy a folder into another round's pool to
# share a build). Sequential: preview.ps1's temporary worktrees share the repo. Each build's output goes to <Round>\logs\build_<sha>.log.
# The scripts of the checkout this file sits in are used (the repo root is two folders up), so a worktree builds its own history.
#
# Call:  pwsh -NoProfile -File scripts/phone_pass/build_pool.ps1 -Round <round dir> -Refs <ref>,<ref>,...
#   -Round   the round folder (untracked, .claude/probes/rounds/<name>); its pool\ and logs\ are created if absent
#   -Refs    comma-separated commits (shas or refs)
#   -Pool    the pool folder, when it is not <Round>\pool
# Safe to run while a pass measures on the phone (a build is a desktop task); a pass never starts one itself.
param([Parameter(Mandatory)][string]$Round, [Parameter(Mandatory)][string]$Refs, [string]$Pool = "")
$repo = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
if (-not $Pool) { $Pool = Join-Path $Round "pool" }
$logs = Join-Path $Round "logs"
New-Item -ItemType Directory -Force $Pool, $logs | Out-Null
foreach ($r in ($Refs -split ",")) {
  $short = (git -C $repo rev-parse --short $r).Trim()
  $dest = Join-Path $Pool $short
  if (Test-Path (Join-Path $dest "index.html")) { Write-Output ("{0} {1} already in pool" -f (Get-Date -Format HH:mm:ss), $short); continue }
  Write-Output ("{0} building {1}" -f (Get-Date -Format HH:mm:ss), $short)
  & pwsh -NoProfile -File (Join-Path $repo "scripts\preview.ps1") -Ref $r -Root $Pool -BuildOnly *> (Join-Path $logs "build_$short.log")
  Write-Output ("{0} built {1} exit {2} index {3}" -f (Get-Date -Format HH:mm:ss), $short, $LASTEXITCODE, (Test-Path (Join-Path $dest "index.html")))
}
Write-Output ("{0} pool done" -f (Get-Date -Format HH:mm:ss))
