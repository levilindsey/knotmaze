# K90 fold census runner: scripts/fold_census.ts over a jobs file, one node
# process per job, at most -Parallel at a time; the rows are concatenated
# into -Out (JSONL), each job's log and errors kept in <Out>.parts/.
#   pwsh scripts/fold_census.ps1 -Jobs <jobs.json> -Out <out.jsonl> [-Parallel 10] [-Src <checkout>]
# -Src measures another checkout's src/ (default: this one); the fold
# definition is always this checkout's src/geometry/bend_radius.ts.
# Make the jobs with `node scripts/fold_census.mjs jobs <jobs.json>` and the
# tables with `node scripts/fold_census.mjs report <out.jsonl>`.
# Holds the machine-wide perf lock while it runs (CPU load spoils other
# agents' timings; claude-config rules/sessions.md) and refuses to start
# while another owner's fresh lock exists.
param(
  [Parameter(Mandatory = $true)][string]$Jobs,
  [Parameter(Mandatory = $true)][string]$Out,
  [int]$Parallel = 10,
  [string]$Src = ""
)
$wt = (Resolve-Path "$PSScriptRoot\..").Path
if ($Src -eq "") { $Src = $wt }
$Src = (Resolve-Path $Src).Path
$Jobs = (Resolve-Path $Jobs).Path
$Out = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Out)
$lock = Join-Path $env:TEMP "claude-perf.lock"
if (Test-Path $lock) {
  $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes
  $who = Get-Content $lock -Raw
  if ($age -lt 30 -and $who -notmatch "^K90 ") { throw "perf lock held ($([int]$age) min): $who" }
}
"K90 fold census $((Get-Date).ToString('s')) (CPU load, $Parallel processes): $Jobs" | Out-File -Encoding ascii -NoNewline $lock
try {
  $n = (Get-Content $Jobs -Raw | ConvertFrom-Json).Count
  $dir = "$Out.parts"
  New-Item -ItemType Directory -Force $dir | Out-Null
  $procs = @()
  # Keep the lock fresh (others treat a lock older than 30 min as stale).
  $touch = { if ((Test-Path $lock) -and ((Get-Content $lock -Raw) -match "^K90 ")) { (Get-Item $lock).LastWriteTime = Get-Date } }
  for ($i = 0; $i -lt $n; $i++) {
    while (@($procs | Where-Object { -not $_.HasExited }).Count -ge $Parallel) { Start-Sleep -Milliseconds 500; & $touch }
    $part = "$dir\$i.jsonl"
    if (Test-Path $part) { [System.IO.File]::Delete($part) }
    $nodeArgs = @(
      "`"$wt\scripts\run_node.mjs`"", "--config", "`"$wt\scripts\fold_census.vite.config.mjs`"",
      "`"$wt\scripts\fold_census.ts`"", "`"$Src`"", "`"$Jobs`"", "`"$part`"", "$i", "$($i + 1)"
    )
    $procs += Start-Process -FilePath "C:\Program Files\nodejs\node.exe" -WorkingDirectory $wt -ArgumentList $nodeArgs `
      -NoNewWindow -PassThru -RedirectStandardOutput "$part.log" -RedirectStandardError "$part.err"
  }
  while (@($procs | Where-Object { -not $_.HasExited }).Count -gt 0) { Start-Sleep -Seconds 2; & $touch }
  if (Test-Path $Out) { [System.IO.File]::Delete($Out) }
  for ($i = 0; $i -lt $n; $i++) {
    $part = "$dir\$i.jsonl"
    if (Test-Path $part) { [System.IO.File]::AppendAllText($Out, [System.IO.File]::ReadAllText($part)) }
    $err = Get-Content "$part.err" -ErrorAction SilentlyContinue | Select-Object -First 3
    if ($err) { "ERR job ${i}: " + ($err -join " | ") }
  }
  "rows: " + ((Get-Content $Out -ErrorAction SilentlyContinue) | Measure-Object -Line).Lines + " / $n"
} finally {
  if ((Test-Path $lock) -and ((Get-Content $lock -Raw) -match "^K90 ")) { [System.IO.File]::Delete($lock) }
}
