# K1314 s9: censuses of a few scenes under several EXP9 variants, in parallel, under the perf lock (waits for
# another owner's lock inside this call; a lock older than 30 min is stale). Tags: s9<variant>.
#   pwsh .claude/probes/K1314/k1314_s9_var.ps1 -Variants v4,v1 -Scenes muse_hash
param([Parameter(Mandatory = $true)][string]$Variants, [string]$Scenes = "muse_hash", [int]$WaitMin = 60)
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1314 s9 agent (worktree-agent-a88e9bc054f3e16da) variants"
$deadline = (Get-Date).AddMinutes($WaitMin)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after $WaitMin min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), census variants $Variants on $Scenes" | Out-File -Encoding ASCII $lock
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
try {
  $jobs = foreach ($v in $Variants.Split(",")) {
    Start-Job -ArgumentList $root, $v, $Scenes, $owner -ScriptBlock {
      param($root, $v, $sc, $own)
      Set-Location $root; $env:EXP9 = $(if ($v -eq "base") { "" } else { $v }); $env:K1314_LOCK_OWNER = $own
      & node scripts/run_node.mjs .claude/probes/K1314/k1314_census.ts "s9$v" "--scene=$sc" --ppu=160 --min=40 2>&1 | Select-Object -Last 6
    }
  }
  $jobs | Wait-Job | Receive-Job
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
