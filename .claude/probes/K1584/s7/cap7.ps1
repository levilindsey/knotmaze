# K1584 s7: serve one commit with scripts/preview.ps1 (its own -Root), prove the listener serves that build, then run
# s3's capmany.ps1 (three cap.ps1 streams, pinned to s1's "before" views, stage 6's recipe) into s7/out/<Tag>, then stop
# the preview. Run it under scripts/perf_lock.ps1:
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1584 s7" -What "s7a captures" -Cmd "& '<this>' -Ref <sha> -Port 5631 -Tag s7a"
param([Parameter(Mandatory)][string]$Ref, [int]$Port = 5631, [string]$Tag = 's7a',
      [string]$Streams = 'A_3,A_5,A_8,A_b,D_1,D_4,D_7;A_4,A_6,A_9,A_c,D_2,D_5,D_8;A_7,A_a,A_d,D_3,D_6,D_9,D_a')
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
$sha = (git -C $repo rev-parse $Ref).Trim(); $short = (git -C $repo rev-parse --short $Ref).Trim()
$root = Join-Path $env:TEMP "knotmaze-K1584s7-$Tag"
$out = Join-Path $here 'out'; New-Item -ItemType Directory $out -Force | Out-Null
$log = Join-Path $out "preview_$Tag.log"
$proc = Start-Process pwsh -ArgumentList @('-NoProfile', '-File', (Join-Path $repo 'scripts/preview.ps1'), '-Port', "$Port", '-Ref', $sha, '-Root', $root) -PassThru -WindowStyle Hidden -RedirectStandardOutput $log -RedirectStandardError "$log.err"
try {
  $deadline = (Get-Date).AddSeconds(900); $ready = $false
  while ((Get-Date) -lt $deadline) {
    if ($proc.HasExited) { throw "preview $sha exited; see $log" }
    try { $r = Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 5; if ($r.StatusCode -eq 200) { $ready = $true; break } } catch { Start-Sleep -Seconds 5 }
  }
  if (-not $ready) { throw "preview $sha not ready in 900s" }
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen | Select-Object -First 1
  $cmd = (Get-CimInstance Win32_Process -Filter "ProcessId=$($conn.OwningProcess)").CommandLine
  if ($cmd -notlike "*$root*") { throw "listener on $Port is not this run's preview: $cmd" }
  $html = (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/" -TimeoutSec 10).Content
  # the build's stamp is `git rev-parse --short` in the build's own worktree (its length can differ): match 7 chars,
  # in the page or in any script it references (the first one is often a vendor chunk)
  $s7 = $sha.Substring(0, 7); $hit = $html.Contains($s7)
  foreach ($js in ([regex]::Matches($html, 'assets/[^"'']+\.js') | ForEach-Object Value | Select-Object -Unique)) {
    if ($hit) { break }
    $hit = (Invoke-WebRequest -UseBasicParsing "http://localhost:$Port/$js" -TimeoutSec 30).Content.Contains($s7)
  }
  if (-not $hit) {
    # the stamp may sit in a chunk the page loads later: the listener is this run's root (checked above) and preview.ps1
    # built -Ref into it, which its log names
    if ((Get-Content $log -Raw) -match "Serving $s7") { "WARN: no $s7 in the page's scripts; the listener is this root, whose log serves $s7" }
    else { throw "served bundle does not carry $s7" }
  }
  "preview $sha on $Port ready $(Get-Date -Format HH:mm:ss)"
  & pwsh -NoProfile -File (Join-Path $here '..\s3\capmany.ps1') -Port $Port -Tag $Tag -Streams $Streams -PinFrom before -OutRoot $out
} finally {
  if (-not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
  Start-Sleep -Seconds 3
  # the killed preview.ps1 never ran its finally: unlink every junction under the root (its worktree's node_modules)
  # before the recursive delete, which would otherwise follow it into the main checkout's packages
  if (Test-Path $root) {
    Get-ChildItem $root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue | ForEach-Object { $_.Delete() }
    if (-not (Get-ChildItem $root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue)) { Remove-Item $root -Recurse -Force -ErrorAction SilentlyContinue }
  }
  git -C $repo worktree prune 2>$null | Out-Null
  "preview stopped $(Get-Date -Format HH:mm:ss)"
}
$global:LASTEXITCODE = 0
