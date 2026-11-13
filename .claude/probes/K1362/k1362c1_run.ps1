# K1362 c1: the stage's desktop runs under ONE hold of the perf lock (k1362c1_bench.ps1's wait/take/
# delete pattern): (1) VERIFY on the branch (rp=gf: at rest one forced rebuild, then the drag, each
# build checked against the old path in-thread), (2) master then the branch, def / muse_hash / fat,
# rp=gf and today's look, (3) the branch with the build worker off (the lean build in-thread).
#   pwsh -NoProfile -File .claude/probes/K1362/k1362c1_run.ps1 -OutDir <dir> -Before http://127.0.0.1:5391/ -After http://127.0.0.1:5392/
param([Parameter(Mandatory = $true)][string]$OutDir, [string]$Before = "http://127.0.0.1:5391/", [string]$After = "http://127.0.0.1:5392/",
  [string[]]$Steps = @("verify", "before", "after", "thread"))
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1362 c1 agent (claude session 01SUPGULDxvE5gKXozfaFaFG)"
$deadline = (Get-Date).AddMinutes(40)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 40 min: $(Get-Content $lock -Raw)"; exit 2 }
  Start-Sleep -Seconds 10
}
"$owner, $(Get-Date -Format s), k1362c1 verify + rp=gf before/after + today's look" | Out-File -Encoding ASCII $lock
New-Item -ItemType Directory $OutDir -Force | Out-Null
$bench = Join-Path $PSScriptRoot "k1362c1_bench.mjs"
$links = @("b.FMKB4DIQ", "3.FGH1HtvQeDjm6e4BII", "p9ar6.FMKB4DIQ")
$gf = $links | ForEach-Object { "?$_&am=instant&snd=none&rp=gf" }
$look = $links | ForEach-Object { "?$_&am=instant&snd=none" }
try {
  foreach ($step in $Steps) {
    $env:VERIFY = $null; $env:GFOPTS = $null
    switch ($step) {
      "verify" { $env:VERIFY = "1"; $urls = $gf | ForEach-Object { "$After$_" } }
      "before" { $urls = ($gf + $look) | ForEach-Object { "$Before$_" } }
      "after" { $urls = ($gf + $look) | ForEach-Object { "$After$_" } }
      "thread" { $env:GFOPTS = '{"worker":false}'; $urls = $gf | ForEach-Object { "$After$_" } }
    }
    $t = Get-Date
    & node $bench (Join-Path $OutDir "$step.json") @urls *> (Join-Path $OutDir "$step.log")
    Write-Host "$step exit $LASTEXITCODE in $([int]((Get-Date) - $t).TotalSeconds)s"
  }
} finally {
  $env:VERIFY = $null; $env:GFOPTS = $null
  $line = Get-Content $lock -Raw -ErrorAction SilentlyContinue
  if ($line -and $line.StartsWith($owner)) { [System.IO.File]::Delete($lock) }
}
