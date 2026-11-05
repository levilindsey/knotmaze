# K1139: run a batch of probe commands under the machine-wide perf lock
# ($env:TEMP\claude-perf.lock, ~/.claude/rules/sessions.md). Waits inside
# this one call (a lock older than 30 min is stale), takes the lock with an
# atomic create, runs each non-empty, non-# line of -Batch from this folder,
# and deletes the lock only if it still names this owner exactly.
#   pwsh -File run_locked.ps1 -Batch <file> [-What <text>] [-MaxWaitMin 60]
param(
  [Parameter(Mandatory = $true)][string]$Batch,
  [string]$What = "K1186 run B flips",
  [int]$MaxWaitMin = 60
)
$ErrorActionPreference = "Continue"
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1186-19B"
$here = $PSScriptRoot
$t0 = Get-Date
$line = ""
while ($true) {
  if (Test-Path -LiteralPath $lock) {
    $age = ((Get-Date) - (Get-Item -LiteralPath $lock).LastWriteTime).TotalMinutes
    $held = (Get-Content -LiteralPath $lock -ErrorAction SilentlyContinue) -join " "
    if ($age -gt 30) {
      Write-Output "stale lock ($([math]::Round($age,1)) min): $held - removing"
      try { [System.IO.File]::Delete($lock) } catch {}
      continue
    }
    if (((Get-Date) - $t0).TotalMinutes -gt $MaxWaitMin) { Write-Output "gave up waiting on: $held"; exit 2 }
    Start-Sleep -Seconds 10
    continue
  }
  $line = "$owner | $((Get-Date).ToString('yyyy-MM-ddTHH:mm:sszzz')) | $What"
  try {
    $fs = [System.IO.File]::Open($lock, [System.IO.FileMode]::CreateNew, [System.IO.FileAccess]::Write)
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($line)
    $fs.Write($bytes, 0, $bytes.Length)
    $fs.Close()
    break
  } catch {
    Start-Sleep -Seconds 2
  }
}
Write-Output "lock taken after $([math]::Round(((Get-Date) - $t0).TotalMinutes,1)) min: $line"
$code = 0
try {
  Push-Location $here
  foreach ($cmd in Get-Content -LiteralPath (Join-Path $here $Batch)) {
    if (-not $cmd.Trim() -or $cmd.Trim().StartsWith("#")) { continue }
    Write-Output ">> $cmd  ($(Get-Date -Format HH:mm:ss))"
    # A line that runs no native command ($env:X = ..., a cmdlet) leaves
    # $LASTEXITCODE as it was, so a stale non-zero (or $null) read as a
    # failure: reset it before each line, and read the global one.
    $global:LASTEXITCODE = 0
    Invoke-Expression $cmd
    if ($global:LASTEXITCODE -ne 0) { Write-Output "!! exit $global:LASTEXITCODE"; $code = 1 }
  }
} finally {
  Pop-Location
  $now = (Get-Content -LiteralPath $lock -ErrorAction SilentlyContinue) -join " "
  if ($now -eq $line) { [System.IO.File]::Delete($lock); Write-Output "lock released ($(Get-Date -Format HH:mm:ss))" }
  else { Write-Output "lock not ours any more: '$now'" }
}
exit $code
