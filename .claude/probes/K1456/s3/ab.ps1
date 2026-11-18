# K1456 s3: cold A/B of gf's first visit, interleaved. Serves each build with vite preview on its port, then per round
# runs .claude/probes/K1456/s2/table.mjs once per build on a fresh profile ($env:TEMP\k1456s3-prof-*), deleted after.
# Before each Chrome launch: ONE wait (15 min at most per launch) while FreeVirtualMemory < 3 GB or disk < $DiskGb.
#   pwsh ab.ps1 -Builds "A=5640=<distDir>","B=5641=<distDir>" -Rounds 3 -Tag item1 [-Lock]
# An entry "name=port=dir|&k=v" appends "&k=v" to the link for that entry; entries may share a port (one server).
param([string[]]$Builds, [int]$Rounds = 3, [string]$Tag = "ab", [switch]$Lock, [double]$DiskGb = 8,
  [string]$Link = "?3.FGH1HtvQeDjm6e4BII&rp=gf&gfh=1")
$ErrorActionPreference = "Stop"
$Builds = @($Builds | ForEach-Object { $_ -split "," } | Where-Object { $_ })
$script:roomSpent = 0.0
$here = $PSScriptRoot
$wt = (Resolve-Path "$here\..\..\..\..").Path
$table = Join-Path $wt ".claude\probes\K1456\s2\table.mjs"
$vite = Join-Path $wt "node_modules\vite\bin\vite.js"
$lockFile = Join-Path $env:TEMP "claude-perf.lock"
$servers = @()
function Wait-Room {
  # one 15-minute budget per run for the disk line; past it, only memory and a 4 GB disk floor hold a launch
  for (;;) {
    $os = Get-CimInstance Win32_OperatingSystem
    $vm = $os.FreeVirtualMemory / 1MB; $disk = (Get-PSDrive C).Free / 1GB
    $line = if ($script:roomSpent -lt 15) { $DiskGb } else { 4 }
    if ($vm -ge 3 -and $disk -ge $line) { return }
    if ($script:roomSpent -ge 30) { break }
    $script:roomSpent += 0.5
    Write-Host ("waiting: vm {0:N1} GB disk {1:N1} GB" -f $vm, $disk)
    Start-Sleep 30
  }
  Write-Host "room wait capped; going on"
}
try {
  if ($Lock) { [IO.File]::WriteAllText($lockFile, "K1456s3 $(Get-Date -Format s) cold A/B $Tag`n") }
  $served = @{}
  foreach ($b in $Builds) {
    $name, $port, $dir = $b -split "=", 3
    $dir = ($dir -split "\|", 2)[0]
    if ($served[$port]) { continue }
    $served[$port] = $true
    $servers += Start-Process node -ArgumentList @($vite, "preview", "--outDir", $dir, "--port", $port, "--strictPort") -WorkingDirectory $wt -PassThru -WindowStyle Hidden
  }
  Start-Sleep 4
  $res = @()
  for ($r = 1; $r -le $Rounds; $r++) {
    foreach ($b in $Builds) {
      $name, $port, $dir = $b -split "=", 3
      $suffix = if ($dir -match "\|") { ($dir -split "\|", 2)[1] } else { "" }
      Wait-Room
      $prof = Join-Path $env:TEMP "k1456s3-prof-$name-$r"
      if (Test-Path $prof) { Remove-Item $prof -Recurse -Force }
      $out = Join-Path $here "out\$Tag-$name-$r.json"
      $chromes = (Get-Process chrome -ErrorAction SilentlyContinue).Count
      Write-Host "== $Tag round $r $name (other chrome procs: $chromes) $(Get-Date -Format T)"
      $env:QUICK = "1"
      node $table "http://localhost:$port/$Link$suffix" $prof $out 300 3 | Select-Object -Last 4
      Remove-Item $prof -Recurse -Force -ErrorAction SilentlyContinue
      if (Test-Path $out) {
        $j = Get-Content $out -Raw | ConvertFrom-Json
        $i0 = $j.rows | Where-Object { $_.idx -eq 0 } | Select-Object -First 1
        $res += [pscustomobject]@{ round = $r; build = $name; first = $j.firstCompositeSecs; wkCreated = $j.worker.created; wkSources = $j.worker.sources; idx0End = $i0.wEnd; idx0Secs = $i0.wSecs; chrome = $chromes }
      }
    }
  }
  $res | Format-Table -AutoSize | Out-String | Write-Host
  foreach ($g in ($res | Group-Object build)) {
    $f = @($g.Group.first | Where-Object { $_ -ne $null } | Sort-Object)
    if ($f.Count) { Write-Host ("{0}: first composite {1} s; median {2}" -f $g.Name, ($f -join ", "), $f[[int][math]::Floor(($f.Count - 1) / 2)]) }
  }
  $res | ConvertTo-Json | Set-Content (Join-Path $here "out\$Tag-summary.json")
} finally {
  foreach ($s in $servers) { try { Stop-Process -Id $s.Id -Force -ErrorAction SilentlyContinue } catch {} }
  if ($Lock -and (Test-Path $lockFile) -and ((Get-Content $lockFile -Raw) -match "^K1456s3")) { Remove-Item $lockFile -Force }
}

