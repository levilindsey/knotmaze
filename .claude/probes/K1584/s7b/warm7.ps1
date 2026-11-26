# K1584 s7b: warm the three capture profiles (s1/profile1-3) for one build, ONE AT A TIME, before a capmany run.
# Serves -Ref with scripts/preview.ps1 on -Port (use the capture's port: same origin as the capture), then for each
# profile runs s1/cap.ps1 with WARM=1 (cap40pin loads gf once, waits for frames, prints its cost line, no capture) on
# -Mazes (an A maze and a tlk=border D maze, in case the look program differs). The load check (load7b.ps1) found a cold
# gf load takes about 100 s alone; three at once under load passed cap40pin's 240 s frame timeout in s7a.
# Run under the perf lock:
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1584 s7b" -What "s7b warm" -Cmd "& '<this>' -Ref <sha> -Port 5631"
param([Parameter(Mandatory)][string]$Ref, [int]$Port = 5631, [string]$Mazes = 'A_3,D_1', [string]$Profiles = 'profile1,profile2,profile3')
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
$sha = (git -C $repo rev-parse $Ref).Trim()
$root = Join-Path $env:TEMP 'knotmaze-K1584s7b-warm'
$out = Join-Path $here 'out'; New-Item -ItemType Directory $out -Force | Out-Null
$log = Join-Path $out 'preview_warm.log'
$proc = Start-Process pwsh -ArgumentList @('-NoProfile', '-File', (Join-Path $repo 'scripts/preview.ps1'), '-Port', "$Port", '-Ref', $sha, '-Root', $root) -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
try {
  $deadline = (Get-Date).AddSeconds(900); $ready = $false
  while ((Get-Date) -lt $deadline) {
    if ($proc.HasExited) { throw "preview exited; see $log" }
    try { $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Seconds 3 }
  }
  if (-not $ready) { throw 'preview not ready' }
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object -First 1
  $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)").CommandLine
  if ($cmd -notlike "*$root*") { throw "listener on $Port is not this run's preview: $cmd" }
  if ((Get-Content $log -Raw) -notmatch "Serving $($sha.Substring(0, 7))") { throw "preview log does not serve $sha" }
  "preview $sha on $Port ready $(Get-Date -Format HH:mm:ss)"
  $env:WARM = '1'; $env:FRAME_TIMEOUT_MS = '480000'
  foreach ($p in ($Profiles -split ',')) {
    "== warm $p $(Get-Date -Format HH:mm:ss)"
    & pwsh -NoProfile -File (Join-Path $here '..\s1\cap.ps1') -Port $Port -Tag "warm7b_$p" -Mazes $Mazes -Prof $p -OutRoot $out 2>&1
    foreach ($m in ($Mazes -split ',')) { Get-Content (Join-Path $out "warm7b_$p\$m\cap.log") -ErrorAction SilentlyContinue | Select-String -Pattern 'warm|timeout|Error' | ForEach-Object { "   $m $($_.Line)" } }
  }
} finally {
  $env:WARM = $null; $env:FRAME_TIMEOUT_MS = $null
  if (-not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
  Start-Sleep -Seconds 3
  if (Test-Path $root) {
    Get-ChildItem $root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue | ForEach-Object { $_.Delete() }
    if (-not (Get-ChildItem $root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue }
  }
  git -C $repo worktree prune 2>$null | Out-Null
  "preview stopped $(Get-Date -Format HH:mm:ss)"
}
$global:LASTEXITCODE = 0
