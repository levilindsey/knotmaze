# K1584 s11 (copy of land8/run8.ps1; -Mode fade: one stream of -Streams with env FL=-Fl, the fadeLength): K1584 landing check: serve one commit with scripts/preview.ps1 (its own -Root), prove the listener serves that build,
# then either warm the three land8 profiles one at a time (-Mode warm: s7b's warm7 recipe, WARM=1 on A_3 and D_1) or
# capture all 21 mazes in three streams pinned to s1's "before" views (-Mode cap: s7's cap7 + s3's capmany recipe).
# Profiles, pins and outputs live under land8/out (pins: land8/out/pins/<maze>/gf_b2view.txt, copied from the gap
# worktree's s1/out/before). Run under the perf lock:
#   pwsh scripts/perf_lock.ps1 -Owner "claude K1584 land8" -What "land8 warm" -Cmd "& '<this>' -Ref <sha> -Port 5641 -Mode warm"
param([Parameter(Mandatory)][string]$Ref, [int]$Port = 5641, [ValidateSet('warm', 'cap', 'fade')][string]$Mode = 'cap',
      [string]$Tag = 's11a', [string]$Fl = '',
      [string]$Streams = 'A_3,A_5,A_8,A_b,D_1,D_4,D_7;A_4,A_6,A_9,A_c,D_2,D_5,D_8;A_7,A_a,A_d,D_3,D_6,D_9,D_a')
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$repo = (git -C $here rev-parse --show-toplevel).Trim()
$sha = (git -C $repo rev-parse $Ref).Trim()
$s7 = $sha.Substring(0, 7)
$root = Join-Path $env:TEMP "knotmaze-K1584s11-$Mode-$Tag"
$out = Join-Path $here 'out'; New-Item -ItemType Directory $out -Force | Out-Null
$cap = Join-Path $here '..\s1\cap.ps1'
$log = Join-Path $out "preview_$Mode.log"
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
  if ((Get-Content $log -Raw) -notmatch "Serving $s7") { throw "preview log does not serve $s7" }
  "preview $sha on $Port ready $(Get-Date -Format HH:mm:ss)"
  if ($Mode -eq 'warm') {
    $env:WARM = '1'; $env:FRAME_TIMEOUT_MS = '480000'
    foreach ($i in 1..3) {
      "== warm profile$i $(Get-Date -Format HH:mm:ss)"
      & pwsh -NoProfile -File $cap -Port $Port -Tag "warm_$i" -Mazes 'A_3,D_1' -Prof "..\s11\out\profile$i" -OutRoot $out 2>&1
      foreach ($m in 'A_3', 'D_1') { Get-Content (Join-Path $out "warm_$i\$m\cap.log") -ErrorAction SilentlyContinue | Select-String -Pattern 'warm|timeout|Error' | ForEach-Object { "   $m $($_.Line)" } }
    }
  } elseif ($Mode -eq 'fade') {
    $env:FL = $Fl; $env:FRAME_TIMEOUT_MS = '480000'
    & pwsh -NoProfile -File $cap -Port $Port -Tag $Tag -Mazes (($Streams -split ';')[0]) -Prof '..\s11\out\profile1' -OutRoot $out -PinFrom '..\..\s11\out\pins' 2>&1
  } else {
    $i = 0
    $jobs = foreach ($s in ($Streams -split ';')) {
      $i++
      $a = @('-NoProfile', '-File', $cap, '-Port', $Port, '-Tag', $Tag, '-Mazes', $s, '-Prof', "..\s11\out\profile$i", '-OutRoot', $out, '-PinFrom', '..\..\s11\out\pins')
      Start-Process pwsh -ArgumentList $a -PassThru -NoNewWindow -RedirectStandardOutput (Join-Path $out "capmany_${Tag}_$i.log")
    }
    $jobs | Wait-Process
    "CAPMANY $Tag DONE $(Get-Date -Format HH:mm:ss)"
  }
} finally {
  $env:WARM = $null; $env:FL = $null; $env:FRAME_TIMEOUT_MS = $null
  if (-not $proc.HasExited) { taskkill /T /F /PID $proc.Id 2>$null | Out-Null }
  Start-Sleep -Seconds 3
  # the killed preview.ps1 never ran its finally: unlink every junction under the root (its worktree's node_modules)
  # before the recursive delete, which would otherwise follow it into the main checkout's packages
  if (Test-Path $root) {
    Get-ChildItem $root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue | ForEach-Object { $_.Delete() }
    if (-not (Get-ChildItem $root -Recurse -Force -Attributes ReparsePoint -ErrorAction SilentlyContinue)) { Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction SilentlyContinue }
  }
  git -C $repo worktree prune 2>$null | Out-Null
  "preview stopped $(Get-Date -Format HH:mm:ss)"
}
$global:LASTEXITCODE = 0
