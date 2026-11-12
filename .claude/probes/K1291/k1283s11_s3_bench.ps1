# K1283 s11: a copy of s3_bench.ps1 with its own owner line.
# K1291 s3: main's frame (first draw to readPixels, p50) under the perf lock.
# -S1 / -Master / -Head are preview bases (scripts/preview.ps1). Round sets:
#   none:  ?s=b&am=instant&snd=none&rp=outline on S1, Master, Head, then
#          reversed (ABBA); Head then picks the programs without the reveal.
#   full:  the same link on Head with LITE=0 (the reveal programs forced).
#   pin:   ?s=b&am=trace-burn&snd=none&rp=outline with the reveal pinned at
#          PIN=0.5 (a reveal running at rest) on Master and Head, ABBA.
#   pwsh .claude/probes/K1291/s3_bench.ps1 -S1 <url> -Master <url> -Head <url> -Out <dir> [-Rounds 2]
param(
  [Parameter(Mandatory)] [string] $S1,
  [Parameter(Mandatory)] [string] $Master,
  [Parameter(Mandatory)] [string] $Head,
  [Parameter(Mandatory)] [string] $Out,
  [int] $Rounds = 2,
  [string[]] $Sets = @('none', 'full', 'pin')
)
$ErrorActionPreference = 'Stop'
$owner = 'K1283 s11 agent (worktree-agent-ae62168490360313e)'
$lock = Join-Path $env:TEMP 'claude-perf.lock'
$bench = Join-Path $PSScriptRoot 'k1291_bench.mjs'
New-Item -ItemType Directory -Force $Out | Out-Null
$t0 = Get-Date
while (Test-Path $lock) {
  $age = (Get-Date) - (Get-Item $lock).LastWriteTime
  if ($age.TotalMinutes -gt 30) { Write-Host "stale lock ($([int]$age.TotalMinutes) min): $(Get-Content $lock)"; break }
  if (((Get-Date) - $t0).TotalMinutes -gt 40) { throw "perf lock held over 40 min: $(Get-Content $lock)" }
  Start-Sleep -Seconds 15
}
"$owner, $(Get-Date -Format s), main-frame bench (s3_bench.ps1)" | Out-File -Encoding ASCII $lock
try {
  $q = '?s=b&am=instant&snd=none&rp=outline'
  $qp = '?s=b&am=trace-burn&snd=none&rp=outline'
  for ($r = 1; $r -le $Rounds; $r++) {
    if ($Sets -contains 'none') {
      $u = @("$S1/$q", "$Master/$q", "$Head/$q"); if ($r % 2 -eq 0) { [array]::Reverse($u) }
      $env:LITE = $null; $env:PIN = $null
      node $bench (Join-Path $Out "none_r$r.json") @u | Out-File -Encoding utf8 (Join-Path $Out "none_r$r.log")
    }
    if ($Sets -contains 'full') {
      $env:LITE = '0'; $env:PIN = $null
      node $bench (Join-Path $Out "full_r$r.json") "$Head/$q" | Out-File -Encoding utf8 (Join-Path $Out "full_r$r.log")
      $env:LITE = $null
    }
    if ($Sets -contains 'pin') {
      $u = @("$Master/$qp", "$Head/$qp"); if ($r % 2 -eq 0) { [array]::Reverse($u) }
      $env:PIN = '0.5'
      node $bench (Join-Path $Out "pin_r$r.json") @u | Out-File -Encoding utf8 (Join-Path $Out "pin_r$r.log")
      $env:PIN = $null
    }
  }
} finally {
  if ((Test-Path $lock) -and ((Get-Content $lock) -like "$owner*")) { [System.IO.File]::Delete($lock) }
}
Write-Host "done $(Get-Date -Format HH:mm:ss)"
