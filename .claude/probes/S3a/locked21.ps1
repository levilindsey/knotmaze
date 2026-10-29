param([Parameter(Mandatory = $true)][string]$What, [Parameter(Mandatory = $true)][string]$Cmd)
# K992 s3 (copied from K1000's locked19.ps1): run one TIMING command under the machine-wide perf lock
# ($env:TEMP\claude-perf.lock, one line: owner, start time, what). Waits
# inside this one call while another owner holds a lock no older than 30
# min, then writes ours, runs $Cmd from the worktree and deletes the lock if
# it is still ours.
#   pwsh .claude/probes/S3a/locked21.ps1 -What "<what>" -Cmd "node ..."
$wt = "C:\Users\lsl\Repositories\knotmaze\.claude\worktrees\k992-corners"
$lockPath = "$env:TEMP\claude-perf.lock"
$owner = "K992 s3 agent"
$deadline = (Get-Date).AddMinutes(120)  # K1000: S3a8a may hold its lock; only a 60-min-old lock is stale
while ((Test-Path $lockPath) -and (Get-Date) -lt $deadline) {
  $held = Get-Content $lockPath -ErrorAction SilentlyContinue
  if ($held -like "$owner*") { break }
  $age = ((Get-Date) - (Get-Item $lockPath).LastWriteTime).TotalMinutes
  if ($age -gt 60) { break }
  Start-Sleep -Seconds 5
}
"$owner, $(Get-Date -Format s), $What" | Out-File -Encoding ascii $lockPath
try {
  Set-Location $wt
  Write-Output "lock taken $(Get-Date -Format HH:mm:ss): $What"
  Invoke-Expression $Cmd
} finally {
  if ((Test-Path $lockPath) -and ((Get-Content $lockPath) -like "$owner*")) { [System.IO.File]::Delete($lockPath) }
  Write-Output "lock released $(Get-Date -Format HH:mm:ss)"
}
exit 0

