# K1283 s10: run one command under the machine-wide perf lock ($env:TEMP\claude-perf.lock):
# waits for another owner inside this one call (a lock older than 30 min is stale), takes it,
# runs the command, deletes it.
#   pwsh .claude/probes/K1240/proto/k1283s10_lock.ps1 -What "<label>" -Cmd { <script block> }
param([Parameter(Mandatory = $true)][string]$What, [Parameter(Mandatory = $true)][scriptblock]$Cmd)
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1283 s10 agent (worktree-agent-a1be9abe643f43725)"
$deadline = (Get-Date).AddMinutes(20)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 20 min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 10
}
"$owner, $(Get-Date -Format s), $What" | Out-File -Encoding ASCII $lock
try { & $Cmd } finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
