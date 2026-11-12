# K1314 s9: one-scene censuses under several experiment settings, in parallel, under the perf lock (waits for
# another owner's lock inside this call; a lock older than 30 min is stale). Each spec is
# tag|scene|EXP9|EXP9J (EXP9: cutFoldsC's chevron variant, "" = none; EXP9J: "off" = no root ramp, a number =
# its length in h, "" = the default); specs are separated by ";". Writes out/s1/census_<tag>.json/.txt.
#   pwsh .claude/probes/K1314/k1314_s9_var.ps1 -Specs "s9v4|muse_hash|v4|off;s9rmp|g41_user_tw64||"
param([Parameter(Mandatory = $true)][string]$Specs, [int]$WaitMin = 60)
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1314 s9 agent (worktree-agent-a88e9bc054f3e16da) variants"
$deadline = (Get-Date).AddMinutes($WaitMin)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after $WaitMin min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), census specs $Specs" | Out-File -Encoding ASCII $lock
$root = (Resolve-Path (Join-Path $PSScriptRoot "..\..\..")).Path
try {
  $jobs = foreach ($spec in $Specs.Split(";")) {
    $f = $spec.Split("|")
    Start-Job -ArgumentList $root, $f[0], $f[1], $f[2], $f[3], $owner -ScriptBlock {
      param($root, $tag, $sc, $e9, $e9j, $own)
      Set-Location $root; $env:EXP9 = $e9; $env:EXP9J = $e9j; $env:K1314_LOCK_OWNER = $own
      $o = & node scripts/run_node.mjs .claude/probes/K1314/k1314_census.ts $tag "--scene=$sc" --ppu=160 --min=40 2>&1 | Select-Object -Last 4
      "== $tag ($sc, EXP9=$e9, EXP9J=$e9j)"; $o
    }
  }
  $jobs | Wait-Job | Receive-Job
} finally {
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
