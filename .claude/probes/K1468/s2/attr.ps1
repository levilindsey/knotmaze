# K1468 s2 (second run): GPU ms per program on link A, interleaved launches, under the perf lock (waited for inside).
#   attr.ps1 -Out <dir> -Rounds 3 -Jobs "bprobe=5660=,nopack,div" "bae2b=5661=" "bmaster=5662="
# Each job: profile=port=variants (comma list of #k1468p values; empty = the default read).
param([string]$Out, [int]$Rounds = 3, [string[]]$Jobs, [string]$Link = "A")
. "$PSScriptRoot/common.ps1"
$Jobs = @($Jobs | ForEach-Object { $_ -split " " } | Where-Object { $_ })
$lock = Join-Path $env:TEMP "claude-perf.lock"; $owner = "K1468s2-agent-a517b983"
New-Item -ItemType Directory $Out -Force | Out-Null
while ($true) {
  if (Test-Path $lock) { $age = ((Get-Date) - (Get-Item $lock).LastWriteTime).TotalMinutes; if ($age -lt 30) { Start-Sleep 20; continue } }
  "$owner $(Get-Date -Format o) gf GPU ms per program (attribution)" | Set-Content $lock; break
}
Write-Host "lock taken $(Get-Date -Format T)"
$L = if ($Link -eq "A") { $LinkA } else { $LinkB }
try {
  for ($r = 0; $r -lt $Rounds; $r++) {
    foreach ($j in $Jobs) {
      $name, $port, $vs = $j -split "=", 3
      Wait-Mem
      $urls = @($vs.Split(",") | ForEach-Object { if ($_) { "http://localhost:$port/$L#k1468p=$_" } else { "http://localhost:$port/$L" } })
      if ($r % 2) { [array]::Reverse($urls) }
      $env:SEC = "10"; $env:REDRAW = "1"; $env:EXTRA = $null
      "$owner $(Get-Date -Format o) gf GPU attribution round $r $name" | Set-Content $lock
      node "$PSScriptRoot/rest_gpu.mjs" "$env:TEMP\k1468s2-prof-$name" (Join-Path $Out "r${r}_$name.json") 1 @urls 2>&1 | Where-Object { $_ -notmatch '^SUMMARY' } | ForEach-Object { "$name $_" }
    }
  }
} finally {
  if ((Test-Path $lock) -and ((Get-Content $lock) -like "$owner*")) { [System.IO.File]::Delete($lock) }
  Write-Host "lock released $(Get-Date -Format T)"
}
