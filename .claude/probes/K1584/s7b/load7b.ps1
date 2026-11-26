# K1584 s7b: the load check. Serves the stage 6 build and the stage 7 build (scripts/preview.ps1, each its own -Root),
# then runs loadone.mjs on A_3 once per entry of -Seq, each on a NEW profile (prof/<label>_<i>), in that order.
# Run it under the perf lock:
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1584 s7b" -What "s7b load check" -Cmd "& '<this>' -Seq s6,s7"
param([string]$Seq = 's6,s7', [string]$Ref6 = '7f8701166', [string]$Ref7 = '04eeb1b69', [int]$Port6 = 5632, [int]$Port7 = 5633,
      [int]$TimeoutS = 420, [string]$Query = '3.FGH1HtvQeDjm6e4BII&xp=off&am=instant&gfh=1&bgs=0&fw=0&phw=0&snd=none&prp=off&rp=gf')
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
$out = Join-Path $here 'out'; New-Item -ItemType Directory $out -Force | Out-Null
$builds = @{ s6 = @($Ref6, $Port6); s7 = @($Ref7, $Port7) }
$procs = @{}; $roots = @{}
try {
  foreach ($k in $builds.Keys) {
    $sha = (git -C $repo rev-parse $builds[$k][0]).Trim(); $port = $builds[$k][1]
    $root = Join-Path $env:TEMP "knotmaze-K1584s7b-$k"; $roots[$k] = $root
    $log = Join-Path $out "preview_load_$k.log"
    $procs[$k] = Start-Process pwsh -ArgumentList @('-NoProfile', '-File', (Join-Path $repo 'scripts/preview.ps1'), '-Port', "$port", '-Ref', $sha, '-Root', $root) -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
  }
  foreach ($k in $builds.Keys) {
    $sha = (git -C $repo rev-parse $builds[$k][0]).Trim(); $port = $builds[$k][1]; $log = Join-Path $out "preview_load_$k.log"
    $deadline = (Get-Date).AddSeconds(900); $ready = $false
    while ((Get-Date) -lt $deadline) {
      if ($procs[$k].HasExited) { throw "preview $k exited; see $log" }
      try { $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$port/" -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Seconds 3 }
    }
    if (-not $ready) { throw "preview $k not ready" }
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen | Select-Object -First 1
    $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)").CommandLine
    if ($cmd -notlike "*$($roots[$k])*") { throw "listener on $port is not this run's preview: $cmd" }
    if ((Get-Content $log -Raw) -notmatch "Serving $($sha.Substring(0, 7))") { throw "preview $k log does not serve $sha" }
    "preview $k $sha on $port ready $(Get-Date -Format HH:mm:ss)"
  }
  $i = 0
  foreach ($k in ($Seq -split '[,\s]+' | Where-Object { $_ })) {
    $i++; $port = $builds[$k][1]
    $prof = Join-Path $here "prof\$($k)_$i"
    if (Test-Path $prof) { Remove-Item -LiteralPath $prof -Recurse -Force }
    $cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    $top = Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 | ForEach-Object { "$($_.ProcessName)($([int]$_.CPU))" }
    "== load $i $k ($($builds[$k][0])) $(Get-Date -Format HH:mm:ss) cpu $cpu% top $($top -join ' ')"
    & node (Join-Path $here 'loadone.mjs') "http://localhost:$port/?$Query" $prof $TimeoutS 2>&1 | Tee-Object -FilePath (Join-Path $out "load_$($k)_$i.txt")
  }
} finally {
  foreach ($k in $procs.Keys) { if (-not $procs[$k].HasExited) { taskkill /T /F /PID $procs[$k].Id 2>$null | Out-Null } }
  Start-Sleep -Seconds 3
  foreach ($root in $roots.Values) {
    if (Test-Path $root) {
      Get-ChildItem $root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue | ForEach-Object { $_.Delete() }
      if (-not (Get-ChildItem $root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue }
    }
  }
  git -C $repo worktree prune 2>$null | Out-Null
  "previews stopped $(Get-Date -Format HH:mm:ss)"
}
$global:LASTEXITCODE = 0
