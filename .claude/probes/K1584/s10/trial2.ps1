# K1584 s10: one trial stream: serve -Ref with scripts/preview.ps1 (its own -Root), check the listener, then capture
# -Mazes in turn with s1/cap.ps1 in ONE profile (the first load compiles the look program, the rest reuse it), pinned to
# s1's "before" views, into s10/out/<Tag>. -Delay staggers a parallel stream's first (cold) load. Under the perf lock:
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1584 s10" -What "trial" -Cmd "& '<this>' -Ref <sha> -Port 5633 -Tag s10ta -Prof profile1"
param([Parameter(Mandatory)][string]$Ref, [int]$Port = 5633, [string]$Tag = 's10ta', [string]$Prof = 'profile1',
      [string]$Mazes = 'A_3,A_5,A_6', [int]$Delay = 0, [string]$Extra = '')
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
$sha = (git -C $repo rev-parse $Ref).Trim()
$root = Join-Path $env:TEMP "knotmaze-K1584s10-$Tag"
$out = Join-Path $here 'out'; New-Item -ItemType Directory $out -Force | Out-Null
$log = Join-Path $out "preview_$Tag.log"
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
  if ($Delay -gt 0) { Start-Sleep -Seconds $Delay }
  $env:FRAME_TIMEOUT_MS = '480000'
  $capArgs = @('-NoProfile', '-File', (Join-Path $here '..\s1\cap.ps1'), '-Port', "$Port", '-Tag', $Tag, '-Mazes', $Mazes, '-Prof', $Prof, '-OutRoot', $out, '-PinFrom', 'before')
  if ($Extra) { $capArgs += @('-Extra', $Extra) }
  & pwsh @capArgs 2>&1
} finally {
  $env:FRAME_TIMEOUT_MS = $null
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
