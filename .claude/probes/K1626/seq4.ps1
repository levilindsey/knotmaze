# K1626 s4: the master | yours eye shots. Builds master and this stage's commit with scripts/preview.ps1
# -BuildOnly, serves them with vite preview on 5655 (master) and 5656 (mine), runs cap4.mjs on each into
# out\cap4_<name>, stops the servers and composes the picture. Run under the perf lock:
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1626 s4" -What "eye shots" -Cmd "& '.claude/probes/K1626/seq4.ps1' -Mine <sha>"
param([string]$Master = 'origin/master', [Parameter(Mandatory)][string]$Mine, [string]$PvRoot = (Join-Path $env:TEMP 'k1626s4pv'))
$ErrorActionPreference = 'Continue'
$wt = Split-Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent) -Parent
$pr = $PSScriptRoot
$o = Join-Path $pr 'out'
Set-Location $wt
$builds = @(@{ n = 'master'; ref = $Master; port = 5655 }, @{ n = 'mine'; ref = $Mine; port = 5656 })
foreach ($b in $builds) {
  $b.sha = (git rev-parse --short $b.ref).Trim()
  $b.out = Join-Path $PvRoot $b.sha
  & "$wt\scripts\preview.ps1" -Ref $b.ref -Root $PvRoot -BuildOnly *> "$o\pv4_$($b.n).log"
  if (-not (Test-Path "$($b.out)\index.html")) { "build $($b.n) ($($b.sha)) FAILED, see $o\pv4_$($b.n).log"; exit 2 }
  "built $($b.n) $($b.sha)"
}
$procs = @()
try {
  foreach ($b in $builds) {
    $procs += Start-Process -FilePath 'npx.cmd' -ArgumentList @('vite', 'preview', '--outDir', $b.out, '--port', $b.port, '--strictPort') `
      -WorkingDirectory $wt -RedirectStandardOutput "$o\srv4_$($b.n).log" -RedirectStandardError "$o\srv4_$($b.n).err" -NoNewWindow -PassThru
  }
  foreach ($b in $builds) {
    $t0 = Get-Date
    while (-not (Get-NetTCPConnection -LocalPort $b.port -State Listen -ErrorAction SilentlyContinue)) {
      if (((Get-Date) - $t0).TotalSeconds -gt 60) { "server $($b.port) did not start"; exit 3 }
      Start-Sleep -Milliseconds 500
    }
  }
  $env:W = '412'; $env:H = '924'; $env:DSF = '2'; $env:SCALE = '90'; $env:CLIP = '360'
  # J132, J28: Levi's rows 5 and 6; J138, J64: the narrow eyes; J149, J140: the next hooks on his link;
  # J144: the one eye that narrows over 0.15 (census 3.03 -> 2.88); then K1622's spot.
  $env:EYES = '132:254,28:64,138:282,64:100,149:305,140:292,144:297,@K1622:24.67:35.10'
  foreach ($b in $builds) {
    node "$pr\cap4.mjs" "http://localhost:$($b.port)" "$o\cap4_$($b.n)" "$o\profile4" *> "$o\cap4_$($b.n).log"
    Get-Content "$o\cap4_$($b.n).log" -Tail 1
  }
} finally {
  foreach ($p in $procs) {
    Get-CimInstance Win32_Process -Filter "ParentProcessId=$($p.Id)" -ErrorAction SilentlyContinue | ForEach-Object {
      Get-CimInstance Win32_Process -Filter "ParentProcessId=$($_.ProcessId)" -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
  }
}
python "$pr\compose4.py" "$o\cap4_master=master" "$o\cap4_mine=K1626 s4" "$o\sheet4.png"
