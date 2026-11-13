# K1362 t2: the stage's desktop runs under ONE hold of the perf lock (the
# k1362c1_bench.ps1 wait/take/delete pattern, c1's bench tool): (1) VERIFY on
# the new build (rp=gf builds checked against the old path in-thread),
# (2) before (master) then after (pool), def / muse_hash / fat, rp=gf and
# today's look, (3) after with the pool off (single build worker, same code).
#   pwsh -NoProfile -File .claude/probes/K1362/k1362t2_run.ps1 -OutDir <dir> -Before http://127.0.0.1:5391/ -After http://127.0.0.1:5392/
param([Parameter(Mandatory = $true)][string]$OutDir, [string]$Before = "http://127.0.0.1:5391/", [string]$After = "http://127.0.0.1:5392/",
  [string[]]$Steps = @("verify", "before", "after", "nopool"))
$lock = Join-Path $env:TEMP "claude-perf.lock"
$owner = "K1362 t2 muse (session 01a1d487), $(Get-Date -Format s), k1362t2 before/after pool"
$deadline = (Get-Date).AddMinutes(30)
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock -Raw)"; break }
  if ((Get-Date) -gt $deadline) { Write-Host "lock still held after 30 min: $(Get-Content $lock -Raw)"; exit 2 }
  Write-Host "perf lock held: $(Get-Content $lock -Raw)"; Start-Sleep -Seconds 60
}
"$owner" | Out-File -Encoding ASCII $lock
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
      "nopool" { $env:GFOPTS = '{"pool":false}'; $urls = $gf | ForEach-Object { "$After$_" } }
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
